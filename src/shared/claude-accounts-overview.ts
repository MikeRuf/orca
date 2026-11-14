import type { ProviderRateLimits } from './rate-limit-types'

/** Stands in for the login Claude uses with no managed account selected. */
export const CLAUDE_SYSTEM_ACCOUNT_ID = 'system'

export type ClaudeOverviewAccount = {
  id: string
  email: string | null
  organizationName: string | null
  /** Used by every project with no account of its own. */
  isDefault: boolean
  signedOut: boolean
  limits: ProviderRateLimits | null
  isFetching: boolean
}

export type ClaudeOverviewChat = {
  sessionId: string
  workspaceId: string
  title: string
  working: boolean
  /** Null until a launch recorded its account. */
  accountId: string | null
  sessionTokens: number
  weeklyTokens: number
}

export type ClaudeAccountsOverview = {
  accounts: ClaudeOverviewAccount[]
  chats: ClaudeOverviewChat[]
  updatedAt: number
}

/** A chat's points of a window's used percent; null until any chat on the account has tokens. */
export function claudeChatWindowShare(
  usedPercent: number | null,
  chatTokens: number,
  accountTokens: number
): number | null {
  if (usedPercent === null || accountTokens <= 0) {
    return null
  }
  return (usedPercent * chatTokens) / accountTokens
}
