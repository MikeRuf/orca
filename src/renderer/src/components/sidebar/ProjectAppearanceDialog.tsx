import { useCallback } from 'react'
import type { Repo } from '../../../../shared/repo-types'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { RepositoryIconPicker } from '../settings/repository/identity/RepositoryIconPicker'

/** Viewport x of the sidebar's right edge when the dialog opened; the dialog sits just past it. */
export type ProjectAppearanceDialogAnchor = { sidebarRight: number }

const SIDEBAR_GAP_PX = 12
const TOP_PX = 48

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Clear overlay, and a place right beside the sidebar, keep the rows in view so each change previews live.
        overlayClassName="bg-transparent"
        scrollable
        className="sm:max-w-[560px]"
        style={
          anchor
            ? {
                left: anchor.sidebarRight + SIDEBAR_GAP_PX,
                top: TOP_PX,
                translate: 'none',
                transform: 'none',
                maxHeight: `calc(100vh - ${TOP_PX + 16}px)`
              }
            : undefined
        }
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
