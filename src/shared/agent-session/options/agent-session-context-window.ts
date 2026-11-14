import type { SessionOptionDescriptor } from '../../native-chat/input/native-chat-session-options'
import type { StructuredAgentSessionOptionState } from './structured-agent-session-options'

const PRESET_WINDOWS = ['200000', '500000', '1000000'] as const

/** Bounds for a typed size; below the floor a session compacts almost every turn. */
export const AGENT_SESSION_CONTEXT_WINDOW_RANGE = { min: 50_000, max: 1_000_000 } as const

/** `default`, or a whole token count as a string so it travels like any other select value. */
export type AgentSessionContextWindow = string

export function isAgentSessionContextWindow(value: unknown): value is AgentSessionContextWindow {
  if (value === 'default') {
    return true
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return false
  }
  const tokens = Number(value)
  return (
    tokens >= AGENT_SESSION_CONTEXT_WINDOW_RANGE.min &&
    tokens <= AGENT_SESSION_CONTEXT_WINDOW_RANGE.max
  )
}

/** Token count to launch with; null leaves the window to the agent's settings files. */
export function agentSessionContextWindowTokens(value: unknown): number | null {
  return isAgentSessionContextWindow(value) && value !== 'default' ? Number(value) : null
}

export function agentSessionContextWindowLabel(tokens: number): string {
  if (tokens >= 1_000_000 && tokens % 1_000_000 === 0) {
    return `${tokens / 1_000_000}M`
  }
  return `${Math.round(tokens / 1000)}K`
}

export function structuredAgentSessionContextWindowDescriptor(
  state: StructuredAgentSessionOptionState
): SessionOptionDescriptor | null {
  // Only a host that launches with a window answers one, `default` included.
  const tracked = state.record.values.contextWindow
  if (!tracked) {
    return null
  }
  const current = isAgentSessionContextWindow(tracked.value) ? tracked.value : 'default'
  const sizes: string[] = [...PRESET_WINDOWS]
  if (current !== 'default' && !sizes.includes(current)) {
    sizes.push(current)
    sizes.sort((a, b) => Number(a) - Number(b))
  }
  return {
    id: 'contextWindow',
    label: 'Context window',
    description: 'Restarts the agent on the next message',
    category: 'mode',
    kind: {
      type: 'select',
      currentValue: current,
      choices: [
        { value: 'default', label: 'Default' },
        ...sizes.map((value) => ({ value, label: agentSessionContextWindowLabel(Number(value)) }))
      ],
      custom: AGENT_SESSION_CONTEXT_WINDOW_RANGE
    },
    valueSource: state.acceptedInputSources?.contextWindow ? tracked.source : 'default',
    transport: 'agent-session',
    settable: true
  }
}
