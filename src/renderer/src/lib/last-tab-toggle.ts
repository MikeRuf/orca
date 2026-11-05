import { useAppStore } from '@/store'
import { keybindingMatchesAction } from '../../../shared/keybindings'
import { getShortcutPlatform } from '@/lib/shortcut-platform'
import { activateWorkspaceTabPaletteResult } from '@/lib/workspace-tab-palette-activation'
import type { WorkspaceTabContentType } from '@/lib/workspace-tab-palette-search'
import { focusTerminalTabSurface } from '@/lib/focus-terminal-tab-surface'

type TabLocation = {
  key: string
  worktreeId: string
  groupId: string
  tabId: string
  entityId: string
  contentType: WorkspaceTabContentType
}

type ToggleState = Parameters<Parameters<typeof useAppStore.subscribe>[0]>[0]

/** The tab the user is looking at: the active group's active tab in the active workspace. */
export function readCurrentTabLocation(state: ToggleState): TabLocation | null {
  const worktreeId = state.activeWorktreeId
  if (!worktreeId) {
    return null
  }
  const groupId = state.activeGroupIdByWorktree[worktreeId]
  const group = (state.groupsByWorktree[worktreeId] ?? []).find((g) => g.id === groupId)
  const tabId = group?.activeTabId
  const tab = tabId
    ? (state.unifiedTabsByWorktree[worktreeId] ?? []).find((t) => t.id === tabId)
    : undefined
  if (!group || !tab) {
    return null
  }
  return {
    key: `${worktreeId}\u0000${tab.id}`,
    worktreeId,
    groupId: group.id,
    tabId: tab.id,
    entityId: tab.entityId,
    contentType: tab.contentType as WorkspaceTabContentType
  }
}

/** Remembers the current and previous tab across every workspace; a toggle swaps them. */
export function createLastTabTracker() {
  let current: TabLocation | null = null
  let previous: TabLocation | null = null
  return {
    observe(location: TabLocation | null): void {
      if (!location || location.key === current?.key) {
        return
      }
      previous = current
      current = location
    },
    previous: (): TabLocation | null => previous
  }
}

/**
 * Alt+Q (tab.toggleLast): back to the tab you were on last, wherever it is in Orca; pressing it
 * again returns, because the jump itself makes the tab you left the previous one.
 */
export function installLastTabToggle(): () => void {
  const tracker = createLastTabTracker()
  tracker.observe(readCurrentTabLocation(useAppStore.getState()))
  const unsubscribe = useAppStore.subscribe((state) =>
    tracker.observe(readCurrentTabLocation(state))
  )
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return
    }
    const { keybindings } = useAppStore.getState()
    if (!keybindingMatchesAction('tab.toggleLast', event, getShortcutPlatform(), keybindings)) {
      return
    }
    const target = tracker.previous()
    if (!target) {
      return
    }
    // Claim the key before a terminal or editor sees it.
    event.preventDefault()
    event.stopPropagation()
    const outcome = activateWorkspaceTabPaletteResult(target)
    if (outcome.status === 'activated' && target.contentType === 'terminal') {
      focusTerminalTabSurface(target.entityId)
    }
  }
  // Capture phase: runs before the terminal and editor key handlers.
  window.addEventListener('keydown', onKeyDown, true)
  return () => {
    unsubscribe()
    window.removeEventListener('keydown', onKeyDown, true)
  }
}
