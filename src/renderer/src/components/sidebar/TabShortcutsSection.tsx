import { useRef, useState } from 'react'
import { ChevronRight, Star } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  addFavoriteTab,
  isFavoriteTab,
  removeFavoriteTab,
  setTabShortcutSectionOpen,
  useTabShortcuts,
  type TabShortcut
} from '@/lib/tab-shortcuts-store'
import { describeTab, openTabShortcut } from '@/lib/tab-shortcut-resolution'
import { readCurrentTabLocation } from '@/lib/last-tab-toggle'
import { FavoriteTabAppearanceDialog } from './FavoriteTabAppearanceDialog'
import { getSidebarSurfaceProps } from './project-sidebar-surface-style'
import type { SidebarAppearanceDialogAnchor } from './SidebarAppearanceDialog'

const NAME_SEPARATOR = '\u0000'

function ShortcutRow({
  shortcut,
  favorite
}: {
  shortcut: TabShortcut
  favorite: boolean
}): React.JSX.Element {
  // Live names win; the snapshot covers a tab that is closed or not loaded yet.
  // A string selection: a fresh object per read would make the store hook re-render forever.
  const liveKey = useAppStore((state) => {
    const tab = describeTab(state, shortcut.worktreeId, shortcut.tabId)
    return tab ? [tab.title, tab.project, tab.workspace].join(NAME_SEPARATOR) : ''
  })
  const [liveTitle = '', liveProject = '', liveWorkspace = ''] = liveKey
    ? liveKey.split(NAME_SEPARATOR)
    : []
  const live: TabShortcut | null = liveKey
    ? { ...shortcut, title: liveTitle, project: liveProject, workspace: liveWorkspace }
    : null
  const shown = live ?? shortcut
  const isCurrentFavorite = useAppStore((state) => {
    const current = favorite ? readCurrentTabLocation(state) : null
    return current?.worktreeId === shortcut.worktreeId && current.tabId === shortcut.tabId
  })
  const isFavorite = favorite || isFavoriteTab(shortcut)
  const rowRef = useRef<HTMLButtonElement>(null)
  const [appearanceAnchor, setAppearanceAnchor] = useState<SidebarAppearanceDialogAnchor | null>(
    null
  )
  // Recents share rows with favorites but stay plain: the style marks the Favorites list.
  const surface = getSidebarSurfaceProps(favorite ? shortcut.style : undefined)
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            ref={rowRef}
            type="button"
            {...surface}
            data-favorite-tab-active={isCurrentFavorite ? '' : undefined}
            aria-current={isCurrentFavorite ? 'true' : undefined}
            onClick={() => openTabShortcut(shortcut)}
            title={[shown.title, shown.project, shown.workspace].filter(Boolean).join(' · ')}
            className={cn(
              'flex w-full min-w-0 items-baseline gap-1.5 rounded-md px-2 py-1 text-left text-[12px] text-worktree-sidebar-foreground/80 hover:bg-worktree-sidebar-foreground/8',
              !live && 'opacity-50'
            )}
          >
            {/* One line: the tab name always, then project and workspace as far as they fit. */}
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
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {favorite ? (
            <ContextMenuItem
              onSelect={() =>
                setAppearanceAnchor({
                  // The section spans the sidebar, so its right edge is the sidebar's.
                  sidebarRight:
                    rowRef.current?.closest('[data-tab-shortcuts]')?.getBoundingClientRect()
                      .right ?? 0
                })
              }
            >
              {translate(
                'auto.components.sidebar.WorktreeList.customizeAppearance',
                'Customize Appearance…'
              )}
            </ContextMenuItem>
          ) : null}
          {isFavorite ? (
            <ContextMenuItem onSelect={() => removeFavoriteTab(shortcut)}>
              {translate('auto.components.tabShortcuts.removeFavorite', 'Remove from Favorites')}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onSelect={() => addFavoriteTab(live ?? shortcut)}>
              {translate('auto.components.tabShortcuts.addFavorite', 'Add to Favorites')}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {appearanceAnchor ? (
        <FavoriteTabAppearanceDialog
          shortcut={shortcut}
          name={shown.title}
          onClose={() => setAppearanceAnchor(null)}
          anchor={appearanceAnchor}
        />
      ) : null}
    </>
  )
}

function ShortcutSection({
  title,
  open,
  onOpenChange,
  rows,
  favorite,
  empty
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: TabShortcut[]
  favorite: boolean
  empty: string
}): React.JSX.Element {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-worktree-sidebar-foreground/50 hover:text-worktree-sidebar-foreground/80"
        >
          <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
          {favorite ? <Star className="size-3" /> : null}
          <span className="flex-1">{title}</span>
          <span className="font-normal normal-case">{rows.length || ''}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-px pb-1">
          {rows.length === 0 ? (
            <div className="px-2 py-1 text-[11px] text-worktree-sidebar-foreground/40">{empty}</div>
          ) : (
            rows.map((row) => (
              <ShortcutRow
                key={`${row.worktreeId}:${row.tabId}`}
                shortcut={row}
                favorite={favorite}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Favorite tabs, then recent tabs, above Projects: one click back to any tab in any workspace. */
export function TabShortcutsSection(): React.JSX.Element {
  const { favorites, recents, favoritesOpen, recentsOpen } = useTabShortcuts()
  return (
    <div data-tab-shortcuts="" className="flex flex-col gap-0.5 px-2 pb-1">
      <ShortcutSection
        title={translate('auto.components.tabShortcuts.favorites', 'Favorite tabs')}
        open={favoritesOpen}
        onOpenChange={(open) => setTabShortcutSectionOpen('favorites', open)}
        rows={favorites}
        favorite
        empty={translate(
          'auto.components.tabShortcuts.noFavorites',
          'Right-click a tab and choose Add to Favorites.'
        )}
      />
      <ShortcutSection
        title={translate('auto.components.tabShortcuts.recents', 'Recent tabs')}
        open={recentsOpen}
        onOpenChange={(open) => setTabShortcutSectionOpen('recents', open)}
        rows={recents}
        favorite={false}
        empty={translate('auto.components.tabShortcuts.noRecents', 'Tabs you visit appear here.')}
      />
    </div>
  )
}
