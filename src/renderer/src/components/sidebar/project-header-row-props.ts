import type { Repo } from '../../../../shared/repo-types'
import { projectHeaderContextMenu } from './project-actions-menu-requests'
import {
  getProjectSidebarSurfaceProps,
  type ProjectSidebarSurfaceProps
} from './project-sidebar-surface-style'

/** Props a project header row adds for the project's sidebar style and its right-click menu. */
export function getProjectHeaderRowProps(repo: Repo | undefined): ProjectSidebarSurfaceProps & {
  onContextMenu?: (event: { preventDefault: () => void }) => void
} {
  const onContextMenu = projectHeaderContextMenu(repo)
  return {
    ...getProjectSidebarSurfaceProps(repo, 'header'),
    ...(onContextMenu ? { onContextMenu } : {})
  }
}
