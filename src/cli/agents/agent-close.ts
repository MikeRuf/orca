import type { CommandHandler } from '../dispatch/dispatch'
import { getRequiredStringFlag } from '../arguments/flags'
import { printResult } from '../output/command-result-output'

const CHAT_PANE_PREFIX = 'structured-agent-session-'

export const AGENT_CLOSE_HANDLERS: Record<string, CommandHandler> = {
  'agent close': async ({ flags, client, json }) => {
    // Accept a full paneKey too, since that is what `worktree ps` prints.
    const raw = getRequiredStringFlag(flags, 'session').trim()
    const sessionId = raw.startsWith(CHAT_PANE_PREFIX)
      ? raw.slice(CHAT_PANE_PREFIX.length).split(':')[0]
      : raw
    const result = await client.call<{ ok: true }>('agentSession.close', { sessionId })
    printResult(
      { ...result, result: { closed: sessionId } },
      json,
      (value) => `Closed ${value.closed}`
    )
  }
}
