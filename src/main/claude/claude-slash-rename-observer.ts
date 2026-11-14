import type { ClaudeStructuredSessionEvent } from './structured/claude-structured-session-event'

/** Reports a user's `/rename` once its turn ends, with the title Claude chose. */
export function createClaudeSlashRenameObserver(
  onRename: (sessionId: string, title: string) => void
): (event: ClaudeStructuredSessionEvent) => void {
  const titles = new Map<string, string>()
  return (event) => {
    if (event.type === 'ended') {
      titles.delete(event.sessionId)
      return
    }
    if (event.type !== 'message') {
      return
    }
    const { message, sessionId } = event
    if (message.type === 'system' && message.subtype === 'session_title_changed') {
      if (typeof message.title === 'string') {
        titles.set(sessionId, message.title)
      }
      return
    }
    if (message.type !== 'result') {
      return
    }
    const title = titles.get(sessionId)?.trim()
    titles.delete(sessionId)
    // Why: Orca's own rename_session pushes also emit session_title_changed but end no turn, so
    // only a `/rename` turn's result applies the title; that keeps Orca's names from echoing back.
    if (message.local_command === 'rename' && title) {
      onRename(sessionId, title)
    }
  }
}
