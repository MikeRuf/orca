import { useState } from 'react'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { agentSessionContextWindowLabel } from '../../../../../../../shared/agent-session/options/agent-session-context-window'

/** A typed size beside a select's presets, entered in thousands of tokens. */
export function NativeChatCustomOptionValue(props: {
  range: { min: number; max: number }
  disabled: boolean
  onSet: (value: string) => void
}): React.JSX.Element {
  const { range, disabled, onSet } = props
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {translate('components.native-chat.composer.customValue', 'Custom…')}
      </Button>
    )
  }
  const apply = (): void => {
    const thousands = Number(text.trim())
    const tokens = Math.round(thousands * 1000)
    if (!Number.isFinite(thousands) || tokens < range.min || tokens > range.max) {
      setError(
        translate(
          'components.native-chat.composer.customValueRange',
          'Use {{value0}} to {{value1}}',
          {
            value0: agentSessionContextWindowLabel(range.min),
            value1: agentSessionContextWindowLabel(range.max)
          }
        )
      )
      return
    }
    setError(null)
    setOpen(false)
    setText('')
    onSet(String(tokens))
  }
  return (
    <div className="flex basis-full flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          inputMode="numeric"
          density="compact"
          className="w-20"
          value={text}
          placeholder="350"
          aria-label={translate(
            'components.native-chat.composer.customValueLabel',
            'Size in thousands of tokens'
          )}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          // Why stop: the surrounding menu treats letters and Enter as its own navigation keys.
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              apply()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setOpen(false)
              setError(null)
            }
          }}
        />
        <span className="text-xs text-muted-foreground">K</span>
      </div>
      <Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={apply}>
        {translate('components.native-chat.composer.customValueApply', 'Set')}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
