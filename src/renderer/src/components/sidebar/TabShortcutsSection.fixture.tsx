import { getDefaultSettings } from '../../../../shared/constants'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { makeRepo, makeWorktree } from '../worktree-jump/worktree-jump-palette-test-fixtures'
import { TabShortcutsSection } from './TabShortcutsSection'

const repo = { ...makeRepo(), displayName: 'travel' }
const worktree = makeWorktree('fixture-main', 'main', { branch: 'main', isMainWorktree: true })
const openTab = {
  id: 'tab-open',
  entityId: 'term-1',
  groupId: 'g1',
  worktreeId: worktree.id,
  contentType: 'terminal',
  label: 'travel_agent',
  customLabel: null,
  color: null,
  sortOrder: 0,
  createdAt: 0
}

export const lists = defineFixture({
  width: 300,
  setup: () => {
    localStorage.setItem(
      'orca.tabShortcuts.v1',
      JSON.stringify({
        favoritesOpen: true,
        recentsOpen: true,
        favorites: [
          {
            worktreeId: worktree.id,
            tabId: 'tab-open',
            title: 'travel_agent',
            project: 'travel',
            workspace: 'main',
            style: { background: '#1e3a8a', textColor: '#ffffff', fontSize: 15 }
          },
          {
            worktreeId: 'gone',
            tabId: 'tab-closed',
            title: 'old release notes',
            project: 'h2yo',
            workspace: 'h2yo'
          }
        ],
        recents: [
          {
            worktreeId: worktree.id,
            tabId: 'tab-open',
            title: 'travel_agent',
            project: 'travel',
            workspace: 'main'
          },
          {
            worktreeId: 'gone',
            tabId: 'x',
            title: 'a very long chat name that will not fit',
            project: 'orca',
            workspace: 'feat/last-tab-toggle'
          }
        ]
      })
    )
  },
  store: {
    settings: getDefaultSettings('/home/fixture'),
    repos: [repo],
    worktreesByRepo: { [repo.id]: [worktree] },
    unifiedTabsByWorktree: { [worktree.id]: [openTab] } as never,
    activeWorktreeId: worktree.id,
    activeGroupIdByWorktree: { [worktree.id]: 'g1' },
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the row reads only id and activeTabId
    groupsByWorktree: { [worktree.id]: [{ id: 'g1', activeTabId: 'tab-open' }] } as never
  },
  render: () => (
    <div className="bg-worktree-sidebar py-2 text-worktree-sidebar-foreground">
      <TabShortcutsSection />
    </div>
  )
})
