import { randomUUID } from 'node:crypto'
import type { CommandHandler } from '../dispatch/dispatch'
import { getRequiredStringFlag } from '../arguments/flags'
import { printResult } from '../output/command-result-output'
import { RuntimeClientError } from '../runtime/types'
import type { AgentSessionHistoryResult } from '../../shared/agent-session/agent-session-wire'
import { structuredAgentSessionMessageSendMutation } from '../../shared/agent-session/requests/structured-agent-session-send-mutation'
import { createStructuredAgentSessionOperationId } from '../../shared/agent-session/lifecycle/structured-agent-session-mutation'

const CHAT_PANE_PREFIX = 'structured-agent-session-'

type PsAgent = {
  paneKey?: string
  conversationName?: string | null
  agentType?: string | null
  mainAgent?: { state?: string } | null
}
type PsWorktree = { displayName?: string; agents?: PsAgent[] | null }

type NotifyRow = { sessionId: string; name: string; workspace: string }
type NotifyResult = {
  notified: NotifyRow[]
  failed: (NotifyRow & { reason: string })[]
  skipped: { name: string; workspace: string; reason: string }[]
  dryRun: boolean
}

function formatNotifyBusy(result: NotifyResult): string {
  const lines = [
    result.dryRun
      ? `Would notify ${result.notified.length} chat(s)`
      : `Notified ${result.notified.length} chat(s)`
  ]
  for (const row of result.notified) {
    lines.push(`  ${row.name} (${row.workspace})`)
  }
  for (const row of result.failed) {
    lines.push(`  FAILED ${row.name} (${row.workspace}): ${row.reason}`)
  }
  for (const row of result.skipped) {
    lines.push(`  skipped ${row.name} (${row.workspace}): ${row.reason}`)
  }
  return lines.join('\n')
}

export const AGENT_NOTIFY_BUSY_HANDLERS: Record<string, CommandHandler> = {
  'agent notify-busy': async ({ flags, client, json }) => {
    const message = getRequiredStringFlag(flags, 'message').trim()
    if (!message) {
      throw new RuntimeClientError('invalid_argument', '--message must not be empty')
    }
    const exclude = flags.get('exclude')
    const excluded = typeof exclude === 'string' ? exclude.trim() : ''
    const only = flags.get('session')
    const onlySession = typeof only === 'string' ? only.trim() : ''
    const dryRun = flags.get('dry-run') === true
    const ps = await client.call<{ worktrees: PsWorktree[] }>('worktree.ps', {})
    const result: NotifyResult = { notified: [], failed: [], skipped: [], dryRun }
    for (const worktree of ps.result.worktrees) {
      for (const agent of worktree.agents ?? []) {
        // Only the agent's own turn counts: a background task alone never ends on its own.
        // A named --session is reached in any state, so an idle chat can be resumed after a restart.
        if (!onlySession && agent.mainAgent?.state !== 'working') {
          continue
        }
        const name = agent.conversationName || agent.agentType || 'agent'
        const workspace = worktree.displayName ?? ''
        const paneKey = agent.paneKey ?? ''
        if (!paneKey.startsWith(CHAT_PANE_PREFIX)) {
          result.skipped.push({ name, workspace, reason: 'runs in a terminal, not a chat' })
          continue
        }
        const sessionId = paneKey.slice(CHAT_PANE_PREFIX.length).split(':')[0]
        if (!sessionId || sessionId === excluded || (onlySession && sessionId !== onlySession)) {
          continue
        }
        const row = { sessionId, name, workspace }
        if (dryRun) {
          result.notified.push(row)
          continue
        }
        try {
          // The same read the chat composer uses for the fence; current hosts no longer check it.
          const history = await client.call<AgentSessionHistoryResult>('agentSession.history', {
            sessionId,
            direction: 'tail',
            limit: 1
          })
          const page = history.result
          const fence = page.page.fence ?? (!page.ok ? page.fence : undefined)
          if (typeof fence !== 'number') {
            result.failed.push({ ...row, reason: 'no fence for this chat' })
            continue
          }
          // No queue delivery: a send while the turn runs steers that turn.
          const sent = await client.call<{ ok: boolean; refusal?: { message?: string } }>(
            'agentSession.send',
            structuredAgentSessionMessageSendMutation({
              sessionId,
              // The ledger admits only durable ids (timestamp plus entropy).
              clientOperationId: createStructuredAgentSessionOperationId(randomUUID),
              expectedRuntimeFence: fence,
              body: { kind: 'message', role: 'user', blocks: [{ type: 'text', text: message }] }
            })
          )
          if (sent.result.ok) {
            result.notified.push(row)
          } else {
            result.failed.push({ ...row, reason: sent.result.refusal?.message ?? 'refused' })
          }
        } catch (error) {
          result.failed.push({
            ...row,
            reason: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }
    printResult({ ...ps, result }, json, formatNotifyBusy)
    if (result.failed.length > 0) {
      process.exitCode = 1
    }
  }
}
