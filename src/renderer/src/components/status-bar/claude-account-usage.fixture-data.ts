import type { ProviderRateLimits } from '../../../../shared/rate-limit-types'
import type { ClaudeAccountUsage } from './claude-account-usage-view'

const HOUR_MS = 3_600_000

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
    {
      id: 'c1',
      title: 'Per-project accounts',
      working: true,
      sessionPercent: 14,
      weeklyPercent: 4
    },
    { id: 'c2', title: 'Director handoff', working: true, sessionPercent: 11, weeklyPercent: 3 },
    { id: 'c3', title: 'Fix image limit', working: false, sessionPercent: 6, weeklyPercent: 2 }
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
  chats: [
    { id: 'c4', title: 'Itinerary import', working: false, sessionPercent: 60, weeklyPercent: 21 }
  ],
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
