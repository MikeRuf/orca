import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const calls: { method: string; params: unknown }[] = []
let psAnswers: unknown[] = []
const install = vi.fn()

vi.mock('@/runtime/rpc/calls/runtime-rpc-call', () => ({
  callRuntimeRpc: vi.fn(async (_target: unknown, method: string, params: unknown) => {
    calls.push({ method, params })
    if (method === 'worktree.ps') {
      const next = psAnswers.shift()
      if (next instanceof Error) {
        throw next
      }
      return next
    }
    if (method === 'agentSession.history') {
      return { ok: true, page: { fence: 7 } }
    }
    return { ok: true }
  })
}))
vi.mock('./use-pending-dev-update', () => ({ installPendingDevUpdate: () => install() }))
vi.mock('sonner', () => ({ toast: vi.fn() }))

const working = {
  worktrees: [
    {
      displayName: 'dictate',
      agents: [
        {
          paneKey: 'structured-agent-session-claude_abc:tab',
          conversationName: 'dictate_feedback',
          mainAgent: { state: 'working' }
        }
      ]
    }
  ]
}
const idle = { worktrees: [{ displayName: 'dictate', agents: [] }] }

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve()
  }
}

describe('startPendingDevUpdateInstall', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    calls.length = 0
    install.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it('installs at once when no chat is mid-reply', async () => {
    psAnswers = [idle]
    const { startPendingDevUpdateInstall } = await import('./dev-update-install-flow')
    startPendingDevUpdateInstall()
    await settle()
    expect(install).toHaveBeenCalledOnce()
    expect(calls.some((call) => call.method === 'agentSession.send')).toBe(false)
  })

  it('steers busy chats, waits, and installs once they are idle', async () => {
    psAnswers = [working, working, idle]
    const { startPendingDevUpdateInstall } = await import('./dev-update-install-flow')
    startPendingDevUpdateInstall()
    await settle()
    const sends = calls.filter((call) => call.method === 'agentSession.send')
    expect(sends).toHaveLength(1)
    expect(JSON.stringify(sends[0].params)).toContain('shutdown notice')
    expect(install).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(install).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(install).toHaveBeenCalledOnce()
  })

  it('never installs when it cannot read which chats are busy', async () => {
    psAnswers = [new Error('runtime unavailable')]
    const { startPendingDevUpdateInstall } = await import('./dev-update-install-flow')
    startPendingDevUpdateInstall()
    await settle()
    expect(install).not.toHaveBeenCalled()
  })
})
