import { describe, expect, it, vi } from 'vitest'
import { sendClaudeRenameNote } from '../conversation-naming/claude-rename-note'
import type {
  ClaudeStreamJsonConnection,
  ClaudeStreamJsonConnectionHandlers
} from '../claude-stream-json-connection'
import { openClaudeWithRenameNotes } from './claude-rename-notes'

const emptyResult = {
  type: 'result',
  subtype: 'success',
  num_turns: 0,
  result: '',
  session_id: 'provider-1'
}

function fakeOpen() {
  const captured: { handlers?: ClaudeStreamJsonConnectionHandlers } = {}
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the note only uses send.
  const connection = { send: vi.fn(async () => {}) } as unknown as ClaudeStreamJsonConnection
  const open = vi.fn(
    async (_launch: unknown, handlers: ClaudeStreamJsonConnectionHandlers = {}) => {
      captured.handlers = handlers
      return connection
    }
  )
  return { open, connection, captured }
}

describe('openClaudeWithRenameNotes', () => {
  it('turns the empty result a rename note leaves into the rename line', async () => {
    const { open, connection, captured } = fakeOpen()
    const seen: Record<string, unknown>[] = []
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the fake ignores the launch.
    const opened = await openClaudeWithRenameNotes(open, { providerSessionId: 'provider-1' })(
      {} as never,
      { onMessage: (message) => seen.push(message) }
    )
    expect(opened).toBe(connection)
    await sendClaudeRenameNote(connection, 'provider-1', 'from-tab')
    captured.handlers?.onMessage?.(emptyResult)
    expect(seen).toEqual([
      {
        type: 'system',
        subtype: 'local_command_output',
        content: 'Session renamed to: from-tab',
        session_id: 'provider-1'
      }
    ])
  })

  it("passes another session's frames through untouched", async () => {
    const { open, connection, captured } = fakeOpen()
    const seen: Record<string, unknown>[] = []
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the fake ignores the launch.
    await openClaudeWithRenameNotes(open, { providerSessionId: 'provider-1' })({} as never, {
      onMessage: (message) => seen.push(message)
    })
    await sendClaudeRenameNote(connection, 'provider-1', 'from-tab')
    const foreign = { ...emptyResult, session_id: 'provider-2' }
    captured.handlers?.onMessage?.(foreign)
    expect(seen).toEqual([foreign])
  })
})
