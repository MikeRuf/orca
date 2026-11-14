import type { CommandHandler } from '../dispatch/dispatch'
import { AGENT_CLOSE_HANDLERS } from './agent-close'
import { AGENT_NOTIFY_BUSY_HANDLERS } from './agent-notify-busy'

export const AGENT_SESSION_HANDLERS: Record<string, CommandHandler> = {
  ...AGENT_NOTIFY_BUSY_HANDLERS,
  ...AGENT_CLOSE_HANDLERS
}
