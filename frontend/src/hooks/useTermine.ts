import { useEffect, useState } from 'react'
import * as api from '@/api/client'

export type TerminArt = 'SPIELTAG' | 'TRAINING'

export interface Termin {
  id: number
  art: TerminArt
  /** ISO-Datum, YYYY-MM-DD. */
  datum: string
  titel: string
  ort: string | null
  /** Nur Trainings tragen eine Uhrzeit; Spieltage haben keine. */
  zeit: string | null
  /** Nur Spieltage: Trainings gehoeren zu keiner Saison. */
  seasonId: number | null
}

/**
 * Alle Termine des Vereins in einer Liste: Spieltage und Trainings, nach Datum sortiert.
 *
 * Beide Abrufe stehen jedem Angemeldeten offen — `GET /api/trainings` streicht Spielern
 * die Teilnehmerzahl heraus, bevor sie das Haus verlaesst (TrainingController). WANN
 * trainiert wird, darf jeder wissen; WER da war, bleibt bei den Trainern. Deshalb kommt
 * hier auch nur Datum, Ort und Uhrzeit an und nichts aus `attendeeCount`.
 *
 * Abgesagte Trainings fallen raus: "abgesagt" ist kein Termin, sondern dessen Gegenteil.
 *
 * Ein Ausfall ist nicht "nichts angesetzt" — `fehler` trennt die beiden, damit die
 * Oberflaeche nicht Ruhe meldet, wo nur der Server schweigt.
 */
export function useTermine(): { laden: boolean; fehler: boolean; termine: Termin[] } {
  const [laden, setLaden] = useState(true)
  const [fehler, setFehler] = useState(false)
  const [termine, setTermine] = useState<Termin[]>([])

  useEffect(() => {
    let abgebrochen = false
    ;(async () => {
      try {
        const [spieltage, trainings] = await Promise.all([
          api.getAllGameDays(),
          api.getTrainings(),
        ])
        if (abgebrochen) return

        const ausSpieltagen: Termin[] = spieltage
          .filter(gd => !!gd.date)
          .map(gd => {
            const gegner = gd.games
              .map(g => g.opponentTeam?.name)
              .filter((n): n is string => !!n && n.trim() !== '')
            const einmalig = [...new Set(gegner)]
            return {
              id: gd.id,
              art: 'SPIELTAG' as const,
              datum: gd.date,
              titel: einmalig.length > 0 ? einmalig.join(' · ') : (gd.label ?? 'Spieltag'),
              ort: gd.location ?? null,
              zeit: null,
              seasonId: gd.seasonId ?? null,
            }
          })

        const ausTrainings: Termin[] = trainings
          .filter(t => !!t.date && !t.cancelled)
          .map(t => ({
            id: t.id,
            art: 'TRAINING' as const,
            datum: t.date,
            titel: 'Training',
            ort: t.location ?? null,
            zeit: t.time ?? null,
            seasonId: null,
          }))

        setTermine([...ausSpieltagen, ...ausTrainings].sort((a, b) => a.datum.localeCompare(b.datum)))
      } catch {
        if (!abgebrochen) setFehler(true)
      } finally {
        if (!abgebrochen) setLaden(false)
      }
    })()
    return () => { abgebrochen = true }
  }, [])

  return { laden, fehler, termine }
}

/** Heute als ISO-Datum in LOKALER Zeit — `toISOString()` waere UTC und abends einen Tag voraus. */
export function heuteIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Die Saison, in der man GERADE steckt: die des Spieltags, der heute am naechsten liegt.
 *
 * Nicht "die mit dem hoechsten Jahr". Das waere eine Aussage ueber die Stammdaten, nicht
 * ueber den Spielbetrieb — eine verirrte Saison (im Entwicklungsbestand lag eine mit Jahr
 * 2101 aus einem E2E-Lauf) verdraengt damit die laufende, und die Startseite meldet dem
 * Spieler, er habe "noch nicht geschlagen". Der naechstgelegene Spieltag weiss es besser.
 *
 * `null`, solange keine Spieltage da sind — dann entscheidet die Jahreszahl weiter.
 */
export function saisonAusTerminen(termine: Termin[], heute: string): number | null {
  const spieltage = termine.filter(t => t.art === 'SPIELTAG' && t.seasonId != null)
  if (spieltage.length === 0) return null
  const kuenftig = spieltage.find(t => t.datum >= heute)
  return (kuenftig ?? spieltage[spieltage.length - 1]).seasonId
}
