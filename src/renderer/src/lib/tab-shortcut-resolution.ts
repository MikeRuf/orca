import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { activateWorkspaceTabPaletteResult } from '@/lib/workspace/search/tabs/workspace-tab-palette-activation'
import type { WorkspaceTabContentType } from '@/lib/workspace/search/tabs/workspace-tab-search-types'
import { focusTerminalTabSurface } from '@/components/terminal-pane/input/focus/focus-terminal-tab-surface'
import { activateAndRevealWorkspace } from '@/lib/workspace/activation/worktree-activation'
import { activateStructuredAgentSessionTab } from '@/lib/agent-session/structured-agent-session-tab-activation'
import type { TabShortcut } from './tab-shortcuts-store'

type AppState = ReturnType<typeof useAppStore.getState>

function findTab(state: AppState, worktreeId: string, tabId: string) {
  return (state.unifiedTabsByWorktree[worktreeId] ?? []).find((tab) => tab.id === tabId)
}

/** The tab's current names (tab, project, workspace), or null when it is no longer open. */
export function describeTab(
  state: AppState,
  worktreeId: string,
  tabId: string
): TabShortcut | null {
  const tab = findTab(state, worktreeId, tabId)
  if (!tab) {
    return null
  }
  const worktree = state.getKnownWorktreeById(worktreeId)
  const repo = worktree ? state.repos.find((r) => r.id === worktree.repoId) : undefined
  return {
    worktreeId,
    tabId,
    title:
      tab.customLabel ||
      tab.label ||
      translate('auto.components.tabShortcuts.untitled', 'Untitled tab'),
    project: repo?.displayName ?? '',
    workspace: worktree?.displayName ?? ''
  }
}

/** Finds an open tab by its unified id in any workspace (the tab menu knows only the id). */
export function describeTabById(state: AppState, tabId: string): TabShortcut | null {
  for (const [worktreeId, tabs] of Object.entries(state.unifiedTabsByWorktree)) {
    if ((tabs ?? []).some((tab) => tab.id === tabId)) {
      return describeTab(state, worktreeId, tabId)
    }
  }
  return null
}

type OpenTab = NonNullable<ReturnType<typeof findTab>>

/**
 * Shows a tab in any workspace. Each kind activates the way its own tab-strip click does: the
 * palette path covers terminal and file tabs only (it requires an open file for everything else,
 * so chats failed through it with "missing-file").
 */
export function activateTabAnywhere(worktreeId: string, tab: OpenTab): boolean {
  if (
    tab.contentType === 'terminal' ||
    tab.contentType === 'editor' ||
    tab.contentType === 'diff' ||
    tab.contentType === 'conflict-review' ||
    tab.contentType === 'check-details'
  ) {
    const outcome = activateWorkspaceTabPaletteResult({
      worktreeId,
      tabId: tab.id,
      groupId: tab.groupId,
      entityId: tab.entityId,
      contentType: tab.contentType as WorkspaceTabContentType,
      ...(tab.executionHostId ? { executionHostId: tab.executionHostId } : {})
    })
    if (outcome.status === 'activated' && tab.contentType === 'terminal') {
      focusTerminalTabSurface(tab.entityId)
    }
    return outcome.status === 'activated'
  }
  const hostId =
    tab.executionHostId ?? useAppStore.getState().getKnownWorktreeById(worktreeId)?.hostId
  const switched = hostId
    ? activateAndRevealWorkspace(worktreeId, { executionHostId: hostId })
    : activateAndRevealWorkspace(worktreeId)
  if (switched === false) {
    return false
  }
  if (tab.contentType === 'agent-session') {
    return activateStructuredAgentSessionTab({ worktreeId, tabId: tab.id })
  }
  const state = useAppStore.getState()
  state.focusGroup(worktreeId, tab.groupId)
  state.activateTab(tab.id, { worktreeId })
  if (tab.contentType === 'browser') {
    state.setActiveBrowserTab(tab.entityId, worktreeId)
    state.setActiveTabType('browser', worktreeId)
  }
  return true
}

/** Shows the tab, in whatever workspace it lives; a closed tab says so instead. */
export function openTabShortcut(shortcut: Pick<TabShortcut, 'worktreeId' | 'tabId'>): void {
  const tab = findTab(useAppStore.getState(), shortcut.worktreeId, shortcut.tabId)
  if (!tab) {
    toast.info(translate('auto.components.tabShortcuts.closed', 'That tab is closed.'))
    return
  }
  if (!activateTabAnywhere(shortcut.worktreeId, tab)) {
    toast.error(translate('auto.components.tabShortcuts.openFailed', 'Could not open that tab.'))
  }
}
