import { describe, expect, it, vi } from 'vitest'
import { createClaudeSlashRenameObserver } from './claude-slash-rename-observer'

const titleChanged = (title: string) => ({
  type: 'message' as const,
  sessionId: 'chat-1',
  message: { type: 'system', subtype: 'session_title_changed', title }
})
const result = (localCommand?: string) => ({
  type: 'message' as const,
  sessionId: 'chat-1',
  message: { type: 'result', subtype: 'success', local_command: localCommand }
})

describe('createClaudeSlashRenameObserver', () => {
  it('applies the title once the /rename turn ends', () => {
    const onRename = vi.fn()
    const observe = createClaudeSlashRenameObserver(onRename)
    observe(titleChanged('common2'))
    expect(onRename).not.toHaveBeenCalled()
    observe(result('rename'))
    expect(onRename).toHaveBeenCalledWith('chat-1', 'common2')
  })

  it("ignores Orca's own rename pushes, which end no turn", () => {
    const onRename = vi.fn()
    const observe = createClaudeSlashRenameObserver(onRename)
    observe(titleChanged('pushed by Orca'))
    observe(result())
    observe(result('rename'))
    expect(onRename).not.toHaveBeenCalled()
  })

  it('ignores other local commands', () => {
    const onRename = vi.fn()
    const observe = createClaudeSlashRenameObserver(onRename)
    observe(titleChanged('stale'))
    observe(result('cost'))
    expect(onRename).not.toHaveBeenCalled()
  })
})
