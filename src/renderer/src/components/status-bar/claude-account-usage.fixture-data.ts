import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'
import type { ClaudeAccountUsage } from './claude-account-usage-view'

const HOUR_MS = 3_600_000

const fixtureChat = (
  id: string,
  title: string,
  working: boolean,
  sessionPercent: number,
  weeklyPercent: number
): ClaudeAccountUsage['chats'][number] => ({ id, title, working, sessionPercent, weeklyPercent })

export function fixtureLimits(session: number, weekly: number): ProviderRateLimits {
  return {
    provider: 'claude',
    session: {
      usedPercent: session,
      windowMinutes: 300,
      resetsAt: Date.now() + 2.2 * HOUR_MS,
      resetDescription: null
    },
    weekly: {
      usedPercent: weekly,
      windowMinutes: 10_080,
      resetsAt: Date.now() + 75 * HOUR_MS,
      resetDescription: null
    },
    updatedAt: 0,
    error: null,
    status: 'ok'
  }
}

export const workAccount: ClaudeAccountUsage = {
  id: 'work',
  name: 'Work',
  email: 'work@example.com',
  isDefault: true,
  signedOut: false,
  limits: fixtureLimits(42, 18),
  isFetching: false,
  projects: ['orca', 'h2yo', 'common'],
  chats: [
    fixtureChat('c1', 'Per-project accounts', true, 14, 4),
    fixtureChat('c2', 'Director handoff', true, 11, 3),
    fixtureChat('c3', 'Fix image limit', false, 6, 2)
  ],
  otherUse: { sessionPercent: 11, weeklyPercent: 9 }
}

export const personalAccount: ClaudeAccountUsage = {
  id: 'personal',
  name: 'Personal',
  email: 'personal@example.com',
  isDefault: false,
  signedOut: false,
  limits: fixtureLimits(86, 97),
  isFetching: false,
  projects: ['travel'],
  chats: [fixtureChat('c4', 'Itinerary import', false, 60, 21)],
  otherUse: { sessionPercent: 26, weeklyPercent: 76 }
}

export const signedOutAccount: ClaudeAccountUsage = {
  id: 'spare',
  name: 'Spare',
  email: 'spare@example.com',
  isDefault: false,
  signedOut: true,
  limits: null,
  isFetching: false,
  projects: [],
  chats: [],
  otherUse: null
}
