import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import type { RuntimeBuildInfo } from '../../../../shared/runtime-build-info'
import type { RuntimeStatus } from '../../../../shared/runtime-session-contracts'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { useAppStore } from '../../store'
import { translate } from '@/i18n/i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type BuildRow = { name: string; info: RuntimeBuildInfo | null; error?: string }

const STATUS_TIMEOUT_MS = 5_000

async function readBuildInfo(target: RuntimeClientTarget): Promise<RuntimeBuildInfo | null> {
  const status = await callRuntimeRpc<RuntimeStatus>(target, 'status.get', undefined, {
    timeoutMs: STATUS_TIMEOUT_MS,
    suppressFeatureInteraction: true
  })
  return (
    status.buildInfo ??
    (status.appVersion
      ? { version: status.appVersion, commit: '', builtAt: '', devRef: null }
      : null)
  )
}

function formatBuiltAt(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
}

function devReleaseText(devRef: string): string {
  return translate(
    'auto.components.status.bar.BuildInfoStatusSegment.devRelease',
    '*** dev release: {{value0}} ***',
    {
      value0: devRef
    }
  )
}

function BuildDetails({ row }: { row: BuildRow }): React.JSX.Element {
  const { info } = row
  return (
    <div className="space-y-0.5">
      <div className="text-xs font-semibold text-foreground">{row.name}</div>
      {info ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs text-muted-foreground">
          <dt>
            {translate('auto.components.status.bar.BuildInfoStatusSegment.version', 'Version')}
          </dt>
          <dd className="text-foreground">{info.version || '?'}</dd>
          <dt>{translate('auto.components.status.bar.BuildInfoStatusSegment.built', 'Built')}</dt>
          <dd className="text-foreground">{formatBuiltAt(info.builtAt) || '?'}</dd>
          <dt>{translate('auto.components.status.bar.BuildInfoStatusSegment.commit', 'Commit')}</dt>
          <dd className="font-mono text-foreground">
            {info.commit ? info.commit.slice(0, 11) : '?'}
          </dd>
          {info.devRef ? (
            <>
              <dt>
                {translate(
                  'auto.components.status.bar.BuildInfoStatusSegment.devRef',
                  'Dev release'
                )}
              </dt>
              <dd className="font-mono text-foreground">{info.devRef}</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <div className="text-xs text-muted-foreground">
          {row.error ??
            translate(
              'auto.components.status.bar.BuildInfoStatusSegment.noInfo',
              'This server does not report its build.'
            )}
        </div>
      )}
    </div>
  )
}

/** The app's version and build time, a dev-release marker for fork builds, and every connected server's build on click. */
export function BuildInfoStatusSegment(): React.JSX.Element | null {
  const environments = useAppStore((state) => state.runtimeEnvironments)
  const [local, setLocal] = useState<RuntimeBuildInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [servers, setServers] = useState<BuildRow[]>([])

  useEffect(() => {
    let alive = true
    void readBuildInfo({ kind: 'local' })
      .then((info) => alive && setLocal(info))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }
    let alive = true
    // Read when opened: a server can be updated or restarted while the app runs.
    void Promise.all(
      environments.map(async (environment): Promise<BuildRow> => {
        try {
          return {
            name: environment.name,
            info: await readBuildInfo({ kind: 'environment', environmentId: environment.id })
          }
        } catch (error) {
          return {
            name: environment.name,
            info: null,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      })
    ).then((rows) => alive && setServers(rows))
    return () => {
      alive = false
    }
  }, [open, environments])

  if (!local) {
    return null
  }
  const builtAt = formatBuiltAt(local.builtAt)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-3 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={translate(
            'auto.components.status.bar.BuildInfoStatusSegment.ariaLabel',
            'Build information for this app and connected servers'
          )}
        >
          <span>
            {translate(
              'auto.components.status.bar.BuildInfoStatusSegment.label',
              'Orca {{value0}}',
              {
                value0: local.version
              }
            )}
            {builtAt ? ` · ${builtAt}` : ''}
          </span>
          {local.devRef ? (
            <span className="font-semibold text-foreground">{devReleaseText(local.devRef)}</span>
          ) : null}
          <Info className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 space-y-3 p-3">
        <BuildDetails
          row={{
            name: translate(
              'auto.components.status.bar.BuildInfoStatusSegment.thisApp',
              'This app'
            ),
            info: local
          }}
        />
        {servers.map((row) => (
          <BuildDetails key={row.name} row={row} />
        ))}
        {local.devRef ? (
          <button
            type="button"
            className="w-full rounded-md border border-border px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              setOpen(false)
              // A check the user starts shows the official offer even on a dev release.
              void window.api.updater.check({})
            }}
          >
            {translate(
              'auto.components.status.bar.BuildInfoStatusSegment.switchToOfficial',
              'Switch to the official release…'
            )}
          </button>
        ) : null}
        {environments.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            {translate(
              'auto.components.status.bar.BuildInfoStatusSegment.noServers',
              'No servers connected.'
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
