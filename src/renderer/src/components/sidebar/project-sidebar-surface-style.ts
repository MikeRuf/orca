import type React from 'react'
import {
  SIDEBAR_BASE_FONT_SIZE,
  sanitizeRepoSidebarStyle,
  type RepoSidebarSurface,
  type RepoSidebarSurfaceStyle
} from '../../../../shared/repo-sidebar-style'
import type { Repo } from '../../../../shared/repo-types'

export type ProjectSidebarSurfaceProps = {
  style?: React.CSSProperties
  'data-project-sidebar-font'?: ''
  'data-project-sidebar-text'?: ''
  'data-project-sidebar-bg'?: ''
}

const NO_SURFACE_PROPS: ProjectSidebarSurfaceProps = {}

/** Props that paint one project's header row or workspace rows with the project's sidebar style. */
export function getProjectSidebarSurfaceProps(
  repo: Pick<Repo, 'sidebarStyle'> | undefined,
  surface: RepoSidebarSurface
): ProjectSidebarSurfaceProps {
  // Re-sanitize: the values reach inline styles, and a hand-edited profile skips the write path.
  return getSidebarSurfaceProps(sanitizeRepoSidebarStyle(repo?.sidebarStyle)?.[surface])
}

/** Props that paint any sidebar row; `style` must already be sanitized. */
export function getSidebarSurfaceProps(
  style: RepoSidebarSurfaceStyle | undefined
): ProjectSidebarSurfaceProps {
  if (!style) {
    return NO_SURFACE_PROPS
  }
  const css: React.CSSProperties & Record<`--${string}`, string> = {}
  if (style.background) {
    css.backgroundColor = style.background
    // Overlays inside the row (the header's action backdrop) paint with the row's own color.
    css['--project-sidebar-bg'] = style.background
  }
  if (style.fontFamily) {
    css['--project-sidebar-font'] = style.fontFamily
  }
  if (style.textColor) {
    css['--project-sidebar-text'] = style.textColor
  }
  if (style.fontSize !== undefined && style.fontSize !== SIDEBAR_BASE_FONT_SIZE) {
    // Why: rows hard-code text sizes per element; zoom scales them, their icons and the row height together.
    css.zoom = style.fontSize / SIDEBAR_BASE_FONT_SIZE
  }
  return {
    style: css,
    ...(style.fontFamily ? { 'data-project-sidebar-font': '' as const } : {}),
    ...(style.textColor ? { 'data-project-sidebar-text': '' as const } : {}),
    ...(style.background ? { 'data-project-sidebar-bg': '' as const } : {})
  }
}
