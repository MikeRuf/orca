import { useSyncExternalStore } from 'react'
import {
  sanitizeSidebarSurfaceStyle,
  type RepoSidebarSurfaceStyle
} from '../../../shared/repo-sidebar-style'

/** A tab by identity; names are read live from the app, the snapshot only covers a closed tab. */
export type TabShortcut = {
  worktreeId: string
  tabId: string
  /** Last known names, shown while the tab is closed or its workspace is not loaded. */
  title: string
  project: string
  workspace: string
  /** Favorites only. */
  style?: RepoSidebarSurfaceStyle
}

type TabShortcutsState = {
  favorites: TabShortcut[]
  recents: TabShortcut[]
  favoritesOpen: boolean
  recentsOpen: boolean
}

// Kept in the app's own storage: these are this desktop's navigation habits, not project data.
const STORAGE_KEY = 'orca.tabShortcuts.v1'
const MAX_RECENTS = 12

function sameTab(
  a: Pick<TabShortcut, 'worktreeId' | 'tabId'>,
  b: Pick<TabShortcut, 'worktreeId' | 'tabId'>
): boolean {
  return a.worktreeId === b.worktreeId && a.tabId === b.tabId
}

function isShortcut(value: unknown): value is TabShortcut {
  const row = value as Partial<TabShortcut> | null
  return (
    !!row &&
    typeof row.worktreeId === 'string' &&
    typeof row.tabId === 'string' &&
    typeof row.title === 'string' &&
    typeof row.project === 'string' &&
    typeof row.workspace === 'string'
  )
}

// Why: the style reaches inline CSS, and storage can be edited by hand.
function withSafeStyle({ style, ...tab }: TabShortcut): TabShortcut {
  const safe = sanitizeSidebarSurfaceStyle(style)
  return safe ? { ...tab, style: safe } : tab
}

function load(): TabShortcutsState {
  const empty: TabShortcutsState = {
    favorites: [],
    recents: [],
    favoritesOpen: true,
    recentsOpen: true
  }
  try {
    const raw = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null'
    ) as Partial<TabShortcutsState> | null
    if (!raw) {
      return empty
    }
    return {
      favorites: Array.isArray(raw.favorites)
        ? raw.favorites.filter(isShortcut).map(withSafeStyle)
        : [],
      recents: Array.isArray(raw.recents)
        ? raw.recents.filter(isShortcut).slice(0, MAX_RECENTS)
        : [],
      favoritesOpen: raw.favoritesOpen !== false,
      recentsOpen: raw.recentsOpen !== false
    }
  } catch {
    return empty
  }
}

// Loaded on first use, not at import: storage written before the first read (a restore, a test) counts.
let loaded: TabShortcutsState | null = null
function current(): TabShortcutsState {
  loaded ??= load()
  return loaded
}
const listeners = new Set<() => void>()

function commit(next: TabShortcutsState): void {
  loaded = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage full or unavailable: the lists still work for this session.
  }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTabShortcuts(): TabShortcutsState {
  return useSyncExternalStore(subscribe, current, current)
}

export function readTabShortcuts(): TabShortcutsState {
  return current()
}

/** The tab just shown goes to the top of Recent; older entries past the limit drop off. */
export function recordRecentTab(tab: TabShortcut): void {
  const rest = current().recents.filter((row) => !sameTab(row, tab))
  commit({ ...current(), recents: [tab, ...rest].slice(0, MAX_RECENTS) })
}

export function isFavoriteTab(tab: Pick<TabShortcut, 'worktreeId' | 'tabId'>): boolean {
  return current().favorites.some((row) => sameTab(row, tab))
}

export function addFavoriteTab(tab: TabShortcut): void {
  if (!isFavoriteTab(tab)) {
    commit({ ...current(), favorites: [...current().favorites, tab] })
  }
}

export function removeFavoriteTab(tab: Pick<TabShortcut, 'worktreeId' | 'tabId'>): void {
  commit({ ...current(), favorites: current().favorites.filter((row) => !sameTab(row, tab)) })
}

/** Moves a favorite to where another one sits; keys are `worktreeId:tabId`. */
export function moveFavoriteTab(fromKey: string, toKey: string): void {
  const favorites = [...current().favorites]
  const from = favorites.findIndex((row) => tabShortcutKey(row) === fromKey)
  const to = favorites.findIndex((row) => tabShortcutKey(row) === toKey)
  if (from === -1 || to === -1 || from === to) {
    return
  }
  const [moved] = favorites.splice(from, 1)
  favorites.splice(to, 0, moved)
  commit({ ...current(), favorites })
}

export function tabShortcutKey(tab: Pick<TabShortcut, 'worktreeId' | 'tabId'>): string {
  return `${tab.worktreeId}:${tab.tabId}`
}

export function setFavoriteTabStyle(
  tab: Pick<TabShortcut, 'worktreeId' | 'tabId'>,
  style: RepoSidebarSurfaceStyle
): void {
  commit({
    ...current(),
    favorites: current().favorites.map((row) =>
      sameTab(row, tab) ? withSafeStyle({ ...row, style }) : row
    )
  })
}

export function setTabShortcutSectionOpen(section: 'favorites' | 'recents', open: boolean): void {
  commit(
    section === 'favorites'
      ? { ...current(), favoritesOpen: open }
      : { ...current(), recentsOpen: open }
  )
}
