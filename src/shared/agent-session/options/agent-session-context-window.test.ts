import { describe, expect, it } from 'vitest'
import '../../native-chat/input/native-chat-session-option-snapshot'
import { canSetStructuredAgentSessionOption } from './structured-agent-session-option-snapshot'
import {
  applyStructuredAgentSessionOptions,
  createStructuredAgentSessionOptionState
} from './structured-agent-session-options'
import './structured-agent-session-option-view'
import { structuredAgentSessionSeedCatalog } from './structured-agent-session-seed-catalog'

function liveClaude() {
  const seed = structuredAgentSessionSeedCatalog('claude')
  return applyStructuredAgentSessionOptions(
    createStructuredAgentSessionOptionState('claude', seed),
    seed,
    {
      models: [{ id: 'model-a', label: 'Model A', isDefault: true, efforts: [] }],
      current: { model: 'model-a', contextWindow: 'default' }
    }
  )
}

describe('the context window picker', () => {
  it('admits a typed size that is not one of the listed presets', () => {
    const state = liveClaude()
    expect(canSetStructuredAgentSessionOption(state, 'contextWindow', '350000')).toBe(true)
    expect(canSetStructuredAgentSessionOption(state, 'contextWindow', '20000')).toBe(false)
    expect(canSetStructuredAgentSessionOption(state, 'contextWindow', '350K')).toBe(false)
  })
})
