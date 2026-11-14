import { describe, expect, it } from 'vitest'
import { SettingsUpdate } from './client-settings-params'

describe('settings.update nativeChatIdleStopMinutes', () => {
  it('accepts a window and 0, which means never', () => {
    expect(SettingsUpdate.parse({ nativeChatIdleStopMinutes: 60 }).nativeChatIdleStopMinutes).toBe(
      60
    )
    expect(SettingsUpdate.parse({ nativeChatIdleStopMinutes: 0 }).nativeChatIdleStopMinutes).toBe(0)
  })

  it('refuses a value the idle sweep could not use', () => {
    for (const value of [-1, 1.5, '30', null]) {
      expect(SettingsUpdate.safeParse({ nativeChatIdleStopMinutes: value }).success).toBe(false)
    }
  })
})
