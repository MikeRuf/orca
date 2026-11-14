import type { ClaudeAccountsOverview } from '../../../../../shared/claude-accounts-overview'
import { withTimeout } from '../../../../../shared/promise-timeout-fallback'
import { ClaudeOverviewParams } from '../../../../../shared/rpc-contract/accounts/accounts-params'
import { buildClaudeAccountsOverview } from '../../../../claude-accounts/claude-accounts-overview'
import { getStructuredAgentSessionHost } from '../../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { defineMethod } from '../../core'

const USAGE_REFRESH_WAIT_MS = 10_000

export const CLAUDE_ACCOUNTS_OVERVIEW_METHOD = defineMethod({
  name: 'accounts.claudeOverview',
  permission: 'workspace',
  params: ClaudeOverviewParams,
  handler: async ({ refreshUsage }, { runtime }): Promise<ClaudeAccountsOverview> => {
    const rateLimits = runtime.getUsageRateLimits()
    if (refreshUsage) {
      await withTimeout(
        rateLimits?.fetchInactiveClaudeAccountsOnOpen() ?? Promise.resolve(),
        USAGE_REFRESH_WAIT_MS,
        undefined
      )
    }
    const snapshot = runtime.getAccountsSnapshot()
    return buildClaudeAccountsOverview({
      claude: snapshot.claude,
      rateLimits: snapshot.rateLimits,
      records: getStructuredAgentSessionHost()?.deps.store.listRecords() ?? [],
      now: Date.now()
    })
  }
})
