import { describe, expect, it } from 'vitest'
import { unhandledProviderFrameJournalItem } from './unhandled-provider-frame'

function hookResponse(exitCode: number, stderr: string): Record<string, unknown> {
  return {
    type: 'system',
    subtype: 'hook_response',
    hook_name: 'SessionStart:resume',
    hook_event: 'SessionStart',
    stderr,
    exit_code: exitCode,
    outcome: 'error'
  }
}

describe('Claude asyncRewake wake frames', () => {
  it('shows a switchboard wake as a plain line', () => {
    const item = unhandledProviderFrameJournalItem(
      'claude',
      'message:system:hook_response',
      hookResponse(2, 'Switchboard: message from mike\n')
    )
    expect(item?.classification).toBe('timeline-substantive')
    expect(item?.body).toMatchObject({ text: 'Switchboard: message from mike' })
    expect(item?.body).not.toHaveProperty('tone')
  })

  it('keeps a killed hook a failure even with the wake prefix', () => {
    const item = unhandledProviderFrameJournalItem(
      'claude',
      'message:system:hook_response',
      hookResponse(137, 'Switchboard: message from mike')
    )
    expect(item?.classification).toBe('error-surface')
    expect(item?.body).toMatchObject({
      tone: 'error',
      text: 'Claude SessionStart:resume hook failed (exit code 137): Switchboard: message from mike'
    })
  })
})
