import { defineFixture } from '../../component-fixtures/component-fixture'
import { FavoriteTabAppearanceDialog } from './FavoriteTabAppearanceDialog'

export const open = defineFixture({
  width: 900,
  render: () => (
    <div className="h-[560px]">
      <FavoriteTabAppearanceDialog
        shortcut={{ worktreeId: 'none', tabId: 'none' }}
        name="travel_agent"
        onClose={() => {}}
        anchor={{ sidebarRight: 280 }}
      />
    </div>
  )
})
