import { Button } from '@/components/ui/button'
import { defineFixture } from '../../../component-fixtures/component-fixture'
import { fixtureLimits, workAccount } from '../../status-bar/claude-account-usage.fixture-data'
import { NativeChatAccountUsageChip } from './NativeChatAccountUsageChip'
import { NativeChatComposerToolbar } from '../composer/controls/NativeChatComposerToolbar'

function Bar({
  width,
  session = 42,
  weekly = 18
}: {
  width: number
  session?: number
  weekly?: number
}): React.JSX.Element {
  return (
    <div style={{ width }} className="rounded-md border border-border p-1.5">
      <NativeChatComposerToolbar
        left={[
          {
            id: 'attach',
            priority: 3,
            content: (
              <Button size="sm" variant="ghost">
                Attach
              </Button>
            )
          }
        ]}
        right={[
          {
            id: 'account',
            priority: 1,
            content: (
              <NativeChatAccountUsageChip
                account={{ ...workAccount, limits: fixtureLimits(session, weekly) }}
                chatShare={null}
                busiestChats={[]}
              />
            )
          },
          {
            id: 'model',
            content: (
              <Button size="sm" variant="ghost">
                Opus 5.5
              </Button>
            )
          }
        ]}
        primary={<Button size="sm">Send</Button>}
      />
    </div>
  )
}

export const widths = defineFixture({
  width: 560,
  render: () => (
    <div className="space-y-3 bg-background p-3 text-xs text-muted-foreground">
      <Bar width={520} />
      <Bar width={350} />
      <Bar width={325} />
      <Bar width={200} />
      <Bar width={520} session={86} weekly={62} />
      <Bar width={380} session={86} weekly={62} />
      <Bar width={380} session={97} weekly={96} />
    </div>
  )
})

export const panel = defineFixture({
  width: 420,
  render: () => (
    <div className="flex h-[400px] items-end justify-end bg-background p-3">
      <NativeChatAccountUsageChip
        account={workAccount}
        chatShare={{ sessionPercent: 14, weeklyPercent: 4 }}
        busiestChats={workAccount.chats.slice(1)}
      />
    </div>
  ),
  interact: (frame) => {
    frame.querySelector<HTMLButtonElement>('button[aria-expanded]')?.click()
  }
})
