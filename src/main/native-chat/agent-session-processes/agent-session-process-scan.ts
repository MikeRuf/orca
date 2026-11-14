// Every process a chat starts inherits ORCA_AGENT_SESSION_ID, detached dev servers included, so
// the environment proves membership where a parent-pid walk would lose reparented children.

import { readFile, readdir } from 'node:fs/promises'
import { ORCA_AGENT_SESSION_ID_ENV } from '../../../shared/agent-session/lifecycle/agent-session-caller-env'
import type {
  AgentSessionProcess,
  AgentSessionProcessList,
  AgentSessionProcessStopResult
} from '../../../shared/native-chat/processes/agent-session-process-list'
import { spawnTokenFromEnvironBlock } from '../../runtime/agent-session/ownership/agent-session-spawn-token-readback'

// Linux reports both in fixed units on every architecture Orca ships for.
const CLOCK_TICKS_PER_SECOND = 100
const PAGE_BYTES = 4096
const CPU_SAMPLE_MS = 300
const MAX_COMMAND_CHARS = 400

type StatSample = { ppid: number; name: string; cpuTicks: number; startTicks: number }

function parseStat(text: string): StatSample | null {
  // The name sits in parentheses and may itself contain spaces or parentheses.
  const open = text.indexOf('(')
  const close = text.lastIndexOf(')')
  if (open === -1 || close < open) {
    return null
  }
  const fields = text
    .slice(close + 2)
    .trim()
    .split(/\s+/)
  // fields[0] is field 3 (state) of proc(5).
  const ppid = Number(fields[1])
  const cpuTicks = Number(fields[11]) + Number(fields[12])
  const startTicks = Number(fields[19])
  if (![ppid, cpuTicks, startTicks].every(Number.isFinite)) {
    return null
  }
  return { ppid, name: text.slice(open + 1, close), cpuTicks, startTicks }
}

/** Claude Code wraps each Bash call in a snapshot-sourcing shell; show the command it evaluates. */
export function displayedCommand(argv: string[]): string {
  const joined = argv.join(' ')
  const evaluated = /&& eval '((?:[^']|'\\'')*)'/.exec(joined)
  const command = evaluated ? evaluated[1].replace(/'\\''/g, "'") : joined
  return command.length > MAX_COMMAND_CHARS ? `${command.slice(0, MAX_COMMAND_CHARS)}…` : command
}

async function sessionPids(sessionId: string): Promise<number[]> {
  const pids: number[] = []
  for (const entry of await readdir('/proc')) {
    const pid = Number(entry)
    if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid) {
      continue
    }
    try {
      const block = await readFile(`/proc/${pid}/environ`, 'utf-8')
      if (spawnTokenFromEnvironBlock(block, ORCA_AGENT_SESSION_ID_ENV) === sessionId) {
        pids.push(pid)
      }
    } catch {
      // Exited mid-scan, or another user's process: neither belongs to this chat.
    }
  }
  return pids
}

async function readSample(pid: number): Promise<StatSample | null> {
  try {
    return parseStat(await readFile(`/proc/${pid}/stat`, 'utf-8'))
  } catch {
    return null
  }
}

async function readDetails(pid: number): Promise<{ argv: string[]; rssBytes: number } | null> {
  try {
    const [cmdline, statm] = await Promise.all([
      readFile(`/proc/${pid}/cmdline`, 'utf-8'),
      readFile(`/proc/${pid}/statm`, 'utf-8')
    ])
    const argv = cmdline.split('\0').filter((part) => part.length > 0)
    return { argv, rssBytes: Number(statm.trim().split(/\s+/)[1] ?? 0) * PAGE_BYTES }
  } catch {
    return null
  }
}

/** The supervisor Orca spawned and the agent CLI under it are the chat itself. */
function agentPids(samples: Map<number, StatSample>): Set<number> {
  const agent = new Set<number>()
  for (const [pid, sample] of samples) {
    if (sample.ppid === process.pid) {
      agent.add(pid)
    }
  }
  for (const [pid, sample] of samples) {
    if (agent.has(sample.ppid) && samples.get(sample.ppid)?.ppid === process.pid) {
      agent.add(pid)
    }
  }
  return agent
}

export async function listAgentSessionProcesses(
  sessionId: string,
  platform: NodeJS.Platform = process.platform
): Promise<AgentSessionProcessList> {
  if (platform !== 'linux') {
    return { supported: false, processes: [] }
  }
  const pids = await sessionPids(sessionId)
  const first = new Map<number, StatSample>()
  await Promise.all(
    pids.map(async (pid) => {
      const sample = await readSample(pid)
      if (sample) {
        first.set(pid, sample)
      }
    })
  )
  await new Promise((resolve) => setTimeout(resolve, CPU_SAMPLE_MS))
  const uptime = Number((await readFile('/proc/uptime', 'utf-8')).split(' ')[0])
  const agent = agentPids(first)
  const processes: AgentSessionProcess[] = []
  await Promise.all(
    [...first].map(async ([pid, before]) => {
      const [after, details] = await Promise.all([readSample(pid), readDetails(pid)])
      // A changed start time is a reused pid, not the process sampled first.
      if (!after || !details || after.startTicks !== before.startTicks) {
        return
      }
      const cpuSeconds = (after.cpuTicks - before.cpuTicks) / CLOCK_TICKS_PER_SECOND
      processes.push({
        pid,
        ppid: after.ppid,
        name: after.name,
        command: displayedCommand(details.argv),
        role: agent.has(pid) ? 'agent' : 'child',
        cpuPercent: Math.max(0, Math.round((cpuSeconds / (CPU_SAMPLE_MS / 1000)) * 1000) / 10),
        rssBytes: details.rssBytes,
        elapsedSeconds: Math.max(0, Math.round(uptime - after.startTicks / CLOCK_TICKS_PER_SECOND))
      })
    })
  )
  processes.sort((a, b) => a.pid - b.pid)
  return { supported: true, processes }
}

/** SIGTERM a chat's process and everything under it that belongs to the same chat. */
export async function stopAgentSessionProcess(
  sessionId: string,
  pid: number,
  platform: NodeJS.Platform = process.platform
): Promise<AgentSessionProcessStopResult> {
  if (platform !== 'linux') {
    return { refused: 'unsupported' }
  }
  const pids = await sessionPids(sessionId)
  if (!pids.includes(pid)) {
    return { refused: 'not-found' }
  }
  const samples = new Map<number, StatSample>()
  for (const member of pids) {
    const sample = await readSample(member)
    if (sample) {
      samples.set(member, sample)
    }
  }
  if (agentPids(samples).has(pid)) {
    return { refused: 'agent-process' }
  }
  const doomed = [pid]
  for (let index = 0; index < doomed.length; index++) {
    for (const [member, sample] of samples) {
      if (sample.ppid === doomed[index] && !doomed.includes(member)) {
        doomed.push(member)
      }
    }
  }
  const stopped: number[] = []
  // Children first, so a shell cannot respawn what it is waiting on.
  for (const target of doomed.toReversed()) {
    try {
      process.kill(target, 'SIGTERM')
      stopped.push(target)
    } catch {
      // Already gone.
    }
  }
  return { stopped }
}
