import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/rpc/targets/runtime-client-target'
import { callStructuredAgentSession } from '@/runtime/native-chat/requests/structured-agent-session-call'
import { supportsStructuredAgentSessionProcesses } from '@/runtime/native-chat/host-capabilities/structured-agent-session-host-support'
import type {
  AgentSessionProcess,
  AgentSessionProcessList,
  AgentSessionProcessStopResult
} from '../../../../../shared/native-chat/processes/agent-session-process-list'
import type { NativeChatStructuredComposerTransport } from '../composer/submit/native-chat-structured-composer-transport'
import { useProcessListSize } from './use-process-list-size'

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
  const { size, startResize } = useProcessListSize()
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
        className="w-auto p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative flex flex-col" style={{ width: size.width, height: size.height }}>
          <div
            role="separator"
            aria-label={t('components.native-chat.processes.resize', 'Drag to resize')}
            title={t('components.native-chat.processes.resize', 'Drag to resize')}
            className="absolute left-0 top-0 z-10 size-4 cursor-nwse-resize touch-none"
            onPointerDown={startResize}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 text-muted-foreground/60">
              <path d="M4 12 L12 4 M4 8 L8 4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 pb-2 pt-3 text-sm">
            <span className="font-medium text-foreground">
              {t('components.native-chat.processes.title', 'Processes')}
            </span>
            {list?.supported ? (
              <span className="tabular-nums text-muted-foreground">{processes.length}</span>
            ) : null}
          </div>
          {failed ? (
            <p className="px-4 py-3 text-xs text-destructive">
              {t('components.native-chat.processes.loadFailed', 'Could not read the process list.')}
            </p>
          ) : list && !list.supported ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              {t(
                'components.native-chat.processes.unsupported',
                'Process lists are available when the chat runs on a Linux host.'
              )}
            </p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-4 text-xs">
              {processes.map((process) => (
                <li key={process.pid} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{process.name}</span>
                    <span className="tabular-nums text-muted-foreground">{process.pid}</span>
                    {process.role === 'agent' ? (
                      <span className="rounded-sm bg-muted px-1.5 py-px text-2xs text-muted-foreground">
                        {t('components.native-chat.processes.agent', 'agent')}
                      </span>
                    ) : null}
                    <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                      {process.cpuPercent}% · {formatBytes(process.rssBytes)} ·{' '}
                      {formatElapsed(process.elapsedSeconds)}
                    </span>
                    {process.role === 'child' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        aria-label={t('components.native-chat.processes.stop', 'Stop {{name}}', {
                          name: `${process.name} ${process.pid}`
                        })}
                        onClick={() => void stop(process)}
                      >
                        {t('components.native-chat.processes.stopButton', 'Stop')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-all font-mono text-muted-foreground">
                    {process.command}
                  </div>
                  {note?.pid === process.pid ? (
                    <div
                      role="status"
                      className={cn(
                        'mt-1',
                        note.failed ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {note.text}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {processes.some((process) => process.role === 'agent') ? (
            <p className="border-t border-border px-4 py-2 text-2xs text-muted-foreground">
              {t(
                'components.native-chat.processes.agentNote',
                'Agent processes run the chat itself, so they have no Stop button. Closing the chat ends them.'
              )}
            </p>
          ) : null}
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
