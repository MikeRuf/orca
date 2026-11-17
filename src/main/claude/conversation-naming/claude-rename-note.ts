import type { ClaudeStreamJsonConnection } from '../claude-stream-json-connection'

type NoteState = {
  /** The name the model has seen in the conversation, from a `/rename` or an earlier note. */
  knownName?: string
  announcedTitle?: string
  noteResultPending: boolean
  /** The rename line still owed to the chat window for the last note. */
  pendingLine?: string
}

const states = new WeakMap<ClaudeStreamJsonConnection, NoteState>()

function stateFor(connection: ClaudeStreamJsonConnection): NoteState {
  let state = states.get(connection)
  if (!state) {
    state = { noteResultPending: false }
    states.set(connection, state)
  }
  return state
}

/**
 * Tells the model about a rename made outside the conversation. rename_session only retitles the
 * transcript, so without this the model keeps answering with the last name it saw in the chat.
 */
export async function sendClaudeRenameNote(
  connection: ClaudeStreamJsonConnection,
  providerSessionId: string,
  name: string
): Promise<void> {
  const state = stateFor(connection)
  const trimmed = name.trim()
  if (!trimmed || state.knownName === trimmed) {
    return
  }
  // Why: shouldQuery false appends without starting a turn; the CLI folds the note into the next
  // prompt and stores it as a meta entry, which Orca's journal and transcript readers already hide.
  await connection.send({
    type: 'user',
    message: {
      role: 'user',
      content: `The user renamed this session to "${trimmed}" from the Orca tab.`
    },
    parent_tool_use_id: null,
    isSynthetic: true,
    shouldQuery: false,
    session_id: providerSessionId
  })
  state.knownName = trimmed
  state.noteResultPending = true
  state.pendingLine = `Session renamed to: ${trimmed}`
}

/**
 * Rewrites the frames a note affects. Sent while Claude is idle, a note ends with an empty zero-turn
 * result that would read as a turn; it is replaced by a rename line. Sent mid-turn, the line goes in
 * just before that turn's own result.
 */
export function rewriteClaudeRenameNoteFrames(
  connection: ClaudeStreamJsonConnection | null | undefined,
  message: Record<string, unknown>,
  ownSessionId: string | null
): Record<string, unknown>[] {
  // Why: a foreign session's result must not consume this session's pending note.
  if (
    !connection ||
    message.session_id !== ownSessionId ||
    (message.type !== 'system' && message.type !== 'result')
  ) {
    return [message]
  }
  const state = stateFor(connection)
  if (message.type === 'system' && message.subtype === 'session_title_changed') {
    state.announcedTitle = typeof message.title === 'string' ? message.title.trim() : undefined
    return [message]
  }
  if (message.type !== 'result') {
    return [message]
  }
  const announced = state.announcedTitle
  state.announcedTitle = undefined
  if (message.local_command === 'rename' && announced) {
    state.knownName = announced
  }
  if (!state.noteResultPending) {
    return [message]
  }
  // Why: the note's result is the only point where the main process sees the note land in the
  // conversation; showing the line here means the window only claims what Claude actually received.
  state.noteResultPending = false
  const line = state.pendingLine
  state.pendingLine = undefined
  // Why: shown as Claude's local command output, the same row style /rename's own reply gets.
  const lineFrame = line
    ? [
        {
          type: 'system',
          subtype: 'local_command_output',
          content: line,
          session_id: message.session_id
        }
      ]
    : []
  const noteOnly = message.num_turns === 0 && !message.result && message.local_command === undefined
  return noteOnly ? lineFrame : [...lineFrame, message]
}
