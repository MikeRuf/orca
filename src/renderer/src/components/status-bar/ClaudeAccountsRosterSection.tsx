import { useMemo } from 'react'
import { toast } from 'sonner'
import { CLAUDE_SYSTEM_ACCOUNT_ID } from '../../../../shared/claude-accounts-overview'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'
import { useResetCountdownClock } from '@/hooks/useResetCountdownClock'
import { translate } from '@/i18n/i18n'
import { openDesktopStructuredSession } from '@/lib/agent-session/open/activate-ai-vault-structured-session'
import { signInToClaudeAccount } from '@/lib/provider-accounts/claude-account-sign-in'
import { handleRunningClaudeSessionsAfterSwitch } from '@/lib/provider-accounts/claude-account-switch-sessions'
import {
  fetchProviderAccountsSnapshot,
  getProviderAccountsOwnerKey,
  selectClaudeProviderAccount
} from '@/runtime/provider-accounts/observations/runtime-provider-accounts-client'
import { useAppStore } from '../../store'
import { getClaudeAccountErrorDescription } from '@/lib/provider-accounts/provider-account-action-errors'
import { buildClaudeAccountUsage, resolveClaudeChatAccountId } from './claude-account-usage-model'
import { ClaudeAccountsPanel } from './ClaudeAccountsPanel'
import { isOwnerNotSetUpPlaceholder } from './owner-usage-rate-limits'
import {
  repoRuntimeTarget,
  useClaudeAccountsHostLabel,
  useClaudeAccountsOverview
} from './use-claude-accounts-overview'

const HOST_TARGET = { runtime: 'host', wslDistro: null } as const

/** Puts the accounts panel in the Claude row's place, or leaves the roster as it was. */
export function ClaudeAccountsRosterSection({
  target,
  providers,
  renderRoster,
  onClose,
  onAddAccount,
  onManageAccounts
}: {
  target: RuntimeClientTarget
  providers: ProviderRateLimits[]
  renderRoster: (providers: ProviderRateLimits[]) => React.ReactNode
  onClose: () => void
  onAddAccount: () => void
  onManageAccounts: () => void
}): React.JSX.Element {
  const allRepos = useAppStore((state) => state.repos)
  const ownerKey = getProviderAccountsOwnerKey(target)
  const repos = useMemo(
    () =>
      allRepos.filter((repo) => getProviderAccountsOwnerKey(repoRuntimeTarget(repo)) === ownerKey),
    [allRepos, ownerKey]
  )
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const { overview, isRefreshing, refresh } = useClaudeAccountsOverview(target)
  const hostLabel = useClaudeAccountsHostLabel(target)
  const now = useResetCountdownClock([overview?.updatedAt])
  const accounts = useMemo(
    () => (overview ? buildClaudeAccountUsage(overview, repos) : []),
    [overview, repos]
  )
  const claudeRow = providers.find((provider) => provider.provider === 'claude')
  if (!overview || accounts.length === 0 || !claudeRow || isOwnerNotSetUpPlaceholder(claudeRow)) {
    return <div className="w-[360px]">{renderRoster(providers)}</div>
  }

  const setDefault = async (id: string): Promise<void> => {
    const accountId = id === CLAUDE_SYSTEM_ACCOUNT_ID ? null : id
    try {
      const before = (await fetchProviderAccountsSnapshot(target)).claude
      const after = await selectClaudeProviderAccount(target, { ...HOST_TARGET, accountId })
      void handleRunningClaudeSessionsAfterSwitch({
        owner: target,
        target: HOST_TARGET,
        before: { state: before, accountId: before.activeAccountId },
        after: { state: after, accountId }
      })
      await refresh()
    } catch (error) {
      toast.error(
        translate('components.claude-accounts.setDefaultFailed', 'Could not change the default.'),
        { description: getClaudeAccountErrorDescription(error) }
      )
    }
  }

  const openChat = (sessionId: string): void => {
    const chat = overview.chats.find((entry) => entry.sessionId === sessionId)
    if (!chat) {
      return
    }
    onClose()
    void openDesktopStructuredSession(
      {
        kind: 'history',
        structuredSession: { workspaceId: chat.workspaceId, sessionId },
        agent: 'claude'
      },
      target
    )
  }

  const signIn = (id: string): void => {
    if (target.kind === 'local') {
      void signInToClaudeAccount(id).then(() => refresh())
      return
    }
    // A remote host's sign-in runs through the Accounts page, which owns its code entry.
    onAddAccount()
  }

  return (
    <div className="w-[480px]">
      <ClaudeAccountsPanel
        hostLabel={hostLabel}
        accounts={accounts}
        viewedAccountId={
          activeWorktreeId
            ? resolveClaudeChatAccountId(overview, repos, activeWorktreeId, null)
            : null
        }
        updatedAgoMinutes={Math.max(0, Math.floor((now - overview.updatedAt) / 60_000))}
        isRefreshing={isRefreshing}
        onRefresh={() => void refresh()}
        onSetDefault={(id) => void setDefault(id)}
        onSignIn={signIn}
        onOpenChat={openChat}
        onAddAccount={onAddAccount}
        onManageAccounts={onManageAccounts}
      />
      {renderRoster(providers.filter((provider) => provider !== claudeRow))}
    </div>
  )
}
