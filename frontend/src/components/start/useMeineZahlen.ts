import { useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { Player, PlayerBattingStatsResponse, PlayerFormPoint, SeasonPlayerStats } from '@/types'

export interface MeineZahlen {
  schlag: PlayerBattingStatsResponse | null
  spiele: SeasonPlayerStats | null
  /** Ein Punkt je gescortem Spiel dieses Jahres, in Spielreihenfolge. */
  verlauf: PlayerFormPoint[]
  spieler: Player | null
}

/**
 * Die eigenen Zahlen eines JAHRES — EINMAL geladen, von mehreren Kacheln benutzt.
 *
 * Jahr, nicht Saison. Ein Jahr traegt oft mehrere Saisons nebeneinander (Liga,
 * Trainingsspiele, Turnier), und keine davon ist "die" Saison. Vorher suchte die Seite sich
 * eine aus — die des naechstgelegenen Spieltags — und zeigte dem Spieler die Bilanz einer
 * Nebensaison mit einem Spiel darin, waehrend die Kachel darunter "Dein Jahr" ueberschrieb.
 * Zwei Zeitraeume auf einer Seite, und der kleinere gewinnt: das war der Fehler. Jetzt
 * decken Kopf und Jahresband denselben Zeitraum ab, und es gibt nichts mehr zu raten.
 *
 * `fehler` trennt "noch nicht geschlagen" von "Server antwortet nicht". Ohne diese Trennung
 * sieht beides wie eine leere Bilanz aus, und das eine ist eine Aussage ueber die Person,
 * das andere ueber die Leitung.
 */
export function useMeineZahlen(playerId: number | null, jahr: number) {
  const [daten, setDaten] = useState<MeineZahlen | null>(null)
  const [fehler, setFehler] = useState(false)
  const schluessel = `${jahr}:${playerId}`

  useEffect(() => {
    if (playerId == null) return
    let abgebrochen = false
    setDaten(null)
    setFehler(false)
    Promise.all([
      api.getYearBattingStats(jahr),
      api.getYearStats(jahr),
      api.getPlayerBattingTimeline(playerId).catch(() => [] as PlayerFormPoint[]),
      api.getPlayer(playerId).catch(() => null),
    ]).then(([schlag, spiele, verlauf, spieler]) => {
      if (abgebrochen) return
      setDaten({
        schlag: schlag.find(s => s.playerId === playerId) ?? null,
        spiele: spiele.find(s => s.playerId === playerId) ?? null,
        verlauf: verlauf.filter(p => p.year === jahr),
        spieler,
      })
    }).catch(() => { if (!abgebrochen) setFehler(true) })
    return () => { abgebrochen = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel])

  return { daten, fehler }
}
