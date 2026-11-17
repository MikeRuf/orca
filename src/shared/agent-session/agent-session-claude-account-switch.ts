/** Answer to agentSession.setClaudeAccount; the chat restarts on the account at its next message. */
export type AgentSessionClaudeAccountSwitch =
  | { status: 'switched' }
  | { status: 'refused'; reason: 'notClaude' | 'signedOut' }
