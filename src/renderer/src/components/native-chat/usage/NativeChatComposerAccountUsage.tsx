import { useMemo } from 'react'
import { getRepoIdFromWorktreeId } from '../../../../../shared/worktree/id'
import { useAppStore } from '../../../store'
import {
  buildClaudeAccountUsage,
  resolveClaudeChatAccountId
} from '../../status-bar/claude-account-usage-model'
import {
  repoRuntimeTarget,
  useClaudeAccountsOverview
} from '../../status-bar/use-claude-accounts-overview'
import { NativeChatAccountUsageChip } from './NativeChatAccountUsageChip'

const BUSIEST_CHATS = 3

function ComposerAccountUsage({
  target,
  worktreeId,
  sessionId
}: {
  target: Parameters<typeof useClaudeAccountsOverview>[0]
  worktreeId: string
  sessionId: string
}): React.JSX.Element | null {
  const repos = useAppStore((state) => state.repos)
  const { overview } = useClaudeAccountsOverview(target)
  const view = useMemo(() => {
    if (!overview) {
      return null
    }
    const accountId = resolveClaudeChatAccountId(overview, repos, worktreeId, sessionId)
    const account = buildClaudeAccountUsage(overview, repos).find(({ id }) => id === accountId)
    return account
      ? { account, chatShare: account.chats.find(({ id }) => id === sessionId) ?? null }
      : null
  }, [overview, repos, worktreeId, sessionId])
  if (!view) {
    return null
  }
  return (
    <NativeChatAccountUsageChip
      account={view.account}
      chatShare={view.chatShare}
      busiestChats={view.account.chats.slice(0, BUSIEST_CHATS)}
    />
  )
}

/** The account label for a chat, read from the host that runs it. */
export function NativeChatComposerAccountUsage({
  worktreeId,
  sessionId
}: {
  worktreeId: string
  sessionId: string
}): React.JSX.Element | null {
  const repoId = getRepoIdFromWorktreeId(worktreeId)
  const repo = useAppStore((state) => state.repos.find((entry) => entry.id === repoId))
  const target = useMemo(() => (repo ? repoRuntimeTarget(repo) : null), [repo])
  return target ? (
    <ComposerAccountUsage target={target} worktreeId={worktreeId} sessionId={sessionId} />
  ) : null
}
