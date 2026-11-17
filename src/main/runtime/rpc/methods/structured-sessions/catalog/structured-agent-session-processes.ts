import { defineMethod } from '../../../core'
import { requireInstalledStructuredHost } from '../creation/structured-agent-session-gate'
import {
  ProcessesParams,
  StopProcessParams
} from '../../../../../../shared/rpc-contract/structured-agent-session/structured-agent-session-params'
import {
  listAgentSessionProcesses,
  stopAgentSessionProcess
} from '../../../../../native-chat/agent-session-processes/agent-session-process-scan'

export const STRUCTURED_AGENT_SESSION_PROCESS_METHODS = [
  defineMethod({
    name: 'agentSession.processes',
    permission: 'workspace',
    params: ProcessesParams,
    handler: async (params, ctx) => {
      // Why the host check: only a chat this host runs can name processes here.
      await requireInstalledStructuredHost(ctx, params.sessionId)
      return listAgentSessionProcesses(params.sessionId)
    }
  }),
  defineMethod({
    name: 'agentSession.stopProcess',
    permission: 'workspace',
    params: StopProcessParams,
    handler: async (params, ctx) => {
      await requireInstalledStructuredHost(ctx, params.sessionId)
      return stopAgentSessionProcess(params.sessionId, params.pid)
    }
  })
]
