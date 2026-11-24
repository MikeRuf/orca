import { useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'
import type { TabShortcut } from '@/lib/tab-shortcuts-store'
import { FavoriteTabIcon } from './FavoriteTabIcon'
import { FavoriteTabWaitingMark } from './FavoriteTabWaitingMark'
import { getSidebarSurfaceProps } from './project-sidebar-surface-style'
import {
  TAB_SHORTCUT_ROW_CLASS,
  TabShortcutRowLabel,
  useLiveTabShortcut
} from './TabShortcutRowLabel'

function FavoriteTabSwitcherRow({
  favorite,
  selected
}: {
  favorite: TabShortcut
  selected: boolean
}): React.JSX.Element {
  const live = useLiveTabShortcut(favorite)
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selected) {
      rowRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [selected])
  return (
    <div
      ref={rowRef}
      role="option"
      aria-selected={selected}
      {...getSidebarSurfaceProps(favorite.style)}
      data-favorite-tab-active={selected ? '' : undefined}
      className={cn(TAB_SHORTCUT_ROW_CLASS, !live && 'opacity-50')}
    >
      <FavoriteTabIcon shown={live ?? favorite} />
      <TabShortcutRowLabel shown={live ?? favorite} />
      <FavoriteTabWaitingMark favorite={favorite} />
    </div>
  )
}

/** The sidebar's Favorite tabs list as a popup; the red ring marks the row a release will open. */
export function FavoriteTabSwitcherList({
  favorites,
  selectedIndex
}: {
  favorites: TabShortcut[]
  selectedIndex: number
}): React.JSX.Element {
  const title = translate('auto.components.tabShortcuts.favorites', 'Favorite tabs')
  return (
    <div
      role="listbox"
      aria-label={title}
      className="w-[min(22.5rem,calc(100vw-3rem))] overflow-hidden rounded-lg border border-border bg-worktree-sidebar p-2 text-worktree-sidebar-foreground shadow-floating"
    >
      <div className="flex items-center gap-1 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-worktree-sidebar-foreground/50">
        <Star className="size-3" />
        <span className="flex-1">{title}</span>
        <span className="font-normal normal-case">{favorites.length || ''}</span>
      </div>
      {favorites.length === 0 ? (
        <div className="px-2 py-1 text-[11px] text-worktree-sidebar-foreground/40">
          {translate(
            'auto.components.tabShortcuts.noFavorites',
            'Right-click a tab and choose Add to Favorites.'
          )}
        </div>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-px overflow-y-auto scrollbar-sleek">
          {favorites.map((favorite, index) => (
            <FavoriteTabSwitcherRow
              key={`${favorite.worktreeId}:${favorite.tabId}`}
              favorite={favorite}
              selected={index === selectedIndex}
            />
          ))}
        </div>
      )}
    </div>
  )
}
