import { toast } from 'sonner'
import type { AgentSessionHistoryResult } from '../../../../shared/agent-session/agent-session-wire'
import { structuredAgentSessionMessageSendMutation } from '../../../../shared/agent-session/requests/structured-agent-session-send-mutation'
import { createStructuredAgentSessionOperationId } from '../../../../shared/agent-session/lifecycle/structured-agent-session-mutation'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { createNonSecureContextUuid as createBrowserUuid } from '../../../../shared/non-secure-context-uuid'
import { translate } from '@/i18n/i18n'
import { installPendingDevUpdate } from './use-pending-dev-update'

export const PENDING_DEV_UPDATE_TOAST_ID = 'pending-dev-update'
const CHAT_PANE_PREFIX = 'structured-agent-session-'
const POLL_MS = 5_000
const WAIT_LIMIT_MS = 30 * 60_000
const LOCAL = { kind: 'local' } as const

type BusyChat = { sessionId: string; name: string }
type PsWorktree = {
  displayName?: string
  agents?:
    | {
        paneKey?: string
        conversationName?: string | null
        mainAgent?: { state?: string } | null
      }[]
    | null
}

const SHUTDOWN_NOTICE =
  '[Orca shutdown notice] The Orca desktop app restarts to install an update as soon as every chat on it is idle. Please wrap up your current task as soon as possible: finish or checkpoint the step you are on, say where you stopped, then end your turn. This conversation resumes after the restart.'

/** Chats this app hosts whose own turn is running; a background task alone never ends by itself. */
async function busyLocalChats(): Promise<BusyChat[]> {
  const ps = await callRuntimeRpc<{ worktrees: PsWorktree[] }>(LOCAL, 'worktree.ps', {})
  const busy: BusyChat[] = []
  for (const worktree of ps.worktrees) {
    for (const agent of worktree.agents ?? []) {
      const paneKey = agent.paneKey ?? ''
      if (agent.mainAgent?.state === 'working' && paneKey.startsWith(CHAT_PANE_PREFIX)) {
        busy.push({
          sessionId: paneKey.slice(CHAT_PANE_PREFIX.length).split(':')[0],
          name: agent.conversationName || worktree.displayName || 'chat'
        })
      }
    }
  }
  return busy
}

/** Sends the notice as a steer: no queue delivery, so it lands in the running turn. */
async function steer(chat: BusyChat): Promise<void> {
  const history = await callRuntimeRpc<AgentSessionHistoryResult>(LOCAL, 'agentSession.history', {
    sessionId: chat.sessionId,
    direction: 'tail',
    limit: 1
  })
  const fence = history.page.fence ?? (!history.ok ? history.fence : undefined)
  if (typeof fence !== 'number') {
    return
  }
  await callRuntimeRpc(
    LOCAL,
    'agentSession.send',
    structuredAgentSessionMessageSendMutation({
      sessionId: chat.sessionId,
      clientOperationId: createStructuredAgentSessionOperationId(createBrowserUuid),
      expectedRuntimeFence: fence,
      body: { kind: 'message', role: 'user', blocks: [{ type: 'text', text: SHUTDOWN_NOTICE }] }
    })
  )
}

let waiting: { cancelled: boolean } | null = null

function showWaiting(busy: BusyChat[], timedOut: boolean, unreadable = false): void {
  const names = busy.map((chat) => chat.name).join(', ')
  toast(
    unreadable
      ? translate('auto.components.devUpdate.unreadableTitle', 'Could not check for busy chats')
      : timedOut
        ? translate('auto.components.devUpdate.stillBusyTitle', 'Chats still busy after 30 minutes')
        : translate(
            'auto.components.devUpdate.waitingTitle',
            'Waiting for {{count}} chats to finish',
            {
              count: busy.length,
              defaultValue_one: 'Waiting for 1 chat to finish'
            }
          ),
    {
      id: PENDING_DEV_UPDATE_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      description: unreadable
        ? translate(
            'auto.components.devUpdate.unreadableBody',
            'Not installed, so no chat is cut off. Install now if no chat on this app is working.'
          )
        : timedOut
          ? translate(
              'auto.components.devUpdate.stillBusyBody',
              'Not installed yet. Still working: {{value0}}.',
              { value0: names }
            )
          : translate(
              'auto.components.devUpdate.waitingBody',
              'They were asked to wrap up; Orca installs the update once they are idle. Working: {{value0}}.',
              { value0: names }
            ),
      action: {
        label: translate('auto.components.devUpdate.installNow', 'Install now'),
        onClick: () => {
          if (waiting) {
            waiting.cancelled = true
          }
          installPendingDevUpdate()
        }
      }
    }
  )
}

/**
 * Install, but never cut off a chat mid-reply without asking: busy chats on this app get the
 * shutdown notice, and the install waits (bounded) until they are idle. "Install now" skips it.
 */
export function startPendingDevUpdateInstall(): void {
  if (waiting) {
    return
  }
  const run = { cancelled: false }
  waiting = run
  void (async () => {
    try {
      let busy = await busyLocalChats()
      if (busy.length === 0) {
        installPendingDevUpdate()
        return
      }
      await Promise.allSettled(busy.map(steer))
      const deadline = Date.now() + WAIT_LIMIT_MS
      while (!run.cancelled) {
        showWaiting(busy, false)
        await new Promise((resolve) => setTimeout(resolve, POLL_MS))
        if (run.cancelled) {
          return
        }
        busy = await busyLocalChats()
        if (busy.length === 0) {
          installPendingDevUpdate()
          return
        }
        if (Date.now() > deadline) {
          showWaiting(busy, true)
          return
        }
      }
    } catch {
      // Unknown agent state: do not install over chats that might be working; offer it instead.
      showWaiting([], true, true)
    } finally {
      if (waiting === run) {
        waiting = null
      }
    }
  })()
}
