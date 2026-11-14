import { describe, expect, it } from 'vitest'
import type { ClaudeAccountsOverview } from '../../../../shared/claude-accounts-overview'
import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'
import { buildClaudeAccountUsage, resolveClaudeChatAccountId } from './claude-account-usage-model'

const limits = (session: number, weekly: number) =>
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the model reads only the two windows
  ({
    session: { usedPercent: session, windowMinutes: 300, resetsAt: null, resetDescription: null },
    weekly: { usedPercent: weekly, windowMinutes: 10080, resetsAt: null, resetDescription: null }
  }) as ProviderRateLimits

const account = (id: string, overrides = {}) => ({
  id,
  email: `${id}@example.com`,
  organizationName: null,
  isDefault: false,
  signedOut: false,
  limits: null,
  isFetching: false,
  ...overrides
})

const chat = (sessionId: string, accountId: string | null, sessionTokens: number) => ({
  sessionId,
  workspaceId: 'repo-a::/work/a',
  title: sessionId,
  working: false,
  accountId,
  sessionTokens,
  weeklyTokens: sessionTokens * 2
})

const project = (id: string, claudeAccountId: string | null) => ({
  id,
  displayName: id,
  claudeAccountId
})

describe('resolveClaudeChatAccountId', () => {
  const overview: ClaudeAccountsOverview = {
    accounts: [
      account('home', { isDefault: true }),
      account('work'),
      account('old', { signedOut: true })
    ],
    chats: [chat('launched', 'home', 10)],
    updatedAt: 0
  }

  it('prefers the account a launch recorded over the project account', () => {
    const projects = [project('repo-a', 'work')]
    expect(resolveClaudeChatAccountId(overview, projects, 'repo-a::/work/a', 'launched')).toBe(
      'home'
    )
  })

  it('uses the project account for a chat that has not launched', () => {
    const projects = [project('repo-a', 'work')]
    expect(resolveClaudeChatAccountId(overview, projects, 'repo-a::/work/a', 'new')).toBe('work')
  })

  it('falls back to the default when the project account is signed out', () => {
    const projects = [project('repo-a', 'old')]
    expect(resolveClaudeChatAccountId(overview, projects, 'repo-a::/work/a', 'new')).toBe('home')
  })
})

describe('buildClaudeAccountUsage', () => {
  it('scales chat tokens to the meters and leaves unlisted weekly use as other use', () => {
    const overview: ClaudeAccountsOverview = {
      accounts: [account('work', { isDefault: true, limits: limits(40, 20) })],
      chats: [
        chat('big', 'work', 300),
        chat('small', 'work', 100),
        { ...chat('last-week', 'work', 0), weeklyTokens: 200 }
      ],
      updatedAt: 0
    }
    const [usage] = buildClaudeAccountUsage(overview, [])
    expect(
      usage.chats.map(({ id, sessionPercent, weeklyPercent }) => [
        id,
        sessionPercent,
        weeklyPercent
      ])
    ).toEqual([
      ['big', 30, 12],
      ['small', 10, 4]
    ])
    expect(usage.otherUse).toEqual({ sessionPercent: 0, weeklyPercent: 4 })
  })
})
