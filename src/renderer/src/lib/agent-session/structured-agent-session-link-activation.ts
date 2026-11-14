import { useAppStore } from '../../store/index'
import { activateAndRevealWorkspace } from '../workspace/activation/worktree-activation'
import { activateStructuredAgentSessionTab } from './structured-agent-session-tab-activation'

/** Shows the chat a link names, in whatever workspace holds its tab; false when no open tab has it. */
export function activateStructuredAgentSessionTabBySessionId(sessionId: string): boolean {
  const state = useAppStore.getState()
  for (const [worktreeId, tabs] of Object.entries(state.unifiedTabsByWorktree)) {
    const tab = tabs.find((t) => t.contentType === 'agent-session' && t.entityId === sessionId)
    if (!tab) {
      continue
    }
    const hostId = tab.executionHostId ?? state.getKnownWorktreeById(worktreeId)?.hostId
    const switched = hostId
      ? activateAndRevealWorkspace(worktreeId, { executionHostId: hostId })
      : activateAndRevealWorkspace(worktreeId)
    return switched !== false && activateStructuredAgentSessionTab({ worktreeId, tabId: tab.id })
  }
  return false
}
