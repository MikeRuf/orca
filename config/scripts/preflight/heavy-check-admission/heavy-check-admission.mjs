// Memory admission for heavy checks (tsrs type checks, oxlint --type-aware), shared by every
// worktree on the machine. Why: each run sized itself against total RAM as if it were alone, so
// two agents pushing from two worktrees started ~20 GB of checkers at once and a 24 GB WSL VM
// was OOM-killed. A step books its estimate in a per-user ledger and starts only when it fits.
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const GIB = 1024 ** 3
// Same share of RAM the typecheck planner already allows a single run.
export const BOOKABLE_SHARE = 0.75
// tsgolint measured 4.3 to 4.8 GiB on a 5M-line tree (2026-11-06).
export const TYPE_AWARE_LINT_GIB = 6
const POLL_MS = 2000
const LOCK_RETRY_MS = 50
const REPORT_EVERY_MS = 60_000
const LOCK_STALE_MS = 10_000
const BOOKING_STALE_MS = 6 * 60 * 60_000

export function defaultLedgerDir() {
  const user = typeof process.getuid === 'function' ? process.getuid() : os.userInfo().username
  return (
    process.env.ORCA_HEAVY_CHECK_LEDGER_DIR || path.join(os.tmpdir(), `orca-heavy-checks-${user}`)
  )
}

const fmt = (gib) => gib.toFixed(1)

/**
 * Pure admission rule. A step is admitted when nothing is booked (so an oversized step still
 * runs alone), or when both hold: bookings stay within the bookable share of RAM, and free
 * memory covers this step plus whatever running steps have booked but not yet grown into.
 */
export function decideAdmission({ requestGib, bookings, totalGib, availableGib }) {
  if (bookings.length === 0) {
    return { admit: true }
  }
  const booked = bookings.reduce((sum, booking) => sum + booking.gib, 0)
  const capacity = totalGib * BOOKABLE_SHARE
  if (booked + requestGib > capacity) {
    return { admit: false, reason: `${fmt(booked)} of ${fmt(capacity)} GiB already booked` }
  }
  const outstanding = bookings.reduce(
    (sum, booking) => sum + Math.max(0, booking.gib - (booking.usedGib ?? 0)),
    0
  )
  if (requestGib + outstanding > availableGib) {
    return {
      admit: false,
      reason: `${fmt(availableGib)} GiB free and running checks may still grow by ${fmt(outstanding)} GiB`
    }
  }
  return { admit: true }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

function readAvailableGib() {
  try {
    const match = /^MemAvailable:\s+(\d+) kB/m.exec(readFileSync('/proc/meminfo', 'utf8'))
    if (match) {
      return (Number(match[1]) * 1024) / GIB
    }
  } catch {
    // Not Linux: fall back to the OS figure, which undercounts reclaimable cache.
  }
  return os.freemem() / GIB
}

// Resident size of a process and its descendants; null where /proc is absent (macOS, Windows).
function readTreeRssGib(rootPid) {
  let names
  try {
    names = readdirSync('/proc').filter((name) => /^\d+$/.test(name))
  } catch {
    return null
  }
  const children = new Map()
  for (const name of names) {
    try {
      const stat = readFileSync(`/proc/${name}/stat`, 'utf8')
      const ppid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1])
      children.set(ppid, [...(children.get(ppid) ?? []), Number(name)])
    } catch {
      // Exited while we looked.
    }
  }
  let pages = 0
  const pending = [rootPid]
  while (pending.length > 0) {
    const pid = pending.pop()
    try {
      pages += Number(readFileSync(`/proc/${pid}/statm`, 'utf8').split(' ')[1])
    } catch {
      continue
    }
    pending.push(...(children.get(pid) ?? []))
  }
  return (pages * 4096) / GIB
}

function describe(bookings) {
  return bookings
    .map((b) => `${b.label} (${fmt(b.gib)} GiB, ${b.worktree}, pid ${b.pid})`)
    .join('; ')
}

