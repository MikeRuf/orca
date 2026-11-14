import { useEffect, useRef, useState } from 'react'
import type { Repo } from '../../../../../../shared/repo-types'
import {
  sanitizeRepoSidebarStyle,
  type RepoSidebarStyle,
  type RepoSidebarSurface,
  type RepoSidebarSurfaceStyle
} from '../../../../../../shared/repo-sidebar-style'
import { Label } from '../../../ui/label'
import { translate } from '@/i18n/i18n'
import { SidebarFontSuggestions, SidebarSurfaceControls } from './SidebarSurfaceControls'
// Color drags fire per pointer move; batch saves so the sidebar follows without queueing a save per pixel.
const SAVE_BATCH_MS = 150

type RepositorySidebarStyleSectionProps = {
  repo: Repo
  updateRepo: (repoId: string, updates: Partial<Repo>) => void
}

export function RepositorySidebarStyleSection({
  repo,
  updateRepo
}: RepositorySidebarStyleSectionProps): React.JSX.Element {
  const saved = sanitizeRepoSidebarStyle(repo.sidebarStyle) ?? null
  // Edits show here at once; `pending` holds them until the saved repo catches up.
  const [pending, setPending] = useState<{ style: RepoSidebarStyle | null } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<{ repoId: string; style: RepoSidebarStyle | null } | null>(null)
  const updateRepoRef = useRef(updateRepo)
  updateRepoRef.current = updateRepo
  const style = (pending ? pending.style : saved) ?? {}

  useEffect(() => {
    if (pending && !timerRef.current && JSON.stringify(pending.style) === JSON.stringify(saved)) {
      setPending(null)
    }
  }, [pending, saved])

  useEffect(
    () => () => {
      // Closing the dialog mid-batch must still save the last edit.
      if (timerRef.current && latestRef.current) {
        clearTimeout(timerRef.current)
        const { repoId, style: last } = latestRef.current
        updateRepoRef.current(repoId, { sidebarStyle: last })
      }
    },
    []
  )

  const setSurface = (surface: RepoSidebarSurface, patch: Partial<RepoSidebarSurfaceStyle>) => {
    const nextSurface: RepoSidebarSurfaceStyle = { ...style[surface], ...patch }
    for (const key of Object.keys(nextSurface) as (keyof RepoSidebarSurfaceStyle)[]) {
      if (nextSurface[key] === undefined) {
        delete nextSurface[key]
      }
    }
    const next = sanitizeRepoSidebarStyle({ ...style, [surface]: nextSurface }) ?? null
    setPending({ style: next })
    latestRef.current = { repoId: repo.id, style: next }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      updateRepoRef.current(repo.id, { sidebarStyle: next })
    }, SAVE_BATCH_MS)
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <Label className="text-sm font-semibold">
        {translate(
          'auto.components.settings.RepositorySidebarStyleSection.title',
          'Sidebar appearance'
        )}
      </Label>
      <SidebarFontSuggestions />
      <SidebarSurfaceControls
        key={`${repo.id}:header`}
        title={translate(
          'auto.components.settings.RepositorySidebarStyleSection.headerTitle',
          'Project header row'
        )}
        surface={style.header ?? {}}
        onChange={(patch) => setSurface('header', patch)}
      />
      <SidebarSurfaceControls
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
