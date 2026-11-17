import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'
import { callStructuredAgentSession } from '@/runtime/native-chat/requests/structured-agent-session-call'
import { supportsStructuredAgentSessionClaudeAccountSwitch } from '@/runtime/native-chat/host-capabilities/structured-agent-session-host-support'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import type { AgentSessionClaudeAccountSwitch } from '../../../../../shared/agent-session/agent-session-claude-account-switch'
import { CLAUDE_SYSTEM_ACCOUNT_ID } from '../../../../../shared/claude-accounts-overview'
import type { ClaudeAccountUsage } from '../../status-bar/claude-account-usage-view'

type Note = { accountId: string | null; text: string; failed: boolean }

/** Moves this chat alone to another account; its agent restarts there and resumes at the next message. */
export function NativeChatAccountSwitchList({
  target,
  sessionId,
  accounts,
  chosenId,
  onSwitched
}: {
  target: RuntimeClientTarget
  sessionId: string
  accounts: ClaudeAccountUsage[]
  chosenId: string | null
  onSwitched: () => Promise<void>
}): React.JSX.Element | null {
  const [supported, setSupported] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note | null>(null)

  useEffect(() => {
    let current = true
    void supportsStructuredAgentSessionClaudeAccountSwitch(target)
      .then((yes) => current && setSupported(yes))
      .catch(() => current && setSupported(false))
    return () => {
      current = false
    }
  }, [target])

  // Only a managed login can be pinned to one chat; System default is what the selection runs.
  const choices = accounts.filter(
    (account) => account.id !== CLAUDE_SYSTEM_ACCOUNT_ID && !account.signedOut
  )
  if (!supported || choices.length === 0) {
    return null
  }

  const pick = async (accountId: string | null): Promise<void> => {
    setBusy(true)
    setNote(null)
    try {
      const result = await callStructuredAgentSession<AgentSessionClaudeAccountSwitch>(
        target,
        'agentSession.setClaudeAccount',
        { sessionId, accountId }
      )
      if (result.status === 'switched') {
        setNote({
          accountId,
          failed: false,
          text: translate(
            'components.claude-accounts.switchPending',
            'Switches at your next message; the chat resumes there.'
          )
        })
        await onSwitched()
      } else {
        setNote({
          accountId,
          failed: true,
          text: translate(
            'components.claude-accounts.switchSignedOut',
            'That account is not signed in on this host.'
          )
        })
      }
    } catch {
      setNote({
        accountId,
        failed: true,
        text: translate('components.claude-accounts.switchFailed', 'Could not switch the account.')
      })
    } finally {
      setBusy(false)
    }
  }

  const row = (accountId: string | null, label: string, selected: boolean): React.JSX.Element => (
    <li key={accountId ?? 'project'}>
      <button
        type="button"
        disabled={busy || selected}
        onClick={() => void pick(accountId)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
          selected ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
      >
        <Check className={cn('size-3 shrink-0', !selected && 'invisible')} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {note && note.accountId === accountId ? (
        <p
          role="status"
          className={cn(
            'px-2 pb-1 pl-7 text-2xs',
            note.failed ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {note.text}
        </p>
      ) : null}
    </li>
  )

  return (
    <div className="border-t border-border px-2 py-2">
      <p className="px-2 pb-1 text-2xs text-muted-foreground">
        {translate('components.claude-accounts.switchHeading', 'Run this chat on')}
      </p>
      <ul>
        {row(
          null,
          translate('components.claude-accounts.switchFollowProject', 'Project default'),
          chosenId === null
        )}
        {choices.map((account) =>
          row(account.id, account.email ?? account.name, chosenId === account.id)
        )}
      </ul>
    </div>
  )
}
