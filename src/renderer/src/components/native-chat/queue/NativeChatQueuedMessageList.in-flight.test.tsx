// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { useStructuredAgentSessionQueuedMessages } from './use-structured-agent-session-queued-messages'
import type { AgentSessionQueuedMessage } from '../../../../../shared/agent-session/requests/agent-session-queued-message-wire'

function waitingDraft(messageId: string, position: number): AgentSessionQueuedMessage {
  return {
    messageId,
    position,
    body: { kind: 'message', role: 'user', blocks: [{ type: 'text', text: `${messageId} text` }] },
    state: 'waiting'
  }
}

it('steers every card in queue order, one at a time, and leaves the rest after a refusal', async () => {
  const answers = [Promise.withResolvers<null>(), Promise.withResolvers<null>()]
  const mutate = vi.fn(
    async (..._call: [string, string, Record<string, unknown>]) =>
      answers[mutate.mock.calls.length - 1].promise
  )
  const write = vi.fn()
  const { result } = renderHook(() =>
    useStructuredAgentSessionQueuedMessages({
      admit: () => ({ target: { kind: 'local' }, write, mutate: async () => null }),
      capturePresentation: () => () => true,
      enabled: true,
      queuedMessages: [waitingDraft('a', 1), waitingDraft('b', 2), waitingDraft('c', 3)],
      queuePause: null,
      submissions: [],
      hasPendingPrompt: false,
      isWorking: true,
      composerScopeKey: undefined,
      mutate,
      editTransport: { target: { kind: 'local' }, sessionId: 'session', capable: false, write }
    })
  )
  const sentIds = () => mutate.mock.calls.map((call) => call[2].messageId)
  act(() => {
    expect(result.current.steerAll?.()).toBe(true)
  })
  expect(sentIds()).toEqual(['a'])
  // Every card is held for the whole run, so a second press adds nothing.
  expect(result.current.steerAll).toBeUndefined()
  // Parsed, so the stand-in receipt needs no assertion past the mock's null type.
  await act(async () => answers[0].resolve(JSON.parse('{}')))
  expect(sentIds()).toEqual(['a', 'b'])
  await act(async () => answers[1].resolve(null))
  expect(sentIds()).toEqual(['a', 'b'])
  expect(result.current.steerAll).toBeDefined()
})
