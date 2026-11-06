import type { Repo } from '../../../../../../shared/repo-types'
import { defineFixture } from '../../../../component-fixtures/component-fixture'
import { makeRepo } from '../../../worktree-jump/worktree-jump-palette-test-fixtures'
import { RepositorySidebarStyleSection } from './RepositorySidebarStyleSection'

const repo: Repo = {
  ...makeRepo(),
  sidebarStyle: {
    header: { background: '#1e3a8a', textColor: '#ffffff', fontFamily: 'Georgia', fontSize: 16 }
  }
}

export const partlyStyled = defineFixture({
  width: 520,
  render: () => <RepositorySidebarStyleSection repo={repo} updateRepo={() => {}} />
})
