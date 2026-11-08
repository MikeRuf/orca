import type { SessionOptionDescriptor } from '../../native-chat/input/native-chat-session-options'
import type { StructuredAgentSessionOptionState } from './structured-agent-session-options'

export const AGENT_SESSION_CONTEXT_WINDOWS = ['default', '200000', '500000', '1000000'] as const

export type AgentSessionContextWindow = (typeof AGENT_SESSION_CONTEXT_WINDOWS)[number]

export function isAgentSessionContextWindow(value: unknown): value is AgentSessionContextWindow {
  return AGENT_SESSION_CONTEXT_WINDOWS.some((window) => window === value)
}

/** Token count to launch with; null leaves the window to the agent's settings files. */
export function agentSessionContextWindowTokens(value: unknown): number | null {
  return isAgentSessionContextWindow(value) && value !== 'default' ? Number(value) : null
}

export function structuredAgentSessionContextWindowDescriptor(
  state: StructuredAgentSessionOptionState
): SessionOptionDescriptor | null {
  // Only a host that launches with a window answers one, `default` included.
  const tracked = state.record.values.contextWindow
  if (!tracked) {
    return null
  }
  return {
    id: 'contextWindow',
    label: 'Context window',
    description: 'Restarts the agent on the next message',
    category: 'mode',
    kind: {
      type: 'select',
      currentValue: isAgentSessionContextWindow(tracked.value) ? tracked.value : 'default',
      choices: [
        { value: 'default', label: 'Default' },
        { value: '200000', label: '200K' },
        { value: '500000', label: '500K' },
        { value: '1000000', label: '1M' }
      ]
    },
    valueSource: state.acceptedInputSources?.contextWindow ? tracked.source : 'default',
    transport: 'agent-session',
    settable: true
  }
}
