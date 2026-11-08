/** One OS process a chat's agent started, as the chat's process list shows it. */
export type AgentSessionProcess = {
  pid: number
  ppid: number
  /** Short program name, such as `node` or `bash`. */
  name: string
  /** What it runs: the shell command a tool call ran, or the full command line. */
  command: string
  /** The agent itself (the CLI) and its supervisor; stopping them ends the chat, so the list offers no stop. */
  role: 'agent' | 'child'
  cpuPercent: number
  rssBytes: number
  /** Seconds since the process started. */
  elapsedSeconds: number
}

export type AgentSessionProcessList =
  | { supported: true; processes: AgentSessionProcess[] }
  /** Hosts that cannot read other processes' environments (macOS, Windows) cannot tell which belong to a chat. */
  | { supported: false; processes: [] }

export type AgentSessionProcessStopResult =
  | { stopped: number[] }
  | { refused: 'not-found' | 'agent-process' | 'unsupported' }
