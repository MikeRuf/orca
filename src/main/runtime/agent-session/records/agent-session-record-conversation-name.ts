import { normalizeAgentSessionConversationName } from '../../../../shared/agent-session/agent-session-conversation-name'
import type { AgentSessionRecord } from '../../../../shared/agent-session/lifecycle/agent-session-record'

/** Names are durable metadata, not ownership; normalize without contending on the writer fence. */
export function setAgentSessionRecordConversationName(
  record: AgentSessionRecord,
  name: string | null,
  now: number
): AgentSessionRecord {
  const normalized = name === null ? null : normalizeAgentSessionConversationName(name)
  if ((record.conversationName ?? null) === normalized) {
    return record
  }
  const next = { ...record, updatedAt: now }
  if (normalized === null) {
    delete next.conversationName
    return next
  }
  next.conversationName = normalized
  return next
}

/** How a user's name write lands: `rename` always wins; `legacy-alias` (a window's tab rename
 *  from before names were saved here) only replaces a name Orca chose, so a late or replayed
 *  upload never overwrites a rename the user made since. */
export type AgentSessionUserNameWrite = 'rename' | 'legacy-alias'

/** `changed` is false when the chat already had this user name, as when a title box saves its
 *  unchanged text on losing focus. */
export type AgentSessionUserNameResult = {
  record: AgentSessionRecord
  applied: boolean
  changed: boolean
}

export function setAgentSessionRecordUserName(
  record: AgentSessionRecord,
  name: string,
  write: AgentSessionUserNameWrite,
  now: number
): AgentSessionUserNameResult {
  const normalized = normalizeAgentSessionConversationName(name)
  if (
    normalized === null ||
    (write === 'legacy-alias' && record.conversationNameSource === 'user')
  ) {
    return { record, applied: false, changed: false }
  }
  if (record.conversationName === normalized && record.conversationNameSource === 'user') {
    return { record, applied: true, changed: false }
  }
  return {
    record: {
      ...record,
      conversationName: normalized,
      conversationNameSource: 'user',
      updatedAt: now
    },
    applied: true,
    changed: true
  }
}

export async function setAgentSessionRecordUserNameThrough(
  mutate: (
    apply: (record: AgentSessionRecord) => AgentSessionRecord
  ) => Promise<AgentSessionRecord>,
  name: string,
  write: AgentSessionUserNameWrite
): Promise<AgentSessionUserNameResult> {
  let applied = false,
    changed = false
  const record = await mutate((current) => {
    const result = setAgentSessionRecordUserName(current, name, write, Date.now())
    ;({ applied, changed } = result)
    return result.record
  })
  return { record, applied, changed }
}

/** Automatic naming's write: applies only while the name is still `expected` and the user has not
 *  named the conversation, so a stale generation never replaces a rename — even one back to the
 *  same text. */
export async function compareAndSetAgentSessionRecordName(
  mutate: (
    apply: (record: AgentSessionRecord) => AgentSessionRecord
  ) => Promise<AgentSessionRecord>,
  name: string | null,
  expected: string | null,
  contextId: string | null = null,
  applicable?: (record: AgentSessionRecord) => boolean
): Promise<AgentSessionRecord | null> {
  let matched = false
  const record = await mutate((current) => {
    matched =
      (applicable?.(current) ?? true) &&
      current.conversationNameSource !== 'user' &&
      (current.conversationName ?? null) === expected &&
      (current.providerContextBoundary?.operationId ?? null) === contextId
    return matched ? setAgentSessionRecordConversationName(current, name, Date.now()) : current
  })
  return matched ? record : null
}

export type CompareAndSetConversationName = (
  sessionId: string,
  name: string | null,
  expected: string | null,
  contextId?: string | null,
  applicable?: (record: AgentSessionRecord) => boolean
) => Promise<AgentSessionRecord | null>
