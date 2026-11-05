import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { activateWorkspaceTabPaletteResult } from '@/lib/workspace-tab-palette-activation'
import type { WorkspaceTabContentType } from '@/lib/workspace-tab-palette-search'
import { focusTerminalTabSurface } from '@/lib/focus-terminal-tab-surface'
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

/** Shows the tab, in whatever workspace it lives; a closed tab says so instead. */
export function openTabShortcut(shortcut: Pick<TabShortcut, 'worktreeId' | 'tabId'>): void {
  const state = useAppStore.getState()
  const tab = findTab(state, shortcut.worktreeId, shortcut.tabId)
  if (!tab) {
    toast.info(translate('auto.components.tabShortcuts.closed', 'That tab is closed.'))
    return
  }
  const outcome = activateWorkspaceTabPaletteResult({
    worktreeId: shortcut.worktreeId,
    tabId: tab.id,
    groupId: tab.groupId,
    entityId: tab.entityId,
    contentType: tab.contentType as WorkspaceTabContentType,
    ...(tab.executionHostId ? { executionHostId: tab.executionHostId } : {})
  })
  if (outcome.status === 'activated' && tab.contentType === 'terminal') {
    focusTerminalTabSurface(tab.entityId)
  }
}
