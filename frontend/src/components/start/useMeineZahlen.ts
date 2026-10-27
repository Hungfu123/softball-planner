import { useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { Player, PlayerBattingStatsResponse, PlayerFormPoint, SeasonPlayerStats } from '@/types'

export interface MeineZahlen {
  schlag: PlayerBattingStatsResponse | null
  spiele: SeasonPlayerStats | null
  /** Ein Punkt je gescortem Spiel im gewaehlten Zeitraum, in Spielreihenfolge. */
  verlauf: PlayerFormPoint[]
  spieler: Player | null
}

/**
 * Die eigenen Zahlen eines JAHRES — EINMAL geladen, von mehreren Kacheln benutzt.
 *
 * Jahr, nicht Saison. Ein Jahr traegt oft mehrere Saisons nebeneinander (Liga, Turnier,
 * Trainingsspiele), und keine davon ist „die" Saison — die Seite rechnet sie zusammen,
 * statt eine zu raten. Genau daran ist sie einmal gescheitert.
 *
 * Der Verlauf kommt in einem Stueck vom Server (alle Jahre) und wird hier zugeschnitten:
 * ein Jahreswechsel kostet damit keinen Abruf fuer die Kurve, nur fuer die Summen.
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
      Promise.all([api.getYearBattingStats(jahr), api.getYearStats(jahr)]),
      api.getPlayerBattingTimeline(playerId).catch(() => [] as PlayerFormPoint[]),
      api.getPlayer(playerId).catch(() => null),
    ]).then(([[schlag, spiele], verlauf, spieler]) => {
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

/**
 * Die Jahre, in denen ueberhaupt gespielt wurde — fuer die Auswahl neben den Zahlen.
 *
 * Scheitert der Abruf, bleibt die Liste leer; `jahreZurWahl` setzt das laufende Jahr ohnehin
 * immer dazu, und mit einem einzigen Eintrag gibt es schlicht nichts zu waehlen. Eine
 * fehlende Liste darf die Seite nicht aufhalten.
 */
export function useJahre(): number[] {
  const [jahre, setJahre] = useState<number[]>([])
  useEffect(() => {
    let abgebrochen = false
    api.getDistinctYears()
      .then(j => { if (!abgebrochen) setJahre(j) })
      .catch(() => { if (!abgebrochen) setJahre([]) })
    return () => { abgebrochen = true }
  }, [])
  return jahre
}
