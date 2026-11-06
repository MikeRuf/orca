import { normalizeRepoBadgeColor } from './repo-badge-color'

/** One sidebar surface of a project: its header row, or the workspace rows under it. */
export type RepoSidebarSurfaceStyle = {
  background?: string
  textColor?: string
  fontFamily?: string
  /** Pixels; the sidebar's own text is 13px. */
  fontSize?: number
}

export type RepoSidebarStyle = {
  header?: RepoSidebarSurfaceStyle
  rows?: RepoSidebarSurfaceStyle
}

export type RepoSidebarSurface = keyof RepoSidebarStyle

export const SIDEBAR_BASE_FONT_SIZE = 13
export const MIN_SIDEBAR_FONT_SIZE = 9
export const MAX_SIDEBAR_FONT_SIZE = 24
const MAX_FONT_FAMILY_LENGTH = 200

// Why: the family lands in an inline style; characters that end a declaration or rule must never pass.
const UNSAFE_FONT_FAMILY_CHARS = /[;{}<>\\]/

function sanitizeFontFamily(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const family = value.trim()
  if (!family || family.length > MAX_FONT_FAMILY_LENGTH || UNSAFE_FONT_FAMILY_CHARS.test(family)) {
    return undefined
  }
  return family
}

function sanitizeFontSize(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  return Math.min(MAX_SIDEBAR_FONT_SIZE, Math.max(MIN_SIDEBAR_FONT_SIZE, Math.round(value)))
}

export function sanitizeSidebarSurfaceStyle(value: unknown): RepoSidebarSurfaceStyle | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const raw = value as Record<string, unknown>
  const surface: RepoSidebarSurfaceStyle = {}
  const background = normalizeRepoBadgeColor(raw.background)
  const textColor = normalizeRepoBadgeColor(raw.textColor)
  const fontFamily = sanitizeFontFamily(raw.fontFamily)
  const fontSize = sanitizeFontSize(raw.fontSize)
  if (background) {
    surface.background = background
  }
  if (textColor) {
    surface.textColor = textColor
  }
  if (fontFamily) {
    surface.fontFamily = fontFamily
  }
  if (fontSize !== undefined) {
    surface.fontSize = fontSize
  }
  return Object.keys(surface).length > 0 ? surface : undefined
}

/** `null` clears the style; `undefined` means the value was malformed and the key should be dropped. */
export function sanitizeRepoSidebarStyle(value: unknown): RepoSidebarStyle | null | undefined {
  if (value === null) {
    return null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const raw = value as Record<string, unknown>
  const header = sanitizeSidebarSurfaceStyle(raw.header)
  const rows = sanitizeSidebarSurfaceStyle(raw.rows)
  if (!header && !rows) {
    return null
  }
  return { ...(header ? { header } : {}), ...(rows ? { rows } : {}) }
}
