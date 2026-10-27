import { useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { Player, PlayerBattingStatsResponse, PlayerFormPoint, Season, SeasonPlayerStats } from '@/types'
import { bereichSchluessel, type Bereich } from './bereich'

export interface MeineZahlen {
  schlag: PlayerBattingStatsResponse | null
  spiele: SeasonPlayerStats | null
  /** Ein Punkt je gescortem Spiel im gewaehlten Zeitraum, in Spielreihenfolge. */
  verlauf: PlayerFormPoint[]
  spieler: Player | null
}

/**
 * Die eigenen Zahlen eines Zeitraums — EINMAL geladen, von mehreren Kacheln benutzt.
 *
 * Vorgabe ist das JAHR, eine Saison daraus ist waehlbar (siehe `bereich.ts`). Ein Jahr
 * traegt oft mehrere Saisons nebeneinander (Liga, Trainingsspiele, Turnier), und keine
 * davon ist „die" Saison — deshalb rechnet die Vorgabe sie zusammen, statt eine zu raten.
 *
 * Der Verlauf kommt in einem Stueck vom Server (alle Jahre) und wird hier zugeschnitten:
 * der Zeitraum-Wechsel kostet damit keinen Abruf fuer die Kurve, nur fuer die Summen.
 *
 * `fehler` trennt "noch nicht geschlagen" von "Server antwortet nicht". Ohne diese Trennung
 * sieht beides wie eine leere Bilanz aus, und das eine ist eine Aussage ueber die Person,
 * das andere ueber die Leitung.
 */
export function useMeineZahlen(playerId: number | null, bereich: Bereich | null) {
  const [daten, setDaten] = useState<MeineZahlen | null>(null)
  const [fehler, setFehler] = useState(false)
  const schluessel = bereich ? `${bereichSchluessel(bereich)}:${playerId}` : null

  useEffect(() => {
    if (playerId == null || bereich == null) return
    let abgebrochen = false
    setDaten(null)
    setFehler(false)
    const summen = bereich.art === 'jahr'
      ? Promise.all([api.getYearBattingStats(bereich.jahr), api.getYearStats(bereich.jahr)])
      : Promise.all([api.getSeasonBattingStats(bereich.seasonId), api.getSeasonStats(bereich.seasonId)])
    const passt = bereich.art === 'jahr'
      ? (p: PlayerFormPoint) => p.year === bereich.jahr
      : (p: PlayerFormPoint) => p.seasonId === bereich.seasonId
    Promise.all([
      summen,
      api.getPlayerBattingTimeline(playerId).catch(() => [] as PlayerFormPoint[]),
      api.getPlayer(playerId).catch(() => null),
    ]).then(([[schlag, spiele], verlauf, spieler]) => {
      if (abgebrochen) return
      setDaten({
        schlag: schlag.find(s => s.playerId === playerId) ?? null,
        spiele: spiele.find(s => s.playerId === playerId) ?? null,
        verlauf: verlauf.filter(passt),
        spieler,
      })
    }).catch(() => { if (!abgebrochen) setFehler(true) })
    return () => { abgebrochen = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel])

  return { daten, fehler }
}

/**
 * Die Saisons eines Jahres — fuer die Auswahl neben den Zahlen.
 *
 * `null` heisst „noch nicht da": solange steht eine gemerkte Saison nicht fest, und die
 * Seite wartet lieber einen Atemzug, als erst die Jahreszahlen zu zeigen und sie gleich
 * darauf zu ersetzen. Scheitert der Abruf, bleibt es bei der leeren Liste — dann gibt es
 * eben keine Auswahl, und das Jahr steht trotzdem da.
 */
export function useSaisonsDesJahres(jahr: number): Season[] | null {
  const [saisons, setSaisons] = useState<Season[] | null>(null)
  useEffect(() => {
    let abgebrochen = false
    api.getYearSeasons(jahr)
      .then(s => { if (!abgebrochen) setSaisons(s) })
      .catch(() => { if (!abgebrochen) setSaisons([]) })
    return () => { abgebrochen = true }
  }, [jahr])
  return saisons
}
