import type { Repo } from '../../../../shared/repo-types'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { makeRepo } from '../worktree-jump/worktree-jump-palette-test-fixtures'
import { ProjectAppearanceDialog } from './ProjectAppearanceDialog'

const repo: Repo = {
  ...makeRepo(),
  displayName: 'travel',
  badgeColor: '#22c55e',
  sidebarStyle: { header: { background: '#1e3a8a', textColor: '#ffffff', fontSize: 16 } }
}

export const open = defineFixture({
  width: 1200,
  store: { repos: [repo] },
  render: () => (
    <div style={{ height: 900 }}>
      <ProjectAppearanceDialog
        repo={repo}
        open
        onOpenChange={() => {}}
        anchor={{ sidebarRight: 280 }}
      />
    </div>
  )
})
