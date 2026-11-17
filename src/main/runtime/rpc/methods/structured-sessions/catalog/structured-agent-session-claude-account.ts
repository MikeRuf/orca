import { defineMethod } from '../../../core'
import { requireInstalledStructuredHost } from '../creation/structured-agent-session-gate'
import { SetClaudeAccountParams } from '../../../../../../shared/rpc-contract/structured-agent-session/structured-agent-session-params'
import type { AgentSessionClaudeAccountSwitch } from '../../../../../../shared/agent-session/agent-session-claude-account-switch'
import { getClaudeProfileRouter } from '../../../../../claude-accounts/profiles/routing/claude-profile-installed-router'
import { setChatClaudeAccountId } from '../../../../../claude-accounts/chat-account/claude-chat-account-overrides'

export const STRUCTURED_AGENT_SESSION_CLAUDE_ACCOUNT_METHODS = [
  defineMethod({
    name: 'agentSession.setClaudeAccount',
    permission: 'workspace',
    params: SetClaudeAccountParams,
    handler: async ({ sessionId, accountId }, ctx): Promise<AgentSessionClaudeAccountSwitch> => {
      const host = await requireInstalledStructuredHost(ctx, sessionId)
      if (host.deps.store.getRecord(sessionId)?.provider !== 'claude') {
        return { status: 'refused', reason: 'notClaude' }
      }
      const router = getClaudeProfileRouter()
      if (accountId && (!router?.savedAccount(accountId) || !router.accountLogin(accountId))) {
        return { status: 'refused', reason: 'signedOut' }
      }
      // No stop here: the pre-send check retires the agent once it owes no work, then resumes.
      setChatClaudeAccountId(sessionId, accountId)
      return { status: 'switched' }
    }
  })
]
