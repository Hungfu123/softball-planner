import { useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { Player, PlayerBattingStatsResponse, PlayerFormPoint, SeasonPlayerStats } from '@/types'

export interface MeineZahlen {
  schlag: PlayerBattingStatsResponse | null
  spiele: SeasonPlayerStats | null
  /** Ein Punkt je gescortem Spiel dieser Saison, in Spielreihenfolge. */
  verlauf: PlayerFormPoint[]
  spieler: Player | null
}

/**
 * Die eigenen Zahlen einer Saison — EINMAL geladen, von mehreren Kacheln benutzt.
 *
 * Der Verlauf traegt die Formkurve im Kopf UND die Liste der letzten Spiele; haette jede
 * Kachel ihren eigenen Haken, holte die Seite dieselben vier Listen zweimal.
 *
 * `fehler` trennt "noch nicht geschlagen" von "Server antwortet nicht". Ohne diese Trennung
 * sieht beides wie eine leere Bilanz aus, und das eine ist eine Aussage ueber die Person,
 * das andere ueber die Leitung.
 */
export function useMeineZahlen(playerId: number | null, seasonId: number | null) {
  const [daten, setDaten] = useState<MeineZahlen | null>(null)
  const [fehler, setFehler] = useState(false)
  const schluessel = `${seasonId}:${playerId}`

  useEffect(() => {
    if (seasonId == null || playerId == null) return
    let abgebrochen = false
    setDaten(null)
    setFehler(false)
    Promise.all([
      api.getSeasonBattingStats(seasonId),
      api.getSeasonStats(seasonId),
      api.getPlayerBattingTimeline(playerId).catch(() => [] as PlayerFormPoint[]),
      api.getPlayer(playerId).catch(() => null),
    ]).then(([schlag, spiele, verlauf, spieler]) => {
      if (abgebrochen) return
      setDaten({
        schlag: schlag.find(s => s.playerId === playerId) ?? null,
        spiele: spiele.find(s => s.playerId === playerId) ?? null,
        verlauf: verlauf.filter(p => p.seasonId === seasonId),
        spieler,
      })
    }).catch(() => { if (!abgebrochen) setFehler(true) })
    return () => { abgebrochen = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel])

  return { daten, fehler }
}
