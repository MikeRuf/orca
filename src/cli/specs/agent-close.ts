import type { CommandSpec } from '../discovery/command-spec'
import { CLI_GLOBAL_FLAGS as GLOBAL_FLAGS } from '../../shared/cli-argument-boundary'

export const AGENT_CLOSE_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['agent', 'close'],
    summary: 'Close a chat tab the way its close button does',
    usage: 'orca agent close --session <sessionId> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'session'],
    notes: [
      'Stops the chat process and removes its tab; the conversation record stays, so it can be reopened from history. A turn in progress is cut off.',
      'The session id is the part after structured-agent-session- in a `worktree ps --json` paneKey, or ORCA_AGENT_SESSION_ID inside the chat.'
    ],
    examples: ['orca agent close --session claude_72fb399a_db10_4e8c_bc5c_108ff8308133 --json']
  }
]
