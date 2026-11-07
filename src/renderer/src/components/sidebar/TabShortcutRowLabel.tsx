import { useAppStore } from '@/store'
import { describeTab } from '@/lib/tab-shortcut-resolution'
import type { TabShortcut } from '@/lib/tab-shortcuts-store'

const NAME_SEPARATOR = '\u0000'

export const TAB_SHORTCUT_ROW_CLASS =
  'flex w-full min-w-0 items-baseline gap-1.5 rounded-md px-2 py-1 text-left text-[12px] text-worktree-sidebar-foreground/80'

/** Live names win; the snapshot covers a tab that is closed or not loaded yet. */
export function useLiveTabShortcut(shortcut: TabShortcut): TabShortcut | null {
  // A string selection: a fresh object per read would make the store hook re-render forever.
  const liveKey = useAppStore((state) => {
    const tab = describeTab(state, shortcut.worktreeId, shortcut.tabId)
    return tab ? [tab.title, tab.project, tab.workspace].join(NAME_SEPARATOR) : ''
  })
  if (!liveKey) {
    return null
  }
  const [title = '', project = '', workspace = ''] = liveKey.split(NAME_SEPARATOR)
  return { ...shortcut, title, project, workspace }
}

/** One line: the tab name always, then project and workspace as far as they fit. */
export function TabShortcutRowLabel({ shown }: { shown: TabShortcut }): React.JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
      <span className="shrink-0 truncate font-medium text-worktree-sidebar-foreground max-w-full">
        {shown.title}
      </span>
      {shown.project ? (
        <span className="min-w-0 shrink truncate text-worktree-sidebar-foreground/50">
          {shown.project}
        </span>
      ) : null}
      {shown.workspace ? (
        <span className="min-w-0 shrink-[2] truncate text-worktree-sidebar-foreground/40">
          {shown.workspace}
        </span>
      ) : null}
    </span>
  )
}
