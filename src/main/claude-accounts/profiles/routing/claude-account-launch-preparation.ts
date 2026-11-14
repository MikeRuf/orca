import { CLAUDE_INJECTED_CONFIG_DIR_ENV } from '../../../../shared/claude-profile-routing'
import type { ClaudeRuntimeAuthPreparation } from '../../runtime-auth/runtime-auth-types'

/** The environment one launch needs to run on this account's folder. */
export function claudeAccountLaunchPreparation(
  accountId: string,
  home: string
): ClaudeRuntimeAuthPreparation {
  return {
    configDir: home,
    runtime: 'host',
    wslDistro: null,
    wslLinuxConfigDir: null,
    envPatch: { CLAUDE_CONFIG_DIR: home, [CLAUDE_INJECTED_CONFIG_DIR_ENV]: home },
    provenance: `profile:${accountId}`
  }
}
