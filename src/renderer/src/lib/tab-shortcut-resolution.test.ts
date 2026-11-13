import { beforeEach, describe, expect, it, vi } from 'vitest'

const palette = vi.fn(() => ({ status: 'activated' as const }))
const chat = vi.fn(() => true)
const reveal = vi.fn(() => true)
const store = {
  getKnownWorktreeById: () => ({ hostId: 'runtime:wsl' }),
  focusGroup: vi.fn(),
  activateTab: vi.fn(),
  setActiveBrowserTab: vi.fn(),
  setActiveTabType: vi.fn()
}

vi.mock('@/store', () => ({ useAppStore: { getState: () => store } }))
vi.mock('@/lib/workspace/search/tabs/workspace-tab-palette-activation', () => ({
  activateWorkspaceTabPaletteResult: palette
}))
vi.mock('@/lib/agent-session/structured-agent-session-tab-activation', () => ({
  activateStructuredAgentSessionTab: chat
}))
vi.mock('@/lib/workspace/activation/worktree-activation', () => ({
  activateAndRevealWorkspace: reveal
}))
vi.mock('@/components/terminal-pane/input/focus/focus-terminal-tab-surface', () => ({
  focusTerminalTabSurface: vi.fn()
}))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }))

const { activateTabAnywhere } = await import('./tab-shortcut-resolution')

function tab(contentType: string) {
  return { id: 't1', entityId: 'e1', groupId: 'g1', worktreeId: 'wt', contentType } as never
}

describe('activateTabAnywhere', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens a chat through the chat activation, not the file-only palette path', () => {
    expect(activateTabAnywhere('wt', tab('agent-session'))).toBe(true)
    expect(reveal).toHaveBeenCalledWith('wt', { executionHostId: 'runtime:wsl' })
    expect(chat).toHaveBeenCalledWith({ worktreeId: 'wt', tabId: 't1' })
    expect(palette).not.toHaveBeenCalled()
  })

  it('keeps terminals on the palette path', () => {
    expect(activateTabAnywhere('wt', tab('terminal'))).toBe(true)
    expect(palette).toHaveBeenCalledOnce()
    expect(chat).not.toHaveBeenCalled()
  })

  it('selects the browser page for a browser tab', () => {
    expect(activateTabAnywhere('wt', tab('browser'))).toBe(true)
    expect(store.setActiveBrowserTab).toHaveBeenCalledWith('e1', 'wt')
    expect(store.setActiveTabType).toHaveBeenCalledWith('browser', 'wt')
  })
})