export function createAdmission({
  ledgerDir = defaultLedgerDir(),
  totalGib = os.totalmem() / GIB,
  availableGib = readAvailableGib,
  treeRssGib = readTreeRssGib,
  alive = isAlive,
  now = Date.now,
  pid = process.pid,
  log = (line) => console.error(line),
  maxWaitMs = Number(process.env.ORCA_HEAVY_CHECK_MAX_WAIT_MINUTES || 20) * 60_000
} = {}) {
  let sequence = 0
  const lockDir = path.join(ledgerDir, '.lock')

  function tryLock() {
    try {
      mkdirSync(lockDir)
      return true
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }
      try {
        // A holder killed inside the few-millisecond critical section leaves the lock behind.
        if (now() - statSync(lockDir).mtimeMs > LOCK_STALE_MS) {
          rmSync(lockDir, { recursive: true, force: true })
        }
      } catch {
        // Another waiter removed it first.
      }
      return false
    }
  }

  function readBookings() {
    const bookings = []
    for (const name of readdirSync(ledgerDir)) {
      if (!name.endsWith('.json')) {
        continue
      }
      const file = path.join(ledgerDir, name)
      try {
        const booking = JSON.parse(readFileSync(file, 'utf8'))
        // Dead owners free their booking here, so a killed run cannot block the machine.
        if (!alive(booking.pid) || now() - booking.startedAt > BOOKING_STALE_MS) {
          unlinkSync(file)
          continue
        }
        const usedGib = booking.childPid ? treeRssGib(booking.childPid) : null
        bookings.push({ ...booking, file, usedGib: usedGib ?? undefined })
      } catch {
        // Half-written or already released.
      }
    }
    return bookings
  }

  function attempt({ label, gib, worktree }) {
    mkdirSync(ledgerDir, { recursive: true })
    if (!tryLock()) {
      return { blocked: { reason: 'ledger busy' }, bookings: [] }
    }
    try {
      const bookings = readBookings()
      const decision = decideAdmission({
        requestGib: gib,
        bookings,
        totalGib,
        availableGib: availableGib()
      })
      if (!decision.admit) {
        return { blocked: decision, bookings }
      }
      const file = path.join(ledgerDir, `${pid}-${now()}-${sequence++}.json`)
      writeFileSync(file, JSON.stringify({ pid, gib, label, worktree, startedAt: now() }))
      return { file }
    } finally {
      rmSync(lockDir, { recursive: true, force: true })
    }
  }

  function makeSlot(file) {
    return {
      // Lets waiters measure how much of the booking the child has already taken.
      attach(childPid) {
        try {
          const booking = JSON.parse(readFileSync(file, 'utf8'))
          writeFileSync(file, JSON.stringify({ ...booking, childPid }))
        } catch {
          // Released already.
        }
      },
      release() {
        rmSync(file, { force: true })
      }
    }
  }

  // One wait policy for both callers: yields how long to sleep, returns the slot.
  function* waitSteps(request) {
    const startedAt = now()
    let reportedAt = null
    for (;;) {
      const result = attempt(request)
      if (result.file) {
        if (reportedAt !== null) {
          const waited = Math.round((now() - startedAt) / 1000)
          log(`heavy-check admission: ${request.label} admitted after ${waited}s.`)
        }
        return makeSlot(result.file)
      }
      if (now() - startedAt >= maxWaitMs) {
        throw new Error(
          `heavy-check admission: ${request.label} (${fmt(request.gib)} GiB) gave up after ${Math.round(maxWaitMs / 60_000)} min: ${result.blocked.reason}. Holding: ${describe(result.bookings) || 'none'}. Raise ORCA_HEAVY_CHECK_MAX_WAIT_MINUTES or stop the holders.`
        )
      }
      if (
        result.bookings.length > 0 &&
        (reportedAt === null || now() - reportedAt >= REPORT_EVERY_MS)
      ) {
        reportedAt = now()
        log(
          `heavy-check admission: ${request.label} (${fmt(request.gib)} GiB) waiting: ${result.blocked.reason}. Holding: ${describe(result.bookings)}`
        )
      }
      yield result.blocked.reason === 'ledger busy' ? LOCK_RETRY_MS : POLL_MS
    }
  }

  return {
    async withSlot(request, run) {
      const steps = waitSteps(request)
      let step = steps.next()
      while (!step.done) {
        await new Promise((resolve) => setTimeout(resolve, step.value))
        step = steps.next()
      }
      try {
        return await run(step.value)
      } finally {
        step.value.release()
      }
    },
    withSlotSync(request, run) {
      const cell = new Int32Array(new SharedArrayBuffer(4))
      const steps = waitSteps(request)
      let step = steps.next()
      while (!step.done) {
        Atomics.wait(cell, 0, 0, step.value)
        step = steps.next()
      }
      try {
        return run(step.value)
      } finally {
        step.value.release()
      }
    }
  }
}

let shared = null
// Process-wide instance. ORCA_HEAVY_CHECK_ADMISSION=off runs every step unbooked (single-tenant CI).
export function heavyCheckAdmission() {
  if (process.env.ORCA_HEAVY_CHECK_ADMISSION === 'off') {
    const slot = { attach() {}, release() {} }
    return {
      withSlot: async (_request, run) => run(slot),
      withSlotSync: (_request, run) => run(slot)
    }
  }
  shared ??= createAdmission()
  return shared
}

// Type-aware scans load the whole TypeScript program however few files changed; others run unbooked.
export function admitOxlintScanSync(root, scan, run) {
  if (!scan.args.includes('--type-aware')) {
    return run()
  }
  const request = { label: scan.label, gib: TYPE_AWARE_LINT_GIB, worktree: root }
  return heavyCheckAdmission().withSlotSync(request, run)
}
