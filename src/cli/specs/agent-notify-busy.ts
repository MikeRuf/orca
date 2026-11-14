import type { CommandSpec } from '../discovery/command-spec'
import { CLI_GLOBAL_FLAGS as GLOBAL_FLAGS } from '../../shared/cli-argument-boundary'

export const AGENT_NOTIFY_BUSY_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['agent', 'notify-busy'],
    summary:
      'Send a message into every chat that is mid-turn on this host, steering its current turn',
    usage:
      'orca agent notify-busy --message <text> [--exclude <sessionId>] [--session <sessionId>] [--dry-run] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'message', 'exclude', 'session', 'dry-run'],
    notes: [
      'For a planned restart: each chat whose own turn is in progress gets the message the way a person steering it would, so it can wrap up before the host stops. Chats that are idle, or busy only with a background task, are left alone.',
      'Only chats are reached. Agents running in a terminal are listed under `skipped` with the reason.',
      '--exclude takes a chat session id (ORCA_AGENT_SESSION_ID inside a chat), so the chat that runs this command is not interrupted by its own notice.',
      '--session sends to that one chat whatever its state, idle included (for resuming chats after a restart).',
      '--dry-run lists the chats that would get the message and sends nothing.'
    ],
    examples: [
      'orca agent notify-busy --message "Orca restarts in a few minutes: wrap up your current step." --json',
      'orca agent notify-busy --message "..." --exclude "$ORCA_AGENT_SESSION_ID" --dry-run --json'
    ]
  }
]
