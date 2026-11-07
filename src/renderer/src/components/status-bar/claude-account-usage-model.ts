import {
  CLAUDE_SYSTEM_ACCOUNT_ID,
  claudeChatWindowShare,
  type ClaudeAccountsOverview,
  type ClaudeOverviewAccount,
  type ClaudeOverviewChat
} from '../../../../shared/claude-accounts-overview'
import type { Repo } from '../../../../shared/repo-types'
import { getRepoIdFromWorktreeId } from '../../../../shared/worktree/id'
import { translate } from '@/i18n/i18n'
import type { ClaudeAccountChatUsage, ClaudeAccountUsage } from './claude-account-usage-view'

type ProjectAccounts = Pick<Repo, 'id' | 'displayName' | 'claudeAccountId'>

function usableProjectAccount(
  overview: ClaudeAccountsOverview,
  project: ProjectAccounts | undefined
): string | null {
  const assigned = overview.accounts.find((account) => account.id === project?.claudeAccountId)
  return assigned && !assigned.signedOut ? assigned.id : null
}

function defaultAccountId(overview: ClaudeAccountsOverview): string | null {
  return (
    (overview.accounts.find((account) => account.isDefault) ?? overview.accounts[0])?.id ?? null
  )
}

/** Mirrors launch routing: the receipt wins, then a signed-in project account, then the default. */
export function resolveClaudeChatAccountId(
  overview: ClaudeAccountsOverview,
  projects: readonly ProjectAccounts[],
  worktreeId: string,
  sessionId: string | null
): string | null {
  const launched = overview.chats.find((chat) => chat.sessionId === sessionId)?.accountId
  if (launched) {
    return launched
  }
  const repoId = getRepoIdFromWorktreeId(worktreeId)
  const project = projects.find((candidate) => candidate.id === repoId)
  return usableProjectAccount(overview, project) ?? defaultAccountId(overview)
}

function accountName(
  account: ClaudeOverviewAccount,
  accounts: readonly ClaudeOverviewAccount[]
): string {
  const short = account.email?.split('@')[0]
  if (!short) {
    return account.id === CLAUDE_SYSTEM_ACCOUNT_ID
      ? translate('components.claude-accounts.systemDefault', 'System default')
      : account.id
  }
  const repeated = accounts.some(
    (other) => other.id !== account.id && other.email?.split('@')[0] === short
  )
  return repeated ? (account.email ?? short) : short
}

function chatRow(
  chat: ClaudeOverviewChat,
  sessionUsed: number | null,
  weeklyUsed: number | null,
  chats: readonly ClaudeOverviewChat[]
): ClaudeAccountChatUsage {
  const sum = (read: (entry: ClaudeOverviewChat) => number) =>
    chats.reduce((total, entry) => total + read(entry), 0)
  return {
    id: chat.sessionId,
    title: chat.title || translate('components.claude-accounts.untitledChat', 'Untitled chat'),
    working: chat.working,
    sessionPercent: claudeChatWindowShare(
      sessionUsed,
      chat.sessionTokens,
      sum((entry) => entry.sessionTokens)
    ),
    weeklyPercent: claudeChatWindowShare(
      weeklyUsed,
      chat.weeklyTokens,
      sum((entry) => entry.weeklyTokens)
    )
  }
}

function remainder(used: number | null, rows: (number | null)[]): number | null {
  if (used === null) {
    return null
  }
  return Math.max(
    0,
    rows.reduce<number>((left, row) => left - (row ?? 0), used)
  )
}

/** The rows the label and the panel show, shares scaled to each account's meters. */
export function buildClaudeAccountUsage(
  overview: ClaudeAccountsOverview,
  projects: readonly ProjectAccounts[]
): ClaudeAccountUsage[] {
  const fallback = defaultAccountId(overview)
  const projectAccount = (project: ProjectAccounts) =>
    usableProjectAccount(overview, project) ?? fallback
  return overview.accounts.map((account) => {
    const chats = overview.chats.filter(
      (chat) =>
        resolveClaudeChatAccountId(overview, projects, chat.workspaceId, chat.sessionId) ===
        account.id
    )
    const sessionUsed = account.limits?.session?.usedPercent ?? null
    const weeklyUsed = account.limits?.weekly?.usedPercent ?? null
    const listed = chats
      .filter((chat) => chat.working || chat.sessionTokens > 0)
      .sort((a, b) => b.sessionTokens - a.sessionTokens || b.weeklyTokens - a.weeklyTokens)
      .map((chat) => chatRow(chat, sessionUsed, weeklyUsed, chats))
    return {
      id: account.id,
      name: accountName(account, overview.accounts),
      email: account.email,
      isDefault: account.isDefault,
      signedOut: account.signedOut,
      limits: account.limits,
      isFetching: account.isFetching,
      projects: projects
        .filter((project) => projectAccount(project) === account.id)
        .map((project) => project.displayName),
      chats: listed,
      otherUse:
        sessionUsed === null && weeklyUsed === null
          ? null
          : {
              sessionPercent: remainder(
                sessionUsed,
                listed.map((chat) => chat.sessionPercent)
              ),
              weeklyPercent: remainder(
                weeklyUsed,
                listed.map((chat) => chat.weeklyPercent)
              )
            }
    }
  })
}
