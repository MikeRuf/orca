import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'

/** Share of a window's used percent, in the same points as the window; null until tokens are known. */
export type ClaudeAccountUsageShare = {
  sessionPercent: number | null
  weeklyPercent: number | null
}

export type ClaudeAccountChatUsage = ClaudeAccountUsageShare & {
  id: string
  title: string
  working: boolean
}

export type ClaudeAccountUsage = {
  id: string
  name: string
  email: string | null
  /** Account for projects with no account of their own. */
  isDefault: boolean
  signedOut: boolean
  limits: ProviderRateLimits | null
  isFetching: boolean
  projects: string[]
  chats: ClaudeAccountChatUsage[]
  /** Use outside the listed chats, so the rows add up to the account's meters. */
  otherUse: ClaudeAccountUsageShare | null
}

export type ClaudeAccountUsageTone = 'normal' | 'warning' | 'urgent'

const USAGE_TONE_WARNING_PERCENT = 80
const USAGE_TONE_URGENT_PERCENT = 95

export function claudeAccountUsageTone(usedPercent: number): ClaudeAccountUsageTone {
  if (usedPercent >= USAGE_TONE_URGENT_PERCENT) {
    return 'urgent'
  }
  return usedPercent >= USAGE_TONE_WARNING_PERCENT ? 'warning' : 'normal'
}

export const CLAUDE_ACCOUNT_USAGE_TEXT_CLASS: Record<ClaudeAccountUsageTone, string> = {
  normal: '',
  warning: 'text-status-warning-text',
  urgent: 'text-destructive'
}

export const CLAUDE_ACCOUNT_USAGE_BAR_CLASS: Record<ClaudeAccountUsageTone, string> = {
  normal: 'bg-muted-foreground/40',
  warning: 'bg-status-warning',
  urgent: 'bg-destructive'
}
