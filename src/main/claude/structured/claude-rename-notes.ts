import { openClaudeStreamJsonConnection } from '../claude-stream-json-connection'
import type { ClaudeStreamJsonConnection } from '../claude-stream-json-connection'
import { rewriteClaudeRenameNoteFrames } from '../conversation-naming/claude-rename-note'

type OpenClaudeConnection = typeof openClaudeStreamJsonConnection

/**
 * The connection opener for a structured Claude session, with tab-rename note frames rewritten (see
 * claude-rename-note.ts) before the session's own message handler sees them.
 */
// Why: wrapping the opener, not the handler, keeps the acquisition file at its max-lines cap.
export function openClaudeWithRenameNotes(
  open: OpenClaudeConnection | undefined,
  launch: { readonly providerSessionId: string | null }
): OpenClaudeConnection {
  const openConnection = open ?? openClaudeStreamJsonConnection
  return async (spec, handlers = {}, ...rest) => {
    const onMessage = handlers.onMessage
    if (!onMessage) {
      return await openConnection(spec, handlers, ...rest)
    }
    // Why: frames that arrive before open resolves pass through unchanged, as they did when the
    // rewrite read the attempt's connection, which is also set only once open resolves.
    let connection: ClaudeStreamJsonConnection | undefined
    const opened = await openConnection(
      spec,
      {
        ...handlers,
        onMessage: (message) =>
          rewriteClaudeRenameNoteFrames(connection, message, launch.providerSessionId).forEach(
            onMessage
          )
      },
      ...rest
    )
    connection = opened
    return opened
  }
}
