import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as TabShortcutsStore from './tab-shortcuts-store'

const STORAGE_KEY = 'orca.tabShortcuts.v1'
const tab = { worktreeId: 'w', tabId: 't', title: 'chat', project: 'p', workspace: 'main' }

async function freshStore(): Promise<typeof TabShortcutsStore> {
  vi.resetModules()
  return import('./tab-shortcuts-store')
}

describe('favorite tab style', () => {
  beforeEach(() => {
    const items = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value)
    })
  })

  it('survives a restart and clears when every field is reset', async () => {
    const first = await freshStore()
    first.addFavoriteTab(tab)
    first.setFavoriteTabStyle(tab, { background: '#1e3a8a', fontSize: 15 })

    const second = await freshStore()
    expect(second.readTabShortcuts().favorites[0].style).toEqual({
      background: '#1e3a8a',
      fontSize: 15
    })

    second.setFavoriteTabStyle(tab, {})
    expect(second.readTabShortcuts().favorites[0]).toEqual(tab)
  })

  it('drops a hand-edited style that would escape the inline declaration', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ favorites: [{ ...tab, style: { fontFamily: 'x; color: red' } }] })
    )
    const store = await freshStore()
    expect(store.readTabShortcuts().favorites[0]).toEqual(tab)
  })
})
