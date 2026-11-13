import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'
import { normalizeUsagePercentageDisplay } from '../../../../../shared/usage-percentage-display'
import { useAppStore } from '../../../store'
import {
  ClaudeAccountShareCells,
  ClaudeAccountUsageMeter
} from '../../status-bar/ClaudeAccountUsageMeter'
import {
  CLAUDE_ACCOUNT_USAGE_TEXT_CLASS,
  claudeAccountUsageTone,
  type ClaudeAccountChatUsage,
  type ClaudeAccountUsage,
  type ClaudeAccountUsageShare
} from '../../status-bar/claude-account-usage-view'
import { clampUsedPercent } from '../../status-bar/tooltip'
import { formatBareUsagePercentage } from '../../status-bar/usage-percentage-label'

function NativeChatAccountUsageCard({
  account,
  chatShare,
  busiestChats
}: {
  account: ClaudeAccountUsage
  chatShare: ClaudeAccountUsageShare | null
  busiestChats: ClaudeAccountChatUsage[]
}): React.JSX.Element {
  const { limits } = account
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-foreground">{account.name}</span>
        {account.email ? (
          <span className="min-w-0 truncate text-xs text-muted-foreground">{account.email}</span>
        ) : null}
      </div>
      <div className="mt-3 space-y-3">
        {limits?.session ? (
          <ClaudeAccountUsageMeter
            label={translate('components.claude-accounts.fiveHour', '5-hour')}
            window={limits.session}
          />
        ) : null}
        {limits?.weekly ? (
          <ClaudeAccountUsageMeter
            label={translate('components.claude-accounts.week', 'Week')}
            window={limits.weekly}
          />
        ) : null}
      </div>
      {chatShare || busiestChats.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
          <li className="flex items-baseline gap-2 text-2xs text-muted-foreground">
            <span className="min-w-0 flex-1" />
            <span className="w-9 shrink-0 text-right">
              {translate('components.claude-accounts.fiveHourShort', '5h')}
            </span>
            <span className="w-9 shrink-0 text-right">
              {translate('auto.components.status.bar.StatusBar.5c938d39ac', 'wk')}
            </span>
          </li>
          {chatShare ? (
            <li className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {translate('components.claude-accounts.thisChat', 'This chat')}
              </span>
              <ClaudeAccountShareCells share={chatShare} />
            </li>
          ) : null}
          {busiestChats.map((chat) => (
            <li key={chat.id} className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-foreground">{chat.title}</span>
              <ClaudeAccountShareCells share={chat} />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-2xs text-muted-foreground">
        {translate(
          'components.claude-accounts.shareEstimate',
          'Chat shares are estimates from token counts.'
        )}
      </p>
    </div>
  )
}

/** Composer label for the chat's Claude account; drops detail as the toolbar narrows. */
export function NativeChatAccountUsageChip({
  account,
  chatShare,
  busiestChats
}: {
  account: ClaudeAccountUsage
  chatShare: ClaudeAccountUsageShare | null
  busiestChats: ClaudeAccountChatUsage[]
}): React.JSX.Element {
  const display = normalizeUsagePercentageDisplay(useAppStore((s) => s.usagePercentageDisplay))
  const [open, setOpen] = useState(false)
  const sessionUsed = account.limits?.session
    ? clampUsedPercent(account.limits.session.usedPercent)
    : null
  const weeklyUsed = account.limits?.weekly
    ? clampUsedPercent(account.limits.weekly.usedPercent)
    : null
  const sessionTone = sessionUsed === null ? 'normal' : claudeAccountUsageTone(sessionUsed)
  const weeklyTone = weeklyUsed === null ? 'normal' : claudeAccountUsageTone(weeklyUsed)
  const fiveHourShort = translate('components.claude-accounts.fiveHourShort', '5h')
  const weekShort = translate('auto.components.status.bar.StatusBar.5c938d39ac', 'wk')
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label={translate(
            'components.claude-accounts.chipLabel',
            'Claude account {{name}}, usage details',
            { name: account.name }
          )}
          className="flex h-7 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs tabular-nums text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          // A readout: opening it must not pull focus out of the composer.
          onMouseDown={(event) => event.preventDefault()}
        >
          <span className="max-w-24 truncate group-data-[tight=true]/toolbar:hidden">
            {account.name}
          </span>
          {sessionUsed !== null ? (
            <span
              className={cn(
                'before:mr-1 before:content-["·"] group-data-[tight=true]/toolbar:before:content-none',
                CLAUDE_ACCOUNT_USAGE_TEXT_CLASS[sessionTone],
                // Why: a nearly spent 5-hour window is the limit about to stop the chat.
                sessionTone === 'normal' && 'group-data-[compact=true]/toolbar:hidden'
              )}
            >
              {fiveHourShort} {formatBareUsagePercentage(sessionUsed, display)}
            </span>
          ) : null}
          {weeklyUsed !== null ? (
            <span
              className={cn(
                'before:mr-1 before:content-["·"]',
                sessionTone === 'normal' && 'group-data-[tight=true]/toolbar:before:content-none',
                CLAUDE_ACCOUNT_USAGE_TEXT_CLASS[weeklyTone]
              )}
            >
              {weekShort} {formatBareUsagePercentage(weeklyUsed, display)}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-80"
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Closing would otherwise focus the label and strand typing.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <NativeChatAccountUsageCard
          account={account}
          chatShare={chatShare}
          busiestChats={busiestChats}
        />
      </PopoverContent>
    </Popover>
  )
}
