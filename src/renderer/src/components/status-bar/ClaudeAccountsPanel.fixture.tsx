import { defineFixture } from '../../component-fixtures/component-fixture'
import { ClaudeAccountsPanel } from './ClaudeAccountsPanel'
import { personalAccount, signedOutAccount, workAccount } from './claude-account-usage.fixture-data'

const noop = (): void => {}

export const allAccounts = defineFixture({
  width: 480,
  render: () => (
    <div className="bg-background p-3">
      <div className="w-fit rounded-md border border-border bg-popover">
        <ClaudeAccountsPanel
          hostLabel="condo1"
          accounts={[workAccount, personalAccount, signedOutAccount]}
          viewedAccountId="work"
          updatedAgoMinutes={2}
          isRefreshing={false}
          onRefresh={noop}
          onSetDefault={noop}
          onSignIn={noop}
          onOpenChat={noop}
          onAddAccount={noop}
          onManageAccounts={noop}
        />
      </div>
    </div>
  )
})
