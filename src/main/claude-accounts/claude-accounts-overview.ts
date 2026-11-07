import { join } from 'node:path'
import { acquiredAgentSessionAccount } from '../../shared/agent-session/lifecycle/agent-session-acquired-account'
import type { AgentSessionRecord } from '../../shared/agent-session/lifecycle/agent-session-record'
import {
  CLAUDE_SYSTEM_ACCOUNT_ID,
  type ClaudeAccountsOverview,
  type ClaudeOverviewAccount,
  type ClaudeOverviewChat
} from '../../shared/claude-accounts-overview'
import type { ClaudeRateLimitAccountsState } from '../../shared/managed-account-types'
import type { ProviderRateLimits, RateLimitState } from '../../shared/rate-limit-types'
import { resolveSessionFilePath } from '../native-chat/session-file-resolver'
import { readClaudeChatWindowTokens, type ClaudeChatWindows } from './claude-chat-transcript-tokens'

const SESSION_WINDOW_MS = 5 * 60 * 60 * 1000
const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function buildAccounts(
  claude: ClaudeRateLimitAccountsState,
  rateLimits: RateLimitState | undefined,
  usesSystem: boolean
): ClaudeOverviewAccount[] {
  const activeId = claude.activeAccountId
  const managed = claude.accounts.map((account): ClaudeOverviewAccount => {
    const inactive = rateLimits?.inactiveClaudeAccounts.find(
      (entry) => entry.accountId === account.id
    )
    const active = account.id === activeId
    return {
      id: account.id,
      email: account.email,
      organizationName: account.organizationName ?? null,
      isDefault: active,
      signedOut: account.needsSignIn === true,
      limits: (active ? rateLimits?.claude : inactive?.rateLimits) ?? null,
      isFetching: inactive?.isFetching ?? false
    }
  })
  if (activeId !== null && !usesSystem) {
    return managed
  }
  const system: ClaudeOverviewAccount = {
    id: CLAUDE_SYSTEM_ACCOUNT_ID,
    email: claude.systemDefaultEmail ?? null,
    organizationName: null,
    isDefault: activeId === null,
    signedOut: false,
    // Only the selected login is read; System default has no reading while another is selected.
    limits: activeId === null ? (rateLimits?.claude ?? null) : null,
    isFetching: false
  }
  return [system, ...managed]
}

function chatWindows(limits: ProviderRateLimits | null, now: number): ClaudeChatWindows {
  const start = (resetsAt: number | null | undefined, length: number) =>
    resetsAt ? resetsAt - length : now - length
  return {
    sessionStart: start(limits?.session?.resetsAt, SESSION_WINDOW_MS),
    weeklyStart: start(limits?.weekly?.resetsAt, WEEKLY_WINDOW_MS)
  }
}

async function transcriptPaths(record: AgentSessionRecord, home: string): Promise<string[]> {
  const ids = new Set(record.providerHandleChain.map((link) => link.handle.nativeId))
  const paths = await Promise.all(
    [...ids].map((id) =>
      resolveSessionFilePath('claude', id, {
        claudeProjectsDir: join(home, 'projects'),
        ...(record.launchDirectory ? { cwd: record.launchDirectory } : {})
      }).catch(() => null)
    )
  )
  return paths.filter((path) => path !== null)
}

async function buildChat(
  record: AgentSessionRecord,
  accounts: readonly ClaudeOverviewAccount[],
  now: number
): Promise<ClaudeOverviewChat> {
  const recipe = acquiredAgentSessionAccount(record)?.recipe ?? null
  const accountId = !recipe
    ? null
    : recipe.route === 'managed'
      ? recipe.accountId
      : CLAUDE_SYSTEM_ACCOUNT_ID
  const limits = accounts.find((account) => account.id === accountId)?.limits ?? null
  const paths = recipe ? await transcriptPaths(record, recipe.home) : []
  const tokens = await readClaudeChatWindowTokens(paths, chatWindows(limits, now))
  return {
    sessionId: record.sessionId,
    workspaceId: record.location.workspaceId,
    title: record.conversationName ?? record.lastTurn?.prompt ?? '',
    working: record.lastTurn?.state === 'open',
    accountId,
    ...tokens
  }
}

/** Every account with its limits, and how much of them each recent chat used. */
export async function buildClaudeAccountsOverview(input: {
  claude: ClaudeRateLimitAccountsState
  rateLimits: RateLimitState | undefined
  records: readonly AgentSessionRecord[]
  now: number
}): Promise<ClaudeAccountsOverview> {
  const { claude, rateLimits, now } = input
  const records = input.records.filter(
    (record) => record.provider === 'claude' && now - record.updatedAt < WEEKLY_WINDOW_MS
  )
  const usesSystem = records.some(
    (record) => acquiredAgentSessionAccount(record)?.recipe.route === 'system'
  )
  const accounts = buildAccounts(claude, rateLimits, usesSystem)
  const chats: ClaudeOverviewChat[] = []
  // One at a time: the first read walks every transcript, and this shares the server's event loop.
  for (const record of records) {
    chats.push(await buildChat(record, accounts, now))
  }
  return { accounts, chats, updatedAt: now }
}
