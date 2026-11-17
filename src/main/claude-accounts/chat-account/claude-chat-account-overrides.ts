import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeFileAtomically } from '../../filesystem/atomic-file-publication'
import { getProfileUserDataPath } from '../../orca-profiles/profile-storage-paths'

const OVERRIDES_FILE_NAME = 'claude-chat-accounts.json'

let overrides: Record<string, string> | null = null

function overridesPath(): string {
  return join(getProfileUserDataPath(), OVERRIDES_FILE_NAME)
}

function loadOverrides(): Record<string, string> {
  if (overrides) {
    return overrides
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(overridesPath(), 'utf8'))
    overrides =
      parsed && typeof parsed === 'object'
        ? Object.fromEntries(
            Object.entries(parsed).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          )
        : {}
  } catch {
    overrides = {}
  }
  return overrides
}

/** The Claude account one chat was switched to; null follows the project, then the selection. */
export function chatClaudeAccountId(sessionId: string): string | null {
  return loadOverrides()[sessionId] ?? null
}

export function setChatClaudeAccountId(sessionId: string, accountId: string | null): void {
  const next = { ...loadOverrides() }
  if (accountId) {
    next[sessionId] = accountId
  } else {
    delete next[sessionId]
  }
  writeFileAtomically(overridesPath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  overrides = next
}
