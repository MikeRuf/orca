import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/store'
import { addAppKeyListener, removeAppKeyListener } from '@/lib/keyboard/app-keyboard-router'
import { readCurrentTabLocation } from '@/lib/last-tab-toggle'
import { getShortcutPlatform } from '@/lib/keyboard/shortcut-platform'
import { openTabShortcut } from '@/lib/tab-shortcut-resolution'
import { readTabShortcuts, type TabShortcut } from '@/lib/tab-shortcuts-store'
import { keybindingMatchesAction } from '../../../../shared/keybindings'
import { getNextRecentTabSwitcherIndex } from '../tab-bar/recent-tab-switching'
import { FavoriteTabSwitcherList } from './FavoriteTabSwitcherList'

type SwitcherState = { favorites: TabShortcut[]; selectedIndex: number }

function consumeKeyboardEvent(event: KeyboardEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

function findCurrentFavoriteIndex(favorites: TabShortcut[]): number {
  const current = readCurrentTabLocation(useAppStore.getState())
  return favorites.findIndex(
    (favorite) => favorite.worktreeId === current?.worktreeId && favorite.tabId === current.tabId
  )
}

/** Hold the tab.cycleFavorites (or Backward) chord's modifiers and tap its key to step; releasing opens the row. */
export default function FavoriteTabSwitcher(): React.JSX.Element | null {
  const [switcher, setSwitcher] = useState<SwitcherState | null>(null)
  const switcherRef = useRef<SwitcherState | null>(null)

  const setSwitcherState = useCallback((next: SwitcherState | null): void => {
    switcherRef.current = next
    setSwitcher(next)
  }, [])

  const advance = useCallback(
    (direction: 1 | -1): void => {
      const current = switcherRef.current
      const favorites = current?.favorites ?? readTabShortcuts().favorites
      const fromIndex = current?.selectedIndex ?? findCurrentFavoriteIndex(favorites)
      const selectedIndex = getNextRecentTabSwitcherIndex(favorites.length, fromIndex, direction)
      setSwitcherState({ favorites, selectedIndex })
    },
    [setSwitcherState]
  )

  const cancel = useCallback((): void => setSwitcherState(null), [setSwitcherState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const { keybindings } = useAppStore.getState()
      const platform = getShortcutPlatform()
      const direction = keybindingMatchesAction('tab.cycleFavorites', event, platform, keybindings)
        ? 1
        : keybindingMatchesAction('tab.cycleFavoritesBackward', event, platform, keybindings)
          ? -1
          : null
      if (direction !== null) {
        consumeKeyboardEvent(event)
        if (!event.repeat) {
          advance(direction)
        }
        return
      }
      if (switcherRef.current && event.key === 'Escape') {
        consumeKeyboardEvent(event)
        cancel()
      }
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      const current = switcherRef.current
      // Any rebinding works: the choice lands once every modifier is up, in whatever order.
      if (!current || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return
      }
      consumeKeyboardEvent(event)
      setSwitcherState(null)
      const selected = current.favorites[current.selectedIndex]
      if (selected) {
        openTabShortcut(selected)
      }
    }
    addAppKeyListener('keydown', onKeyDown)
    addAppKeyListener('keyup', onKeyUp)
    window.addEventListener('blur', cancel)
    return () => {
      removeAppKeyListener('keydown', onKeyDown)
      removeAppKeyListener('keyup', onKeyUp)
      window.removeEventListener('blur', cancel)
    }
  }, [advance, cancel, setSwitcherState])

  if (!switcher) {
    return null
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
      <FavoriteTabSwitcherList
        favorites={switcher.favorites}
        selectedIndex={switcher.selectedIndex}
      />
    </div>,
    document.body
  )
}
