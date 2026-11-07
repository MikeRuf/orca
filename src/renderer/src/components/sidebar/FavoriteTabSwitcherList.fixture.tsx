import { getDefaultSettings } from '../../../../shared/constants'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { makeRepo, makeWorktree } from '../worktree-jump/worktree-jump-palette-test-fixtures'
import { FavoriteTabSwitcherList } from './FavoriteTabSwitcherList'

const repo = { ...makeRepo(), displayName: 'travel' }
const worktree = makeWorktree('fixture-main', 'main', { branch: 'main', isMainWorktree: true })

const rows = [
  { title: 'orca_help', background: '#000000', textColor: '#ffffff' },
  { title: 'travel', background: '#44cc00', textColor: '#000000' },
  { title: 'switchboard', background: '#ffb3b3', textColor: '#000000' },
  { title: 'h2yo', background: '#6a00ff', textColor: '#ffffff' }
]

const favorites = rows.map(({ title, ...style }) => ({
  worktreeId: worktree.id,
  tabId: title,
  title,
  project: 'travel',
  workspace: 'main',
  style: { ...style, fontSize: 15 }
}))

const tabs = rows.map(({ title }, index) => ({
  id: title,
  entityId: `term-${index}`,
  groupId: 'g1',
  worktreeId: worktree.id,
  contentType: 'terminal',
  label: title,
  customLabel: null,
  color: null,
  sortOrder: index,
  createdAt: 0
}))

const store = {
  settings: getDefaultSettings('/home/fixture'),
  repos: [repo],
  worktreesByRepo: { [repo.id]: [worktree] },
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the rows read only id, label and contentType
  unifiedTabsByWorktree: { [worktree.id]: tabs } as never,
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the mark reads only id and title
  tabsByWorktree: {
    [worktree.id]: tabs.map((tab) => ({ id: tab.entityId, title: tab.label, ptyId: null }))
  } as never,
  // Terminal titles carry no question, so the hook row alone marks these two.
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the mark reads only state and freshness
  agentStatusByPaneKey: Object.fromEntries(
    ['term-1', 'term-3'].map((tabId) => {
      const paneKey = `${tabId}:11111111-1111-4111-a111-111111111111`
      return [paneKey, { paneKey, state: 'blocked', updatedAt: Date.now() }]
    })
  ) as never
}

export const cycling = defineFixture({
  width: 400,
  store,
  render: () => <FavoriteTabSwitcherList favorites={favorites} selectedIndex={1} />
})

export const noFavorites = defineFixture({
  width: 400,
  store,
  render: () => <FavoriteTabSwitcherList favorites={[]} selectedIndex={-1} />
})
