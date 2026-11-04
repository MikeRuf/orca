import { useCallback } from 'react'
import type { Repo } from '../../../../shared/repo-types'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { RepositoryIconPicker } from '../settings/repository/identity/RepositoryIconPicker'

export function ProjectAppearanceDialog({
  repo,
  open,
  onOpenChange
}: {
  repo: Repo
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const updateRepo = useAppStore((state) => state.updateRepo)
  const hostId = getRepoExecutionHostId(repo)
  // Route to this row's own host: the same repo id can be registered on several hosts.
  const updateThisRepo = useCallback(
    (repoId: string, updates: Partial<Repo>) => void updateRepo(repoId, updates, { hostId }),
    [updateRepo, hostId]
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Clear overlay and a right-hand position keep the sidebar visible, so each change previews live.
        overlayClassName="bg-transparent"
        scrollable
        className="sm:max-w-[560px] sm:left-auto sm:right-8 sm:translate-x-0"
      >
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.components.sidebar.ProjectAppearanceDialog.title',
              'Appearance of {{value0}}',
              {
                value0: repo.displayName
              }
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.sidebar.ProjectAppearanceDialog.description',
              'Icon, color, background and font in the sidebar. Changes apply as you make them.'
            )}
          </DialogDescription>
        </DialogHeader>
        <RepositoryIconPicker repo={repo} updateRepo={updateThisRepo} />
      </DialogContent>
    </Dialog>
  )
}
