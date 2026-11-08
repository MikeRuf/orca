import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cpu, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/rpc/targets/runtime-client-target'
import { callStructuredAgentSession } from '@/runtime/native-chat/requests/structured-agent-session-call'
import { supportsStructuredAgentSessionProcesses } from '@/runtime/native-chat/host-capabilities/structured-agent-session-host-support'
import type {
  AgentSessionProcess,
  AgentSessionProcessList,
  AgentSessionProcessStopResult
} from '../../../../../shared/native-chat/processes/agent-session-process-list'
import type { NativeChatStructuredComposerTransport } from '../composer/submit/native-chat-structured-composer-transport'

const REFRESH_MS = 2000

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`
  }
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

type RowNote = { pid: number; text: string; failed: boolean }

/** Composer button listing every OS process this chat's agent started, with a stop for each. */
export function NativeChatProcessMonitor({
  sessionId,
  runtimeEnvironmentId
}: {
  sessionId: string
  runtimeEnvironmentId: string | null
}): React.JSX.Element | null {
  const t = useTranslate()
  const [supported, setSupported] = useState(false)
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<AgentSessionProcessList | null>(null)
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState<RowNote | null>(null)
  const target = runtimeTargetForOwnerEnvironment(runtimeEnvironmentId)
  const targetKey = runtimeEnvironmentId ?? ''

  useEffect(() => {
    let current = true
    void supportsStructuredAgentSessionProcesses(
      runtimeTargetForOwnerEnvironment(targetKey || null)
    )
      .then((yes) => current && setSupported(yes))
      .catch(() => current && setSupported(false))
    return () => {
      current = false
    }
  }, [targetKey])

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await callStructuredAgentSession<AgentSessionProcessList>(
        runtimeTargetForOwnerEnvironment(targetKey || null),
        'agentSession.processes',
        { sessionId }
      )
      setList(next)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [sessionId, targetKey])

  useEffect(() => {
    if (!open) {
      return
    }
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [open, refresh])

  const stop = async (process: AgentSessionProcess): Promise<void> => {
    try {
      const result = await callStructuredAgentSession<AgentSessionProcessStopResult>(
        target,
        'agentSession.stopProcess',
        { sessionId, pid: process.pid }
      )
      setNote(
        'stopped' in result
          ? {
              pid: process.pid,
              text: t('components.native-chat.processes.stopped', 'Stop sent'),
              failed: false
            }
          : {
              pid: process.pid,
              text: t('components.native-chat.processes.stopRefused', 'Could not stop it'),
              failed: true
            }
      )
    } catch {
      setNote({
        pid: process.pid,
        text: t('components.native-chat.processes.stopRefused', 'Could not stop it'),
        failed: true
      })
    }
    void refresh()
  }

  if (!supported) {
    return null
  }
  const label = t('components.native-chat.processes.label', 'Processes this chat started')
  const processes = list?.processes ?? []
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              aria-expanded={open}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"
              onMouseDown={(event) => event.preventDefault()}
            >
              <Cpu className="size-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {label}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        aria-label={label}
        side="top"
        align="end"
        sideOffset={8}
        className="w-[min(36rem,calc(100vw-2rem))]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">
              {t('components.native-chat.processes.title', 'Processes')}
            </span>
            {list?.supported ? (
              <span className="tabular-nums text-muted-foreground">{processes.length}</span>
            ) : null}
          </div>
          {failed ? (
            <p className="mt-3 text-xs text-destructive">
              {t('components.native-chat.processes.loadFailed', 'Could not read the process list.')}
            </p>
          ) : list && !list.supported ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t(
                'components.native-chat.processes.unsupported',
                'Process lists are available when the chat runs on a Linux host.'
              )}
            </p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-xs">
              {processes.map((process) => (
                <li key={process.pid} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground">{process.name}</span>
                      <span className="tabular-nums text-muted-foreground">{process.pid}</span>
                      {process.role === 'agent' ? (
                        <span className="text-muted-foreground">
                          {t('components.native-chat.processes.agent', 'agent')}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="truncate font-mono text-muted-foreground"
                      title={process.command}
                    >
                      {process.command}
                    </div>
                    {note?.pid === process.pid ? (
                      <div
                        role="status"
                        className={note.failed ? 'text-destructive' : 'text-muted-foreground'}
                      >
                        {note.text}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right tabular-nums text-muted-foreground">
                    <div>{process.cpuPercent}%</div>
                    <div>{formatBytes(process.rssBytes)}</div>
                    <div>{formatElapsed(process.elapsedSeconds)}</div>
                  </div>
                  {process.role === 'child' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('components.native-chat.processes.stop', 'Stop {{name}}', {
                        name: `${process.name} ${process.pid}`
                      })}
                      onClick={() => void stop(process)}
                    >
                      <Square className="size-3" />
                    </Button>
                  ) : (
                    <span className="size-6 shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** The composer's process button, memoized so the memoized composer actions skip keystrokes. */
export function useNativeChatProcessMonitor(
  transport: NativeChatStructuredComposerTransport | null | undefined
): React.JSX.Element | undefined {
  const sessionId = transport && transport.sessionPending !== true ? transport.sessionId : null
  const environmentId = transport?.runtimeEnvironmentId ?? null
  return useMemo(
    () =>
      sessionId ? (
        <NativeChatProcessMonitor sessionId={sessionId} runtimeEnvironmentId={environmentId} />
      ) : undefined,
    [sessionId, environmentId]
  )
}
