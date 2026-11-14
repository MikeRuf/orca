import { useAppStore } from '@/store'

type ServerRestartOffer = {
  getNativeChatRestartOffer: () => { candidates: readonly { sessionId: string }[] }
  startedHere: (sessionId: string) => boolean
  continueNativeChatRestartOffer: (sessionIds: readonly string[], by: 'launch') => Promise<void>
}

/**
 * A server restart offers to resume the chats it interrupted. With "resume automatically" on,
 * all of them resume, whoever started them: on a person's own server, chats started from the CLI
 * or a phone are theirs too (Mike, 2026-11-05, after the dialog kept asking about CLI-started
 * chats). The dialog appears only for chats that are still offered afterward, i.e. failed.
 */
export function answerServerRestart(offer: ServerRestartOffer, ask: () => void): void {
  const ours =
    useAppStore.getState().settings?.nativeChatResumeWorkOnRestart === true
      ? offer.getNativeChatRestartOffer().candidates.map((row) => row.sessionId)
      : []
  if (ours.length === 0) {
    ask()
    return
  }
  void offer.continueNativeChatRestartOffer(ours, 'launch').then(() => {
    if (offer.getNativeChatRestartOffer().candidates.length > 0) {
      ask()
    }
  })
}
