// Cmd/Ctrl+Enter on an empty composer steers every queued card that can (feat/steer-all-queued).
// Its own module so use-structured-agent-session-queued-messages.ts stays under its line cap.

import { useCallback, useMemo, type RefObject } from 'react'
import type { AgentSessionSendResult } from '../../../../../shared/agent-session/agent-session-wire'
import {
  steerableQueuedMessageCards,
  type QueuedMessageCard
} from '../../../../../shared/agent-session/view/structured-agent-session-queued-cards'
import type { StructuredAgentSessionMutate } from '../session/structured/writes/use-structured-agent-session-mutate'
import type { QueuedMessagesPendingAction } from './use-structured-agent-session-queued-messages'

type QueuedRun = (
  keys: readonly string[],
  pending: QueuedMessagesPendingAction,
  action: () => Promise<void>
) => Promise<unknown>

/** Steers every steerable card in queue order; undefined while none can be steered. */
export function useSteerAll(
  args: { enabled: boolean; mutate: StructuredAgentSessionMutate },
  steerOrder: readonly QueuedMessageCard[],
  editingMessageId: string | undefined,
  held: {
    inFlightRef: RefObject<Map<string, QueuedMessagesPendingAction>>
    inFlight: ReadonlyMap<string, QueuedMessagesPendingAction>
    run: QueuedRun
  }
): (() => boolean) | undefined {
  const { enabled, mutate } = args
  const { inFlightRef, inFlight, run } = held
  const steerableIds = useMemo(
    () =>
      enabled
        ? steerableQueuedMessageCards(steerOrder)
            .map((card) => card.messageId)
            .filter((messageId) => messageId !== editingMessageId)
        : [],
    [editingMessageId, enabled, steerOrder]
  )
  const steerAll = useCallback((): boolean => {
    const messageIds = steerableIds.filter((messageId) => !inFlightRef.current.has(messageId))
    if (messageIds.length === 0) {
      return false
    }
    void run(messageIds, 'send', async () => {
      // One at a time, so the agent reads them in queue order and a refused card keeps the rest behind it.
      for (const messageId of messageIds) {
        const sent = await mutate<AgentSessionSendResult>(
          'agentSession.queuedMessageSend',
          'agentSession.queuedMessageSend',
          { messageId }
        )
        if (!sent) {
          return
        }
      }
    })
    return true
  }, [inFlightRef, mutate, run, steerableIds])
  return steerableIds.some((messageId) => !inFlight.has(messageId)) ? steerAll : undefined
}
