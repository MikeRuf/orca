import type { Repo } from '../../../../shared/repo-types'
import {
  getProjectGroupHeaderPaddingLeft,
  WORKTREE_SECTION_HEADER_PADDING_LEFT
} from './worktree-list/rows/indentation'
import { projectHeaderContextMenu } from './project-actions-menu-requests'
import {
  getProjectSidebarSurfaceProps,
  type ProjectSidebarSurfaceProps
} from './project-sidebar-surface-style'

/**
 * Props a project header row adds for the project's sidebar style, its indent and its right-click
 * menu. `indentDepth` is null for flat-list labels such as "All", which reserve no hierarchy indent.
 */
// Why: the indent lives here so SectionHeader.tsx stays under its 400-line cap.
export function getProjectHeaderRowProps(
  repo: Repo | undefined,
  { indentDepth }: { indentDepth: number | null }
): ProjectSidebarSurfaceProps & {
  onContextMenu?: (event: { preventDefault: () => void }) => void
} {
  const onContextMenu = projectHeaderContextMenu(repo)
  const surface = getProjectSidebarSurfaceProps(repo, 'header')
  return {
    ...surface,
    style: {
      ...surface.style,
      paddingLeft:
        indentDepth === null
          ? WORKTREE_SECTION_HEADER_PADDING_LEFT
          : getProjectGroupHeaderPaddingLeft(indentDepth)
    },
    ...(onContextMenu ? { onContextMenu } : {})
  }
}
