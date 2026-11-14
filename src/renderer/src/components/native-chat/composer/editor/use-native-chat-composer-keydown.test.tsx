// @vitest-environment happy-dom

import { fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useNativeChatRecallPosition } from '../../drafts/use-native-chat-composer-recall'
import type { NativeChatMessage } from '../../../../../../shared/native-chat/native-chat-types'
import { useNativeChatComposerKeyDown } from './use-native-chat-composer-keydown'

describe('useNativeChatComposerKeyDown', () => {
  describe('prompt recall', () => {
    const userMessage = (id: string, text: string): NativeChatMessage => ({
      id,
      role: 'user',
      blocks: [{ type: 'text', text }],
      timestamp: null,
      source: 'transcript'
    })

    const onEveryEdge = (): boolean => true

    function Composer({
      prompts,
      initialDraft = '',
      hasAttachments,
      isCaretOnVisualEdge = onEveryEdge
    }: {
      prompts: string[]
      initialDraft?: string
      hasAttachments?: boolean
      isCaretOnVisualEdge?: (edge: 'start' | 'end') => boolean
    }): React.JSX.Element {
      const [draft, setDraft] = useState(initialDraft)
      const [recallPosition, setRecallPosition] = useNativeChatRecallPosition(draft)
      const onKeyDown = useNativeChatComposerKeyDown({
        autocomplete: { mode: 'none' },
        activeSuggestion: 0,
        draft,
        mentionFiles: { files: [], loading: false, failed: false },
        completeMention: vi.fn(),
        recall: {
          source: { messages: prompts.map((text, index) => userMessage(String(index), text)) },
          position: recallPosition,
          setPosition: setRecallPosition,
          isCaretOnVisualEdge,
          show: vi.fn()
        },
        isComposing: () => false,
        completePickerItem: vi.fn(),
        dispatchPickerCommand: vi.fn(),
        dismissPicker: vi.fn(),
        interrupt: vi.fn(),
        send: vi.fn(),
        setActiveSuggestion: vi.fn(),
        setDraft,
        setCaret: vi.fn(),
        ...(hasAttachments === undefined ? {} : { hasAttachments })
      })
      return (
        <textarea
          aria-label="composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
      )
    }

    function setup(props: Parameters<typeof Composer>[0]) {
      const field = render(<Composer {...props} />).container.querySelector('textarea')!
      return {
        field,
        press: (key: string, init: KeyboardEventInit = {}) => {
          const claimed = !fireEvent.keyDown(field, { key, ...init })
          return { draft: field.value, claimed }
        }
      }
    }

    it('treats an edited recall as a typed draft', () => {
      const { field, press } = setup({ prompts: ['one', 'two'] })
      press('ArrowUp')
      fireEvent.change(field, { target: { value: 'two, edited' } })
      expect(press('ArrowUp')).toEqual({ draft: 'two, edited', claimed: false })
      // Edited back to the recalled text, it is still a typed draft.
      fireEvent.change(field, { target: { value: 'two' } })
      expect(press('ArrowUp')).toEqual({ draft: 'two', claimed: false })
    })
  })

  describe('steer chord', () => {
    function Composer({
      initialDraft,
      chordSteersHead,
      send,
      steerHead,
      steerAll
    }: {
      initialDraft: string
      chordSteersHead: boolean
      send: (intent?: { alternate?: boolean }) => void
      steerHead: () => boolean
      steerAll: () => boolean
    }): React.JSX.Element {
      const [draft, setDraft] = useState(initialDraft)
      const onKeyDown = useNativeChatComposerKeyDown({
        autocomplete: { mode: 'none' },
        activeSuggestion: 0,
        draft,
        mentionFiles: { files: [], loading: false, failed: false },
        completeMention: vi.fn(),
        isComposing: () => false,
        completePickerItem: vi.fn(),
        dispatchPickerCommand: vi.fn(),
        dismissPicker: vi.fn(),
        interrupt: vi.fn(),
        send,
        steerHead,
        steerAll,
        chordSteersHead,
        setActiveSuggestion: vi.fn(),
        setDraft,
        setCaret: vi.fn()
      })
      return (
        <textarea aria-label="composer" value={draft} onChange={() => {}} onKeyDown={onKeyDown} />
      )
    }

    function pressModEnter(
      initialDraft: string,
      { chordSteersHead = true, ...init }: KeyboardEventInit & { chordSteersHead?: boolean } = {}
    ) {
      const send = vi.fn()
      const steerHead = vi.fn(() => true)
      const steerAll = vi.fn(() => true)
      const field = render(
        <Composer
          initialDraft={initialDraft}
          chordSteersHead={chordSteersHead}
          send={send}
          steerHead={steerHead}
          steerAll={steerAll}
        />
      ).container.querySelector('textarea')!
      // Both modifiers: the platform picks which one is the chord's.
      fireEvent.keyDown(field, { key: 'Enter', metaKey: true, ctrlKey: true, ...init })
      return { send, steerHead, steerAll }
    }

    it('steers every card from an empty composer, once per press, only where the chord steers', () => {
      const { send, steerHead, steerAll } = pressModEnter('')
      expect(steerAll).toHaveBeenCalledTimes(1)
      expect(steerHead).not.toHaveBeenCalled()
      expect(send).not.toHaveBeenCalled()
      expect(pressModEnter('', { repeat: true }).steerAll).not.toHaveBeenCalled()
      // With follow-ups off the chord queues, so a second press never steers the card just queued.
      expect(pressModEnter('', { chordSteersHead: false }).steerAll).not.toHaveBeenCalled()
      expect(pressModEnter('steer this').steerAll).not.toHaveBeenCalled()
    })

    it('keeps Shift for the head card alone', () => {
      const { steerHead, steerAll } = pressModEnter('', { shiftKey: true })
      expect(steerHead).toHaveBeenCalledTimes(1)
      expect(steerAll).not.toHaveBeenCalled()
    })
  })
})
