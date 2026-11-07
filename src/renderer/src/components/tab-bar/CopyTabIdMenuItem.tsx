import { toast } from 'sonner'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { describeTabById } from '@/lib/tab-shortcut-resolution'
import { addFavoriteTab, isFavoriteTab, removeFavoriteTab } from '@/lib/tab-shortcuts-store'

export function CopyTabIdMenuItem({
  unifiedTabId,
  menuKind = 'dropdown'
}: {
  unifiedTabId: string
  menuKind?: 'dropdown' | 'context'
}): React.JSX.Element {
  const Item = menuKind === 'context' ? ContextMenuItem : DropdownMenuItem
  const copyTabId = async (): Promise<void> => {
    try {
      await window.api.ui.writeClipboardText(`orcaTabId: ${unifiedTabId}`)
      toast.success(translate('components.tab.bar.CopyTabIdMenuItem.copied', 'Tab ID copied'))
    } catch {
      toast.error(translate('components.tab.bar.CopyTabIdMenuItem.failed', 'Could not copy tab ID'))
    }
  }

  // Every tab menu (chat, terminal, editor, browser) shows this item, so Favorites rides along here.
  const favoriteTarget = describeTabById(useAppStore.getState(), unifiedTabId)
  const favorite = favoriteTarget ? isFavoriteTab(favoriteTarget) : false
  return (
    <>
      {favoriteTarget ? (
        <Item
          inset
          onSelect={() =>
            favorite ? removeFavoriteTab(favoriteTarget) : addFavoriteTab(favoriteTarget)
          }
        >
          {favorite
            ? translate('auto.components.tabShortcuts.removeFavorite', 'Remove from Favorites')
            : translate('auto.components.tabShortcuts.addFavorite', 'Add to Favorites')}
        </Item>
      ) : null}
      <Item inset onSelect={() => void copyTabId()}>
        {translate('components.tab.bar.CopyTabIdMenuItem.copy', 'Copy Tab ID')}
      </Item>
    </>
  )
}
