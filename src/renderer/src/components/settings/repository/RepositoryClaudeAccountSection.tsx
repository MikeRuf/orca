import { useId, useMemo } from 'react'
import { CLAUDE_SYSTEM_ACCOUNT_ID } from '../../../../../shared/claude-accounts-overview'
import type { Repo } from '../../../../../shared/repo-types'
import { useTranslate } from '@/i18n/use-translate'
import {
  repoRuntimeTarget,
  useClaudeAccountsHostLabel,
  useClaudeAccountsOverview
} from '../../status-bar/use-claude-accounts-overview'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { searchKeywords } from '../search/settings-search-keywords'
import { SearchableSetting } from '../section-layout/SearchableSetting'

// Radix forbids empty item values.
const DEFAULT_VALUE = '__default_claude_account__'

type RepositoryClaudeAccountSectionProps = {
  repo: Repo
  updateRepo: (repoId: string, updates: { claudeAccountId?: string | null }) => unknown
  forceVisible?: boolean
}

export function RepositoryClaudeAccountSection({
  repo,
  updateRepo,
  forceVisible
}: RepositoryClaudeAccountSectionProps): React.JSX.Element {
  const t = useTranslate()
  const selectLabelId = useId()
  const target = useMemo(() => repoRuntimeTarget(repo), [repo])
  const { overview } = useClaudeAccountsOverview(target)
  const hostLabel = useClaudeAccountsHostLabel(target)
  const accounts = (overview?.accounts ?? []).filter(({ id }) => id !== CLAUDE_SYSTEM_ACCOUNT_ID)
  const assigned = repo.claudeAccountId ?? null
  const title = t('components.claude-accounts.projectTitle', 'Claude Account')
  return (
    <SearchableSetting
      title={title}
      description={t(
        'components.claude-accounts.projectDescription',
        'Run this project’s Claude chats on a specific account.'
      )}
      keywords={searchKeywords([repo.displayName, 'claude', 'claude account', 'login', 'usage'])}
      className="space-y-3"
      forceVisible={forceVisible}
    >
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-xs text-muted-foreground">
          {t(
            'components.claude-accounts.projectLongDescription',
            'New chats start on this account, and resumed chats move to it. If it is signed out, chats use the default account.'
          )}
        </p>
      </div>
      <div className="space-y-1.5">
        <span id={selectLabelId} className="text-xs text-muted-foreground">
          {t('components.claude-accounts.projectSelectLabelOnHost', 'Account on {{host}}', {
            host: hostLabel
          })}
        </span>
        <Select
          value={assigned ?? DEFAULT_VALUE}
          disabled={!overview}
          onValueChange={(value) => {
            const next = value === DEFAULT_VALUE ? null : value
            if (next !== assigned) {
              void updateRepo(repo.id, { claudeAccountId: next })
            }
          }}
        >
          <SelectTrigger size="sm" className="w-full" aria-labelledby={selectLabelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>
              {t('components.claude-accounts.useDefault', 'Use default account')}
            </SelectItem>
            {assigned && overview && !accounts.some(({ id }) => id === assigned) ? (
              <SelectItem value={assigned} disabled>
                {t('components.claude-accounts.removedAccount', 'Removed account')}
              </SelectItem>
            ) : null}
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.signedOut
                  ? t('components.claude-accounts.signedOutOption', '{{email}} (signed out)', {
                      email: account.email ?? account.id
                    })
                  : (account.email ?? account.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SearchableSetting>
  )
}
