import type { NativeChatContextUsageSummary } from '../../../../../shared/native-chat/native-chat-context-usage-summary'
import type { NativeChatStructuredComposerTransport } from '../composer/submit/native-chat-structured-composer-transport'
import { NativeChatComposerAccountUsage } from './NativeChatComposerAccountUsage'
import { useNativeChatContextUsageSummary } from './use-native-chat-context-usage-summary'

export type NativeChatComposerUsage = {
  contextUsage: NativeChatContextUsageSummary | null
  accountUsage: React.ReactNode
}

/** The toolbar's usage readouts: context for any structured chat, the account for Claude. */
export function useNativeChatComposerUsage(
  agent: string | undefined,
  structuredTransport: NativeChatStructuredComposerTransport | undefined
): NativeChatComposerUsage {
  const contextUsage = useNativeChatContextUsageSummary(structuredTransport)
  const worktreeId = structuredTransport?.worktreeId
  return {
    contextUsage,
    accountUsage:
      agent === 'claude' && worktreeId ? (
        <NativeChatComposerAccountUsage
          worktreeId={worktreeId}
          sessionId={structuredTransport.sessionId}
        />
      ) : null
  }
}
