import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { ClaudeAccountsOverview } from '../../../../shared/claude-accounts-overview'
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId,
  toRuntimeExecutionHostId
} from '../../../../shared/execution-host'
import type { Repo } from '../../../../shared/repo-types'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/rpc/targets/runtime-client-target'
import { getProviderAccountsOwnerKey } from '@/runtime/provider-accounts/observations/runtime-provider-accounts-client'
import { useAppStore } from '@/store'

const POLL_MS = 60_000

type OverviewState = { overview: ClaudeAccountsOverview | null; isRefreshing: boolean }
type OverviewEntry = {
  state: OverviewState
  listeners: Set<() => void>
  timer: ReturnType<typeof setInterval> | null
}

const NO_OVERVIEW: OverviewState = { overview: null, isRefreshing: false }
// Every composer and the status bar read one poll per host.
const entries = new Map<string, OverviewEntry>()

function entryFor(key: string): OverviewEntry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { state: NO_OVERVIEW, listeners: new Set(), timer: null }
    entries.set(key, entry)
  }
  return entry
}

function publish(entry: OverviewEntry, state: OverviewState): void {
  entry.state = state
  entry.listeners.forEach((listener) => listener())
}

async function loadOverview(
  entry: OverviewEntry,
  target: RuntimeClientTarget,
  refreshUsage: boolean
): Promise<void> {
  publish(entry, { ...entry.state, isRefreshing: refreshUsage })
  // A host too old for this call keeps its last answer, and with none the views stay hidden.
  const overview = await callRuntimeRpc<ClaudeAccountsOverview>(
    target,
    'accounts.claudeOverview',
    { refreshUsage },
    { timeoutMs: 30_000 }
  ).catch(() => entry.state.overview)
  publish(entry, { overview, isRefreshing: false })
}

export function repoRuntimeTarget(repo: Repo): RuntimeClientTarget {
  const host = parseExecutionHostId(getRepoExecutionHostId(repo))
  return runtimeTargetForOwnerEnvironment(host?.kind === 'runtime' ? host.environmentId : null)
}

/** The name of the host whose accounts these are, as the sidebar shows it. */
export function useClaudeAccountsHostLabel(target: RuntimeClientTarget): string {
  const hostId =
    target.kind === 'environment'
      ? toRuntimeExecutionHostId(target.environmentId)
      : LOCAL_EXECUTION_HOST_ID
  return useAppStore((state) => selectExecutionHostDisplayLabel(state, hostId))
}

export function useClaudeAccountsOverview(target: RuntimeClientTarget): OverviewState & {
  refresh: () => Promise<void>
} {
  const key = getProviderAccountsOwnerKey(target)
  const subscribe = useCallback(
    (listener: () => void) => {
      const entry = entryFor(key)
      entry.listeners.add(listener)
      if (!entry.timer) {
        void loadOverview(entry, target, true)
        entry.timer = setInterval(() => void loadOverview(entry, target, false), POLL_MS)
      }
      return () => {
        entry.listeners.delete(listener)
        if (entry.listeners.size === 0 && entry.timer) {
          clearInterval(entry.timer)
          entry.timer = null
        }
      }
    },
    // The key names the target; a fresh object for the same host must not resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )
  const state = useSyncExternalStore(subscribe, () => entries.get(key)?.state ?? NO_OVERVIEW)
  const refresh = useCallback(
    () => loadOverview(entryFor(key), target, true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )
  return useMemo(() => ({ ...state, refresh }), [state, refresh])
}
