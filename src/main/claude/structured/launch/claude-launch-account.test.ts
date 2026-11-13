import { describe, expect, it, vi } from 'vitest'
import type { ClaudeProfileRouter } from '../../../claude-accounts/profiles/routing/claude-profile-router'
import { prepareClaudeLaunchAccount } from './claude-launch-account'

const preparation = (id: string) => ({
  configDir: `/profiles/${id}`,
  envPatch: { CLAUDE_CONFIG_DIR: `/profiles/${id}` },
  stripAuthEnv: false,
  provenance: `profile:${id}`
})

function router(projectLaunch: ReturnType<typeof preparation> | null) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a test double with only the methods under test
  return {
    prepareAccountLaunch: vi.fn(async () => projectLaunch),
    prepareLaunch: vi.fn(async () => preparation('selected'))
  } as unknown as ClaudeProfileRouter
}

describe('prepareClaudeLaunchAccount', () => {
  it('launches on the project account instead of the selected one', async () => {
    const env: Record<string, string> = {}
    const recipe = await prepareClaudeLaunchAccount(router(preparation('work')), env, '/h', 'work')
    expect(recipe).toEqual({ route: 'managed', accountId: 'work', home: '/profiles/work' })
    expect(env.CLAUDE_CONFIG_DIR).toBe('/profiles/work')
  })

  it('uses the selected account when the project account has no login', async () => {
    const recipe = await prepareClaudeLaunchAccount(router(null), {}, '/h', 'gone')
    expect(recipe).toEqual({ route: 'managed', accountId: 'selected', home: '/profiles/selected' })
  })
})
