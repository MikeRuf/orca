import { translate } from '@/i18n/i18n'
import { setFavoriteTabStyle, useTabShortcuts, type TabShortcut } from '@/lib/tab-shortcuts-store'
import type { RepoSidebarSurfaceStyle } from '../../../../shared/repo-sidebar-style'
import {
  SidebarFontSuggestions,
  SidebarSurfaceControls
} from '../settings/repository/identity/SidebarSurfaceControls'
import {
  SidebarAppearanceDialog,
  type SidebarAppearanceDialogAnchor
} from './SidebarAppearanceDialog'

export function FavoriteTabAppearanceDialog({
  shortcut,
  name,
  onClose,
  anchor
}: {
  shortcut: Pick<TabShortcut, 'worktreeId' | 'tabId'>
  name: string
  onClose: () => void
  anchor: SidebarAppearanceDialogAnchor
}): React.JSX.Element {
  const { favorites } = useTabShortcuts()
  const style =
    favorites.find((row) => row.worktreeId === shortcut.worktreeId && row.tabId === shortcut.tabId)
      ?.style ?? {}
  const applyPatch = (patch: Partial<RepoSidebarSurfaceStyle>): void =>
    setFavoriteTabStyle(shortcut, { ...style, ...patch })
  return (
    <SidebarAppearanceDialog
      open
      onOpenChange={(open) => !open && onClose()}
      anchor={anchor}
      title={translate(
        'auto.components.sidebar.ProjectAppearanceDialog.title',
        'Appearance of {{value0}}',
        { value0: name }
      )}
      description={translate(
        'auto.components.tabShortcuts.appearanceDescription',
        'Background and font of this favorite in the sidebar. Changes apply as you make them.'
      )}
    >
      <SidebarFontSuggestions />
      <SidebarSurfaceControls
        title={translate('auto.components.tabShortcuts.appearanceRow', 'Favorite row')}
        surface={style}
        onChange={applyPatch}
      />
    </SidebarAppearanceDialog>
  )
}
