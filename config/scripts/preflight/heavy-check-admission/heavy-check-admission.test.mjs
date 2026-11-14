import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAdmission, decideAdmission } from './heavy-check-admission.mjs'

describe('decideAdmission', () => {
  const base = { totalGib: 24, availableGib: 20 }

  it('admits anything when nothing is booked, so an oversized step still runs alone', () => {
    expect(decideAdmission({ ...base, requestGib: 40, bookings: [] }).admit).toBe(true)
  })

  it('refuses when bookings would pass 75% of RAM', () => {
    const bookings = [{ gib: 7 }, { gib: 7 }]
    const decision = decideAdmission({ ...base, availableGib: 23, requestGib: 6, bookings })
    expect(decision).toMatchObject({ admit: false })
    expect(decision.reason).toContain('14.0 of 18.0 GiB already booked')
  })

  it('refuses when free memory cannot cover what running checks have yet to take', () => {
    // A just-started 7 GiB check has used none of it yet, so 6 more needs 13 free.
    const decision = decideAdmission({
      ...base,
      availableGib: 10,
      requestGib: 6,
      bookings: [{ gib: 7, usedGib: 0 }]
    })
    expect(decision.admit).toBe(false)
  })

  it('counts only the unused part of a booking once its child has grown', () => {
    const bookings = [{ gib: 7, usedGib: 5 }]
    expect(decideAdmission({ ...base, availableGib: 9, requestGib: 6, bookings }).admit).toBe(true)
  })

  it('treats a booking without measurement as entirely outstanding', () => {
    const bookings = [{ gib: 7 }]
    expect(decideAdmission({ ...base, availableGib: 12, requestGib: 6, bookings }).admit).toBe(
      false
    )
  })
})

describe('createAdmission ledger', () => {
  let ledgerDir
  let clock
  let lines

  beforeEach(() => {
    ledgerDir = mkdtempSync(join(tmpdir(), 'orca-admission-test-'))
    clock = 1_000_000
    lines = []
  })
  afterEach(() => rmSync(ledgerDir, { recursive: true, force: true }))

  const make = (overrides = {}) =>
    createAdmission({
      ledgerDir,
      totalGib: 24,
      availableGib: () => 20,
      treeRssGib: () => null,
      alive: () => true,
      now: () => clock,
      log: (line) => lines.push(line),
      maxWaitMs: 60_000,
      ...overrides
    })

  const book = (gib, extra = {}) =>
    writeFileSync(
      join(ledgerDir, `${extra.pid ?? 4242}-x.json`),
      JSON.stringify({
        pid: 4242,
        gib,
        label: 'tsrs other',
        worktree: '/w/other',
        startedAt: clock,
        ...extra
      })
    )

  it('books while running and releases afterwards', async () => {
    const seen = await make().withSlot({ label: 'tsrs a', gib: 7, worktree: '/w/a' }, () =>
      readdirSync(ledgerDir).filter((name) => name.endsWith('.json'))
    )
    expect(seen).toHaveLength(1)
    expect(readdirSync(ledgerDir).filter((name) => name.endsWith('.json'))).toHaveLength(0)
  })

  it('releases the booking when the step throws', () => {
    expect(() =>
      make().withSlotSync({ label: 'lint', gib: 6, worktree: '/w/a' }, () => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(readdirSync(ledgerDir).filter((name) => name.endsWith('.json'))).toHaveLength(0)
  })

  it('drops bookings whose owner died instead of waiting on them', () => {
    book(15, { pid: 999 })
    const admission = make({ alive: (pid) => pid !== 999 })
    expect(admission.withSlotSync({ label: 'lint', gib: 6, worktree: '/w/a' }, () => 'ran')).toBe(
      'ran'
    )
  })

  it('waits, names the holder, and gives up with a distinct error at the cap', () => {
    book(15)
    const admission = make({ availableGib: () => 20, maxWaitMs: 0 })
    expect(() =>
      admission.withSlotSync({ label: 'lint', gib: 6, worktree: '/w/a' }, () => 'ran')
    ).toThrow(
      /gave up after 0 min: 15\.0 of 18\.0 GiB already booked\. Holding: tsrs other \(15\.0 GiB, \/w\/other, pid 4242\)/
    )
  })

  it('admits once the holder releases', async () => {
    book(15)
    const admission = make()
    setTimeout(() => {
      for (const name of readdirSync(ledgerDir)) {
        if (name.endsWith('.json')) {
          rmSync(join(ledgerDir, name))
        }
      }
    }, 100)
    expect(await admission.withSlot({ label: 'lint', gib: 6, worktree: '/w/a' }, () => 'ran')).toBe(
      'ran'
    )
    expect(lines[0]).toContain('waiting')
    expect(lines.at(-1)).toContain('admitted after')
  })
})
