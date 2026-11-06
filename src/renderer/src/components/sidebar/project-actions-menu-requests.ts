import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import type { Repo } from '../../../../shared/repo-types'

type RepoKey = Pick<Repo, 'id' | 'executionHostId' | 'connectionId'>
type Listener = () => void

// Header rows are rendered by plain functions, so a right-click reaches the menu component through this channel.
const listenersByKey = new Map<string, Set<Listener>>()

function keyOf(repo: RepoKey): string {
  return `${getRepoExecutionHostId(repo)}\u0000${repo.id}`
}

export function subscribeProjectActionsMenu(repo: RepoKey, listener: Listener): () => void {
  const key = keyOf(repo)
  const listeners = listenersByKey.get(key) ?? new Set<Listener>()
  listeners.add(listener)
  listenersByKey.set(key, listeners)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      listenersByKey.delete(key)
    }
  }
}

/** Opens the project's actions menu; false when no menu is mounted, so the caller keeps the default. */
export function requestProjectActionsMenu(repo: RepoKey): boolean {
  const listeners = listenersByKey.get(keyOf(repo))
  if (!listeners || listeners.size === 0) {
    return false
  }
  for (const listener of listeners) {
    listener()
  }
  return true
}

/** Right-click handler for a project header: opens its actions menu instead of the browser menu. */
export function projectHeaderContextMenu(
  repo: RepoKey | undefined
): ((event: { preventDefault: () => void }) => void) | undefined {
  if (!repo) {
    return undefined
  }
  return (event) => {
    if (requestProjectActionsMenu(repo)) {
      event.preventDefault()
    }
  }
}
