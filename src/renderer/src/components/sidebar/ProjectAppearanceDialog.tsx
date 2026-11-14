import { useCallback } from 'react'
import type { Repo } from '../../../../shared/repo-types'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { RepositoryIconPicker } from '../settings/repository/identity/RepositoryIconPicker'
import {
  SidebarAppearanceDialog,
  type SidebarAppearanceDialogAnchor
} from './SidebarAppearanceDialog'

export type ProjectAppearanceDialogAnchor = SidebarAppearanceDialogAnchor

export function ProjectAppearanceDialog({
  repo,
  open,
  onOpenChange,
  anchor
}: {
  repo: Repo
  open: boolean
  onOpenChange: (open: boolean) => void
  anchor: ProjectAppearanceDialogAnchor | null
}): React.JSX.Element {
  const updateRepo = useAppStore((state) => state.updateRepo)
  const hostId = getRepoExecutionHostId(repo)
  // Route to this row's own host: the same repo id can be registered on several hosts.
  const updateThisRepo = useCallback(
    (repoId: string, updates: Partial<Repo>) => void updateRepo(repoId, updates, { hostId }),
    [updateRepo, hostId]
  )
  return (
    <SidebarAppearanceDialog
      open={open}
      onOpenChange={onOpenChange}
      anchor={anchor}
      title={translate(
        'auto.components.sidebar.ProjectAppearanceDialog.title',
        'Appearance of {{value0}}',
        { value0: repo.displayName }
      )}
      description={translate(
        'auto.components.sidebar.ProjectAppearanceDialog.description',
        'Icon, color, background and font in the sidebar. Changes apply as you make them.'
      )}
    >
      <RepositoryIconPicker repo={repo} updateRepo={updateThisRepo} />
    </SidebarAppearanceDialog>
  )
}
