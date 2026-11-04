import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { Repo } from '../../../../../../shared/repo-types'
import {
  MAX_SIDEBAR_FONT_SIZE,
  MIN_SIDEBAR_FONT_SIZE,
  SIDEBAR_BASE_FONT_SIZE,
  sanitizeRepoSidebarStyle,
  type RepoSidebarSurface,
  type RepoSidebarSurfaceStyle
} from '../../../../../../shared/repo-sidebar-style'
import { DEFAULT_REPO_BADGE_COLOR } from '../../../../../../shared/repo-badge-color'
import { Button } from '../../../ui/button'
import { ColorPicker } from '../../../ui/color-picker'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { translate } from '@/i18n/i18n'

// Generic families resolve on every platform; named ones fall back to the default when missing.
const FONT_SUGGESTIONS = [
  'system-ui',
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Georgia',
  'Verdana',
  'Courier New'
]
const FONT_LIST_ID = 'repository-sidebar-style-fonts'

type RepositorySidebarStyleSectionProps = {
  repo: Repo
  updateRepo: (repoId: string, updates: Partial<Repo>) => void
}

export function RepositorySidebarStyleSection({
  repo,
  updateRepo
}: RepositorySidebarStyleSectionProps): React.JSX.Element {
  const style = sanitizeRepoSidebarStyle(repo.sidebarStyle) ?? {}

  const setSurface = (surface: RepoSidebarSurface, patch: Partial<RepoSidebarSurfaceStyle>) => {
    const nextSurface: RepoSidebarSurfaceStyle = { ...style[surface], ...patch }
    for (const key of Object.keys(nextSurface) as (keyof RepoSidebarSurfaceStyle)[]) {
      if (nextSurface[key] === undefined) {
        delete nextSurface[key]
      }
    }
    updateRepo(repo.id, {
      sidebarStyle: sanitizeRepoSidebarStyle({ ...style, [surface]: nextSurface }) ?? null
    })
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <Label className="text-sm font-semibold">
        {translate(
          'auto.components.settings.RepositorySidebarStyleSection.title',
          'Sidebar appearance'
        )}
      </Label>
      <datalist id={FONT_LIST_ID}>
        {FONT_SUGGESTIONS.map((font) => (
          <option key={font} value={font} />
        ))}
      </datalist>
      <SurfaceControls
        key={`${repo.id}:header`}
        title={translate(
          'auto.components.settings.RepositorySidebarStyleSection.headerTitle',
          'Project header row'
        )}
        surface={style.header ?? {}}
        onChange={(patch) => setSurface('header', patch)}
      />
      <SurfaceControls
        key={`${repo.id}:rows`}
        title={translate(
          'auto.components.settings.RepositorySidebarStyleSection.rowsTitle',
          'Workspace rows under it'
        )}
        surface={style.rows ?? {}}
        onChange={(patch) => setSurface('rows', patch)}
      />
    </div>
  )
}

function SurfaceControls({
  title,
  surface,
  onChange
}: {
  title: string
  surface: RepoSidebarSurfaceStyle
  onChange: (patch: Partial<RepoSidebarSurfaceStyle>) => void
}): React.JSX.Element {
  const isCustomized = Object.keys(surface).length > 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{title}</Label>
        {isCustomized ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                background: undefined,
                textColor: undefined,
                fontFamily: undefined,
                fontSize: undefined
              })
            }
          >
            <RotateCcw className="size-3.5" />
            {translate('auto.components.settings.RepositorySidebarStyleSection.reset', 'Reset')}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
        <ColorRow
          label={translate(
            'auto.components.settings.RepositorySidebarStyleSection.background',
            'Background'
          )}
          value={surface.background}
          onChange={(background) => onChange({ background })}
        />
        <ColorRow
          label={translate(
            'auto.components.settings.RepositorySidebarStyleSection.textColor',
            'Text color'
          )}
          value={surface.textColor}
          onChange={(textColor) => onChange({ textColor })}
        />
        <FontFamilyRow
          value={surface.fontFamily}
          onCommit={(fontFamily) => onChange({ fontFamily })}
        />
        <FontSizeRow value={surface.fontSize} onCommit={(fontSize) => onChange({ fontSize })} />
      </div>
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange
}: {
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}): React.JSX.Element {
  return (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <ColorPicker
          value={value ?? DEFAULT_REPO_BADGE_COLOR}
          onChange={onChange}
          label={label}
          selected={value !== undefined}
          triggerLabel={
            value === undefined
              ? translate(
                  'auto.components.settings.RepositorySidebarStyleSection.defaultColor',
                  'Default'
                )
              : undefined
          }
          showHexInTrigger={value !== undefined}
          className="h-7 px-2"
        />
        {value !== undefined ? (
          <ClearButton label={label} onClear={() => onChange(undefined)} />
        ) : null}
      </div>
    </>
  )
}

function FontFamilyRow({
  value,
  onCommit
}: {
  value: string | undefined
  onCommit: (value: string | undefined) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  const label = translate('auto.components.settings.RepositorySidebarStyleSection.font', 'Font')
  const commit = () => {
    if (draft === null) {
      return
    }
    setDraft(null)
    const next = draft.trim() || undefined
    if (next !== value) {
      onCommit(next)
    }
  }
  return (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          list={FONT_LIST_ID}
          aria-label={label}
          value={draft ?? value ?? ''}
          placeholder={translate(
            'auto.components.settings.RepositorySidebarStyleSection.fontPlaceholder',
            'Default'
          )}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit()
            }
          }}
          className="h-7 max-w-56 text-sm"
          style={value ? { fontFamily: value } : undefined}
        />
        {value !== undefined ? (
          <ClearButton label={label} onClear={() => onCommit(undefined)} />
        ) : null}
      </div>
    </>
  )
}

function FontSizeRow({
  value,
  onCommit
}: {
  value: number | undefined
  onCommit: (value: number | undefined) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  const label = translate('auto.components.settings.RepositorySidebarStyleSection.size', 'Size')
  const commit = () => {
    if (draft === null) {
      return
    }
    setDraft(null)
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) ? parsed : undefined
    if (next !== value) {
      onCommit(next)
    }
  }
  return (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_SIDEBAR_FONT_SIZE}
          max={MAX_SIDEBAR_FONT_SIZE}
          aria-label={label}
          value={draft ?? (value !== undefined ? String(value) : '')}
          placeholder={String(SIDEBAR_BASE_FONT_SIZE)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit()
            }
          }}
          className="h-7 w-20 text-sm"
        />
        <span className="text-xs text-muted-foreground">px</span>
        {value !== undefined ? (
          <ClearButton label={label} onClear={() => onCommit(undefined)} />
        ) : null}
      </div>
    </>
  )
}

function ClearButton({
  label,
  onClear
}: {
  label: string
  onClear: () => void
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={translate(
        'auto.components.settings.RepositorySidebarStyleSection.clear',
        'Use default {{value0}}',
        { value0: label.toLowerCase() }
      )}
      onClick={onClear}
    >
      <RotateCcw className="size-3.5" />
    </Button>
  )
}
