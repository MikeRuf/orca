import { getDefaultSettings } from '../../../../shared/constants'
import type { Repo } from '../../../../shared/repo-types'
import { defineFixture } from '../../component-fixtures/component-fixture'
import { Ellipsis, Plus } from 'lucide-react'
import { RepoIconGlyph } from '../repo/repo-icon'
import { Button } from '../ui/button'
import { makeRepo, makeWorktree } from '../worktree-jump/worktree-jump-palette-test-fixtures'
import WorktreeCard from './workspace-card/surface/WorktreeCard'
import { getProjectSidebarSurfaceProps } from './project-sidebar-surface-style'
import { ProjectHeaderActions } from './worktree-list/rows/ProjectHeaderActions'
import { REPO_HEADER_ACTION_BUTTON_CLASS } from './worktree-list/rows/repo-header-action-button-class'

const repo: Repo = {
  ...makeRepo(),
  displayName: 'travel',
  badgeColor: '#22c55e',
  sidebarStyle: {
    header: { background: '#1e3a8a', textColor: '#ffffff', fontFamily: 'Georgia', fontSize: 16 },
    rows: { background: '#dbeafe', textColor: '#1e3a8a' }
  }
}
const main = makeWorktree('styled-main', 'main', { branch: 'main', isMainWorktree: true })
const feature = makeWorktree('styled-feature', 'trip-page', { branch: 'trip-page' })

export const styledProject = defineFixture({
  width: 300,
  store: {
    settings: getDefaultSettings('/home/fixture'),
    repos: [repo],
    worktreesByRepo: { [repo.id]: [main, feature] },
    worktreeCardProperties: ['status', 'branch']
  },
  render: () => {
    const header = getProjectSidebarSurfaceProps(repo, 'header')
    const rows = getProjectSidebarSurfaceProps(repo, 'rows')
    return (
      <div className="bg-worktree-sidebar py-2 text-worktree-sidebar-foreground">
        <div {...header} className="group relative flex h-7 items-center gap-1.5 px-2">
          <RepoIconGlyph
            repoIcon={null}
            color={repo.badgeColor}
            className="size-4"
            iconClassName="size-3.5"
          />
          <span className="truncate text-[13px] font-semibold leading-4">{repo.displayName}</span>
          {/* The real action area, shown as on hover: + idle, the menu button open. */}
          <ProjectHeaderActions className="pointer-events-auto opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={`${REPO_HEADER_ACTION_BUTTON_CLASS} ml-0 max-w-5 opacity-100`}
            >
              <Plus className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={`${REPO_HEADER_ACTION_BUTTON_CLASS} bg-accent`}
              data-state="open"
            >
              <Ellipsis className="size-3.5" />
            </Button>
          </ProjectHeaderActions>
        </div>
        {[main, feature].map((worktree) => (
          <div key={worktree.id} {...rows}>
            <WorktreeCard
              worktree={worktree}
              repo={repo}
              isActive={worktree === main}
              nativeDragEnabled={false}
            />
          </div>
        ))}
      </div>
    )
  }
})
