import { describe, expect, it } from 'vitest'
import { isUpdateCardVisible } from './update-card-visibility'

describe('UpdateCard on a dev release', () => {
  const available = { state: 'available', version: '9.9.9' } as never

  it('hides an official offer nobody asked for', () => {
    expect(
      isUpdateCardVisible({
        status: available,
        dismissedVersion: null,
        cachedVersion: '9.9.9',
        updateUserInitiatedCycle: false,
        devRelease: true
      })
    ).toBe(false)
  })

  it('shows the offer after the user checks for updates', () => {
    expect(
      isUpdateCardVisible({
        status: available,
        dismissedVersion: null,
        cachedVersion: '9.9.9',
        updateUserInitiatedCycle: true,
        devRelease: true
      })
    ).toBe(true)
  })

  it('leaves official builds as they were', () => {
    expect(
      isUpdateCardVisible({
        status: available,
        dismissedVersion: null,
        cachedVersion: '9.9.9',
        updateUserInitiatedCycle: false,
        devRelease: false
      })
    ).toBe(true)
  })
})
