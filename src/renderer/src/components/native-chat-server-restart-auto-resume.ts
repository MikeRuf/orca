import { useAppStore } from '@/store'

type ServerRestartOffer = {
  getNativeChatRestartOffer: () => { candidates: readonly { sessionId: string }[] }
  startedHere: (sessionId: string) => boolean
  continueNativeChatRestartOffer: (sessionIds: readonly string[], by: 'launch') => Promise<void>
}

/**
 * A server restart offers to resume the chats it interrupted. With "resume automatically" on,
 * this app's own chats resume as they do after an app restart; chats another client started
 * still ask, since resuming them is not this app's to decide.
 */
export function answerServerRestart(offer: ServerRestartOffer, ask: () => void): void {
  const ours =
    useAppStore.getState().settings?.nativeChatResumeWorkOnRestart === true
      ? offer
          .getNativeChatRestartOffer()
          .candidates.map((row) => row.sessionId)
          .filter((id) => offer.startedHere(id))
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
