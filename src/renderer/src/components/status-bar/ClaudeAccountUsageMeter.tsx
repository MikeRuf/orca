import { useResetCountdownClock } from '@/hooks/useResetCountdownClock'
import { cn } from '@/lib/class-names'
import { formatResetCountdown } from '../../../../shared/rate-limit-reset-format'
import type { RateLimitWindow } from '../../../../shared/rate-limit-types'
import { normalizeUsagePercentageDisplay } from '../../../../shared/usage-percentage-display'
import { useAppStore } from '../../store'
import {
  CLAUDE_ACCOUNT_USAGE_BAR_CLASS,
  CLAUDE_ACCOUNT_USAGE_TEXT_CLASS,
  claudeAccountUsageTone,
  type ClaudeAccountUsageShare
} from './claude-account-usage-view'
import { clampUsedPercent } from './tooltip'
import { formatBareUsagePercentage } from './usage-percentage-label'

/** One limit window: label, percent, bar, and reset time. */
export function ClaudeAccountUsageMeter({
  label,
  window
}: {
  label: string
  window: RateLimitWindow
}): React.JSX.Element {
  const display = normalizeUsagePercentageDisplay(useAppStore((s) => s.usagePercentageDisplay))
  const now = useResetCountdownClock([window.resetsAt])
  const used = clampUsedPercent(window.usedPercent)
  const tone = claudeAccountUsageTone(used)
  return (
    <div className="min-w-0 text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-foreground">{label}</span>
        <span
          className={cn(
            'tabular-nums text-muted-foreground',
            CLAUDE_ACCOUNT_USAGE_TEXT_CLASS[tone]
          )}
        >
          {formatBareUsagePercentage(used, display)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', CLAUDE_ACCOUNT_USAGE_BAR_CLASS[tone])}
          style={{ width: `${used}%` }}
        />
      </div>
      {window.resetsAt != null ? (
        <div className="mt-1 text-2xs text-muted-foreground">
          {formatResetCountdown(window.resetsAt - now)}
        </div>
      ) : null}
    </div>
  )
}

function formatShare(percent: number | null): string {
  return percent === null ? '-' : `~${Math.round(percent)}%`
}

export function ClaudeAccountShareCells({
  share
}: {
  share: ClaudeAccountUsageShare
}): React.JSX.Element {
  return (
    <>
      <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
        {formatShare(share.sessionPercent)}
      </span>
      <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
        {formatShare(share.weeklyPercent)}
      </span>
    </>
  )
}
