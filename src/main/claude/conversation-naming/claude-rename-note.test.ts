import { describe, expect, it, vi } from 'vitest'
import { rewriteClaudeRenameNoteFrames, sendClaudeRenameNote } from './claude-rename-note'
import type { ClaudeStreamJsonConnection } from '../claude-stream-json-connection'

function fakeConnection() {
  const send = vi.fn(async () => {})
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the note only uses send.
  return { connection: { send } as unknown as ClaudeStreamJsonConnection, send }
}
const emptyResult = {
  type: 'result',
  subtype: 'success',
  num_turns: 0,
  result: '',
  session_id: 'provider-1'
}
const turnResult = {
  type: 'result',
  subtype: 'success',
  num_turns: 1,
  result: 'done',
  session_id: 'provider-1'
}
const line = {
  type: 'system',
  subtype: 'local_command_output',
  content: 'Session renamed to: from-tab',
  session_id: 'provider-1'
}

describe('claude rename note', () => {
  it('replaces the empty result a note leaves with a rename line', async () => {
    const { connection, send } = fakeConnection()
    await sendClaudeRenameNote(connection, 'provider-1', 'from-tab')
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ isSynthetic: true, shouldQuery: false, session_id: 'provider-1' })
    )
    expect(rewriteClaudeRenameNoteFrames(connection, emptyResult, 'provider-1')).toEqual([line])
    expect(rewriteClaudeRenameNoteFrames(connection, emptyResult, 'provider-1')).toEqual([
      emptyResult
    ])
  })

  it('puts the line before the real result when the note joined a running turn', async () => {
    const { connection } = fakeConnection()
    await sendClaudeRenameNote(connection, 'provider-1', 'from-tab')
    expect(rewriteClaudeRenameNoteFrames(connection, turnResult, 'provider-1')).toEqual([
      line,
      turnResult
    ])
    expect(rewriteClaudeRenameNoteFrames(connection, emptyResult, 'provider-1')).toEqual([
      emptyResult
    ])
  })

  it('leaves the pending note alone for a foreign session result', async () => {
    const { connection } = fakeConnection()
    await sendClaudeRenameNote(connection, 'provider-1', 'from-tab')
    const foreign = { ...emptyResult, session_id: 'other' }
    expect(rewriteClaudeRenameNoteFrames(connection, foreign, 'provider-1')).toEqual([foreign])
    expect(rewriteClaudeRenameNoteFrames(connection, emptyResult, 'provider-1')).toEqual([line])
  })

  it('skips the note when the model saw the name through /rename', async () => {
    const { connection, send } = fakeConnection()
    rewriteClaudeRenameNoteFrames(
      connection,
      {
        type: 'system',
        subtype: 'session_title_changed',
        title: 'typed',
        session_id: 'provider-1'
      },
      'provider-1'
    )
    rewriteClaudeRenameNoteFrames(
      connection,
      { ...emptyResult, local_command: 'rename' },
      'provider-1'
    )
    await sendClaudeRenameNote(connection, 'provider-1', 'typed')
    expect(send).not.toHaveBeenCalled()
  })
})
