import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { answerServerRestart } from './native-chat-server-restart-auto-resume'

function offerOf(ids: string[], ours: string[]) {
  let candidates = ids.map((sessionId) => ({ sessionId }))
  return {
    getNativeChatRestartOffer: () => ({ candidates }),
    startedHere: (id: string) => ours.includes(id),
    continueNativeChatRestartOffer: vi.fn(async (resumed: readonly string[]) => {
      candidates = candidates.filter((row) => !resumed.includes(row.sessionId))
    })
  }
}

function setAutoResume(on: boolean): void {
  useAppStore.setState({
    settings: { ...useAppStore.getState().settings, nativeChatResumeWorkOnRestart: on } as never
  })
}

describe('answerServerRestart', () => {
  afterEach(() => setAutoResume(false))

  it('asks when automatic resume is off', () => {
    setAutoResume(false)
    const offer = offerOf(['a'], ['a'])
    const ask = vi.fn()
    answerServerRestart(offer, ask)
    expect(ask).toHaveBeenCalledOnce()
    expect(offer.continueNativeChatRestartOffer).not.toHaveBeenCalled()
  })

  it('resumes every interrupted chat, wherever it was started', async () => {
    setAutoResume(true)
    const offer = offerOf(['mine', 'cli'], ['mine'])
    const ask = vi.fn()
    answerServerRestart(offer, ask)
    await vi.waitFor(() => expect(offer.continueNativeChatRestartOffer).toHaveBeenCalled())
    expect(offer.continueNativeChatRestartOffer).toHaveBeenCalledWith(['mine', 'cli'], 'launch')
    await Promise.resolve()
    expect(ask).not.toHaveBeenCalled()
  })

  it('stays silent when every interrupted chat was started here', async () => {
    setAutoResume(true)
    const offer = offerOf(['mine'], ['mine'])
    const ask = vi.fn()
    answerServerRestart(offer, ask)
    await vi.waitFor(() => expect(offer.continueNativeChatRestartOffer).toHaveBeenCalled())
    await Promise.resolve()
    expect(ask).not.toHaveBeenCalled()
  })
})
