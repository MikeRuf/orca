import { stat } from 'node:fs/promises'
import { parseClaudeUsageFile } from '../claude-usage/transcript-record-parser'
import type { ClaudeUsageParsedTurn } from '../claude-usage/types'

type TranscriptTurn = { at: number; tokens: number }
type CachedTranscript = { mtimeMs: number; size: number; turns: TranscriptTurn[] }

export type ClaudeChatWindows = { sessionStart: number; weeklyStart: number }
export type ClaudeChatWindowTokens = { sessionTokens: number; weeklyTokens: number }

const transcripts = new Map<string, CachedTranscript>()

// Cache reads are excluded: a long chat rereads its whole context each turn at a tenth of the
// input price, which would swamp the turns that actually move the limit.
function limitWeightedTokens(turn: ClaudeUsageParsedTurn): number {
  return turn.inputTokens + turn.cacheWriteTokens + turn.outputTokens
}

async function readTranscriptTurns(path: string): Promise<TranscriptTurn[]> {
  const { mtimeMs, size } = await stat(path)
  const cached = transcripts.get(path)
  if (cached?.mtimeMs === mtimeMs && cached.size === size) {
    return cached.turns
  }
  const turns = (await parseClaudeUsageFile(path)).flatMap((turn) => {
    const at = Date.parse(turn.timestamp)
    return Number.isFinite(at) ? [{ at, tokens: limitWeightedTokens(turn) }] : []
  })
  transcripts.set(path, { mtimeMs, size, turns })
  return turns
}

/** A missing or unreadable transcript counts as no use: it must not hide the other chats. */
export async function readClaudeChatWindowTokens(
  paths: readonly string[],
  windows: ClaudeChatWindows
): Promise<ClaudeChatWindowTokens> {
  const total: ClaudeChatWindowTokens = { sessionTokens: 0, weeklyTokens: 0 }
  for (const path of paths) {
    const turns = await readTranscriptTurns(path).catch(() => [])
    for (const { at, tokens } of turns) {
      total.sessionTokens += at >= windows.sessionStart ? tokens : 0
      total.weeklyTokens += at >= windows.weeklyStart ? tokens : 0
    }
  }
  return total
}
