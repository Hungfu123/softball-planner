import type { BattingSlotStats, LineupEntryResponse, TeamGameLogResponse } from '@/types'
import { fmtDate, lineupText, resultLetter } from './gameLogPdf'
import type { SlotComparison } from './gameLogPdf'
import { safeFilename } from './statsPdf'

/** Alles, was die maschinenlesbaren Exporte aus dem Spiel-Verlauf brauchen (Teilmenge von GameLogPdfOptions). */
export interface GameLogExportOptions {
  logs: TeamGameLogResponse[]
  lineups?: Map<number, LineupEntryResponse[]>
  slots?: BattingSlotStats[] | null
  comparison?: SlotComparison | null
  contextLabel: string
  scopeLabel: string
}

/** Reichhaltiges JSON für KI-Lineup-Planung: Kontext oben, dann Rohdaten — keine Tabelle zum Zurückparsen nötig. */
export function gameLogJsonPayload({ logs, lineups, slots, comparison, contextLabel, scopeLabel }: GameLogExportOptions) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    filter: { context: contextLabel, scope: scopeLabel },
    games: logs.map(l => ({
      gameId: l.gameId,
      date: fmtDate(l.date),
      opponent: l.opponent ?? '?',
      league: l.league,
      year: l.year,
      score: l.scoreUs != null && l.scoreThem != null ? `${l.scoreUs}:${l.scoreThem} (${resultLetter(l)})` : null,
      evaluated: l.hasAtBatData,
      plateAppearances: l.plateAppearances,
      atBats: l.atBats,
      hits: l.hits,
      doubles: l.doubles,
      triples: l.triples,
      homeRuns: l.homeRuns,
      walks: l.walks,
      hitByPitch: l.hitByPitch,
      strikeouts: l.strikeouts,
      onBase: l.onBase,
      leftOnBase: l.leftOnBase,
      stranded: l.stranded,
      innings: l.innings,
      lineup: lineups?.get(l.gameId) ? lineupText(lineups.get(l.gameId)) : null,
    })),
    battingSlots: slots ?? null,
    comparison: comparison ?? null,
  }
}

/** Browser-Download einer Textdatei. */
export function downloadTextFile(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportGameLogJson(options: GameLogExportOptions): void {
  const fname = safeFilename(['Spiel-Verlauf', options.scopeLabel, options.contextLabel])
  downloadTextFile(`${fname}.json`, JSON.stringify(gameLogJsonPayload(options), null, 2), 'application/json')
}
