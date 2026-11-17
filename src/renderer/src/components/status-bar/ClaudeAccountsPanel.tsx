import { useState } from 'react'
import { Check, ChevronRight, Loader2, Plus, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'
import { ClaudeAccountShareCells, ClaudeAccountUsageMeter } from './ClaudeAccountUsageMeter'
import type { ClaudeAccountChatUsage, ClaudeAccountUsage } from './claude-account-usage-view'

function ChatRow({
  chat,
  onOpenChat
}: {
  chat: ClaudeAccountChatUsage
  onOpenChat: (chatId: string) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpenChat(chat.id)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          chat.working ? 'bg-status-success' : 'bg-muted-foreground/40'
        )}
      />
      <span className="min-w-0 flex-1 truncate text-foreground">{chat.title}</span>
      <ClaudeAccountShareCells share={chat} />
    </button>
  )
}

function AccountRowDetails({
  account,
  onOpenChat
}: {
  account: ClaudeAccountUsage
  onOpenChat: (chatId: string) => void
}): React.JSX.Element {
  return (
    <div className="mt-2 space-y-2 pl-6">
      <div className="text-xs">
        <span className="text-muted-foreground">
          {translate('components.claude-accounts.projects', 'Projects')}:{' '}
        </span>
        <span className="text-foreground">
          {account.projects.length > 0
            ? account.projects.join(', ')
            : translate('components.claude-accounts.noProjects', 'None assigned')}
        </span>
      </div>
      {account.chats.length > 0 || account.otherUse ? (
        <div>
          <div className="flex gap-2 px-1 text-2xs text-muted-foreground">
            <span className="min-w-0 flex-1">
              {translate('components.claude-accounts.chats', 'Chats')}
            </span>
            <span className="w-10 shrink-0 text-right">
              {translate('components.claude-accounts.fiveHourShort', '5h')}
            </span>
            <span className="w-10 shrink-0 text-right">
              {translate('auto.components.status.bar.StatusBar.5c938d39ac', 'wk')}
            </span>
          </div>
          {account.chats.map((chat) => (
            <ChatRow key={chat.id} chat={chat} onOpenChat={onOpenChat} />
          ))}
          {account.otherUse ? (
            <div className="flex items-center gap-2 px-1 py-0.5 text-xs">
              <span className="size-1.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {translate('components.claude-accounts.otherUse', 'Other use')}
              </span>
              <ClaudeAccountShareCells share={account.otherUse} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AccountRow({
  account,
  defaultOpen,
  onSetDefault,
  onSignIn,
  onOpenChat
}: {
  account: ClaudeAccountUsage
  defaultOpen: boolean
  onSetDefault: (accountId: string) => void
  onSignIn: (accountId: string) => void
  onOpenChat: (chatId: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const working = account.chats.filter((chat) => chat.working).length
  const { limits } = account
  return (
    <div className="px-3 py-2.5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={translate(
                'components.claude-accounts.toggleDetails',
                'Toggle account details'
              )}
            >
              <ChevronRight className={cn('size-3.5', open && 'rotate-90')} />
            </Button>
          </CollapsibleTrigger>
          <button
            type="button"
            disabled={account.isDefault || account.signedOut}
            aria-pressed={account.isDefault}
            aria-label={translate(
              'components.claude-accounts.setDefault',
              'Use {{name}} for projects with no account',
              { name: account.name }
            )}
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-foreground outline-none enabled:hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onSetDefault(account.id)}
          >
            {account.isDefault ? <Check className="size-3.5" /> : null}
          </button>
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {account.name}
          </span>
          {account.email ? (
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {account.email}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          {account.signedOut ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="shrink-0"
              onClick={() => onSignIn(account.id)}
            >
              {translate('components.claude-accounts.signIn', 'Sign in')}
            </Button>
          ) : account.chats.length > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {working > 0 ? <span className="size-1.5 rounded-full bg-status-success" /> : null}
              {account.chats.length === 1
                ? translate('components.claude-accounts.oneChat', '1 chat')
                : translate('components.claude-accounts.chatCount', '{{count}} chats', {
                    count: account.chats.length
                  })}
            </span>
          ) : null}
        </div>
        {!account.signedOut && (limits?.session || limits?.weekly) ? (
          <div className="mt-2 grid grid-cols-2 gap-3 pl-6">
            {limits.session ? (
              <ClaudeAccountUsageMeter
                label={translate('components.claude-accounts.fiveHour', '5-hour')}
                window={limits.session}
              />
            ) : null}
            {limits.weekly ? (
              <ClaudeAccountUsageMeter
                label={translate('components.claude-accounts.week', 'Week')}
                window={limits.weekly}
              />
            ) : null}
          </div>
        ) : null}
        <CollapsibleContent>
          <AccountRowDetails account={account} onOpenChat={onOpenChat} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/** Every Claude account with its limits, projects, and chats; opened from the status bar meters. */
export function ClaudeAccountsPanel({
  hostLabel,
  accounts,
  viewedAccountId,
  updatedAgoMinutes,
  isRefreshing,
  onRefresh,
  onSetDefault,
  onSignIn,
  onOpenChat,
  onAddAccount,
  onManageAccounts
}: {
  /** Each host keeps its own accounts, so an empty list must say whose it is. */
  hostLabel: string
  accounts: ClaudeAccountUsage[]
  /** The account of the chat on screen starts expanded. */
  viewedAccountId: string | null
  updatedAgoMinutes: number | null
  isRefreshing: boolean
  onRefresh: () => void
  onSetDefault: (accountId: string) => void
  onSignIn: (accountId: string) => void
  onOpenChat: (chatId: string) => void
  onAddAccount: () => void
  onManageAccounts: () => void
}): React.JSX.Element {
  return (
    <div className="w-[26rem] max-w-[calc(100vw-1rem)]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {translate('components.claude-accounts.titleOnHost', 'Claude accounts on {{host}}', {
            host: hostLabel
          })}
        </span>
        <span className="ml-auto shrink-0 text-right text-xs text-muted-foreground">
          {updatedAgoMinutes === null
            ? null
            : translate('components.claude-accounts.updatedAgo', 'Updated {{minutes}} min ago', {
                minutes: String(updatedAgoMinutes)
              })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={isRefreshing}
          aria-label={translate('components.claude-accounts.refresh', 'Refresh usage')}
          onClick={onRefresh}
        >
          {isRefreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>
      <div className="max-h-[60vh] divide-y divide-border overflow-y-auto scrollbar-sleek">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            defaultOpen={account.id === viewedAccountId}
            onSetDefault={onSetDefault}
            onSignIn={onSignIn}
            onOpenChat={onOpenChat}
          />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={onAddAccount}>
          <Plus />
          {translate('components.claude-accounts.addAccount', 'Add account')}
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={onManageAccounts}>
          <Settings />
          {translate('components.claude-accounts.manageAccounts', 'Manage accounts')}
        </Button>
      </div>
    </div>
  )
}
