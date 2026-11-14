import { describe, expect, it } from 'vitest'
import { createLastTabTracker } from './last-tab-toggle'

function at(worktreeId: string, tabId: string) {
  return {
    key: `${worktreeId}\u0000${tabId}`,
    worktreeId,
    groupId: 'g',
    tabId,
    entityId: tabId,
    contentType: 'terminal' as const
  }
}

describe('createLastTabTracker', () => {
  it('goes back to the last tab, and toggles back on the next press', () => {
    const tracker = createLastTabTracker()
    tracker.observe(at('travel', 'chat'))
    tracker.observe(at('orca', 'terminal'))
    expect(tracker.previous()?.key).toBe(at('travel', 'chat').key)
    // Alt+Q lands on travel/chat; the tab just left becomes the way back.
    tracker.observe(at('travel', 'chat'))
    expect(tracker.previous()?.key).toBe(at('orca', 'terminal').key)
  })

  it('ignores repeats of the current tab and empty moments', () => {
    const tracker = createLastTabTracker()
    tracker.observe(at('travel', 'chat'))
    tracker.observe(at('travel', 'chat'))
    tracker.observe(null)
    expect(tracker.previous()).toBeNull()
  })
})

describe('the Alt+Q binding', () => {
  it('matches the key event Windows sends for Alt+Q', async () => {
    const { keybindingMatchesAction } = await import('../../../shared/keybindings')
    const altQ = {
      key: 'q',
      code: 'KeyQ',
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    }
    expect(keybindingMatchesAction('tab.toggleLast', altQ as never, 'win32', {})).toBe(true)
    expect(
      keybindingMatchesAction('tab.toggleLast', { ...altQ, altKey: false } as never, 'win32', {})
    ).toBe(false)
  })
})
