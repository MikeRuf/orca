import { isProviderRecord } from '../../../provider-process/provider-json-record'

// The switchboard waiter's wake line; ~/projects/common/messaging/switchboard/session.py wake_line.
const SWITCHBOARD_WAKE_PREFIX = 'Switchboard:'

/**
 * An asyncRewake hook can only wake its session by exiting 2, and the frame does not say the hook
 * is asyncRewake, so the waiter's own stderr prefix identifies a wake. Every other nonzero exit
 * (1, 137, 143, ...) is still a hook failure.
 */
export function claudeRewakeHookLine(payload: unknown): string | null {
  if (!isProviderRecord(payload) || payload.exit_code !== 2) {
    return null
  }
  const stderr = typeof payload.stderr === 'string' ? payload.stderr.trim() : ''
  return stderr.startsWith(SWITCHBOARD_WAKE_PREFIX) ? stderr : null
}
