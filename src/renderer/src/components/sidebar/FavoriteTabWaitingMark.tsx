import { useState } from 'react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import type { TabShortcut } from '@/lib/tab-shortcuts-store'
import { structuredAgentSessionPaneKey } from '../../../../shared/agent-session/view/structured-agent-session-projection'
import { createActivityStatusSelector } from '../tab-bar/use-terminal-tab-activity'

type AppState = ReturnType<typeof useAppStore.getState>

function createWaitingSelector(): (
  state: AppState,
  favorite: Pick<TabShortcut, 'worktreeId' | 'tabId'>
) => boolean {
  const selectTerminalStatus = createActivityStatusSelector()
  // The key hashes the session id, and this runs on every store write.
  let chatPane: { tabId: string; sessionId: string; paneKey: string } | null = null
  return (state, { worktreeId, tabId }) => {
    const tab = state.unifiedTabsByWorktree[worktreeId]?.find((item) => item.id === tabId)
    if (tab?.contentType === 'agent-session') {
      if (chatPane?.tabId !== tab.id || chatPane.sessionId !== tab.entityId) {
        chatPane = {
          tabId: tab.id,
          sessionId: tab.entityId,
          paneKey: structuredAgentSessionPaneKey(tab.id, tab.entityId)
        }
      }
      const entry = state.agentStatusByPaneKey[chatPane.paneKey]
      return entry?.state === 'blocked' || entry?.state === 'waiting'
    }
    if (tab?.contentType !== 'terminal') {
      return false
    }
    // Agent status keys terminals by the backing terminal tab, not the unified tab.
    const terminal = state.tabsByWorktree[worktreeId]?.find((item) => item.id === tab.entityId)
    return (
      terminal !== undefined &&
      selectTerminalStatus({
        tab: terminal,
        agentStatusByPaneKey: state.agentStatusByPaneKey,
        agentStatusEpoch: state.agentStatusEpoch,
        runtimePaneTitlesByTabId: state.runtimePaneTitlesByTabId,
        ptyIdsByTabId: state.ptyIdsByTabId,
        terminalLayout: state.terminalLayoutsByTabId?.[terminal.id]
      }) === 'permission'
    )
  }
}

/** Flashes while the favorite's agent is waiting on a question or approval from the user. */
export function FavoriteTabWaitingMark({
  favorite
}: {
  favorite: Pick<TabShortcut, 'worktreeId' | 'tabId'>
}): React.JSX.Element | null {
  const [selectWaiting] = useState(createWaitingSelector)
  const waiting = useAppStore((state) => selectWaiting(state, favorite))
  if (!waiting) {
    return null
  }
  const label = translate('auto.components.tabShortcuts.waitingOnYou', 'Waiting on your answer')
  return (
    <span role="img" aria-label={label} title={label} className="favorite-tab-waiting-mark">
      !
    </span>
  )
}
