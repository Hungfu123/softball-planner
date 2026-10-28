import { useState } from 'react'
import { FieldView } from '@/components/planner/FieldView'
import { baseCoachSatz } from '@/utils/baseCoachSatz'
import {
  alleLeer, aufstellungenJeSpiel, NOCH_KEINE_AUFSTELLUNG, NOCH_NICHT_FREIGEGEBEN, stehtNochNicht,
} from '@/utils/aufstellungsLage'
import type {
  GameDayLineupsResponse, GameDayResponse, LineupEntryResponse, LocalLineupEntry, Player,
} from '@/types'
import { KARTE, UEBERSCHRIFT } from './karte'

/*
 * Wo spiele ich — die Fassung, die nie veraltet. Das PDF in der WhatsApp-Gruppe ist der
 * Zustellweg; sagt jemand Samstag frueh ab, ist es falsch, bis ein neues kommt. Diese
 * Karte ist dann schon richtig.
 *
 * Vier Dinge, sonst nichts: das Feld, die Schlagreihenfolge, die Base Coaches, die Bank.
 * Keine Auswechslungen, kein Knopf ausser dem Umschalter — die Werkbank ist /gameday/:id
 * und fuer Spieler gesperrt.
 */

const NEBENZEILE = 'text-[11px] text-white/55 mt-2 leading-snug'

interface Props {
  spieltag: GameDayResponse
  /** `null` = nicht erreichbar, `undefined` = laedt. Ein Ausfall ist keine Auskunft. */
  daten: GameDayLineupsResponse | null | undefined
  /** Die Zugesagten des Spieltags — die Bank ist alles daraus, was nicht spielt. */
  zusagen: Player[] | null | undefined
  playerId: number | null
}

/** Das Feld liest nur Position und Namen; die DH-Angabe traegt die Liste. */
function alsFeldEintraege(eintraege: LineupEntryResponse[]): LocalLineupEntry[] {
  return eintraege.map(e => ({
    player: e.player,
    position: e.position,
    dhBatterId: e.dhBatterPlayer?.id ?? null,
    dhBatterName: e.dhBatterPlayer?.name ?? null,
  }))
}

/**
 * Dieselbe Rechnung wie die Bank-Zeile des PDF (`generateLineupWithFieldPdf`): zugesagt
 * minus aufgestellt (DH-Schlagmann eingeschlossen) minus benannte Coaches. Auswechslungen
 * kommen hier nicht vor — die Karte zeigt die Aufstellung, nicht den Spielverlauf.
 */
function bankVon(
  zusagen: Player[] | null | undefined,
  eintraege: LineupEntryResponse[],
  coaches: Player[],
): Player[] {
  if (!zusagen) return []
  const imSpiel = new Set<number>()
  for (const e of eintraege) {
    imSpiel.add(e.player.id)
    if (e.dhBatterPlayer) imSpiel.add(e.dhBatterPlayer.id)
  }
  for (const c of coaches) imSpiel.add(c.id)
  return zusagen.filter(p => !imSpiel.has(p.id))
}

export function Aufstellungsansicht({ spieltag, daten, zusagen, playerId }: Props) {
  const spiele = spieltag.games
  const [gewaehlt, setGewaehlt] = useState<number | null>(null)
  // Vorgabe: das erste Spiel, das noch laeuft oder aussteht.
  const aktiv = spiele.find(g => g.id === gewaehlt) ?? spiele.find(g => !g.endedAt) ?? spiele[0]

  // Dieselben Funktionen wie „Bin ich dabei?" — zwei Karten ueber eine Lage duerfen nicht
  // Gegenteiliges sagen.
  const aufstellungen = aufstellungenJeSpiel(spiele, daten)
  const keineSichtbar = stehtNochNicht(spieltag, alleLeer(spiele, aufstellungen))

  const nummer = spiele.findIndex(g => g.id === aktiv?.id) + 1
  const eintraege = aktiv ? aufstellungen[aktiv.id] : undefined
  const sortiert = eintraege ? [...eintraege].sort((a, b) => a.battingOrder - b.battingOrder) : []
  const coaches = aktiv ? daten?.staff?.[String(aktiv.id)] ?? [] : []
  const coachSatz = aktiv ? baseCoachSatz(daten?.baseCoaches?.[String(aktiv.id)]) : null
  // Ohne Aufstellung gibt es keine Bank — sie waere der ganze Kader.
  const bank = sortiert.length > 0 ? bankVon(zusagen, sortiert, coaches.map(s => s.player)) : []

  return (
    <section aria-label="Lineup" className={KARTE}>
      <h2 className={UEBERSCHRIFT}>Lineup</h2>

      {keineSichtbar ? (
        <p className="text-sm text-white/65">{NOCH_NICHT_FREIGEGEBEN}</p>
      ) : (
        <>
          {spiele.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {spiele.map((g, i) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGewaehlt(g.id)}
                  aria-pressed={g.id === aktiv?.id}
                  className={`font-display min-h-11 min-w-11 px-4 rounded-lg text-[11px] font-extrabold tracking-widest uppercase cursor-pointer border ${
                    g.id === aktiv?.id ? 'bg-white text-navy-900 border-white' : 'bg-white/8 text-white border-white/15 hover:bg-navy-800'
                  }`}
                >
                  {`Spiel ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Der Gegner steht ueber dem Feld, nicht am Knopf: „Spiel 2 gegen Koeln Kings" auf
              zwei Knoepfen bricht bei 393 px um, und eine Aufstellung ohne Gegner darueber
              ist unvollstaendig. */}
          {/* `mb-3` wie ueberall in dieser Karte (Ueberschrift, Umschalter): den Abstand
              zum Feld traegt DIE KARTE, nicht `FieldView`. Ohne Ueberschrift bringt die
              Komponente absichtlich nichts mit — wer sie einsetzt, bestimmt den Abstand.
              Nicht wieder nach `FieldView` zurueckschieben. */}
          {aktiv && (
            <p className="font-display text-[11px] font-bold tracking-widest uppercase text-white/60 mb-3">
              {`Spiel ${nummer} gegen ${aktiv.opponentTeam?.name ?? 'Gegner offen'}`}
            </p>
          )}

          {eintraege === undefined && <p className="text-sm text-white/65">Aufstellung lädt …</p>}
          {eintraege === null && (
            <p className="text-sm text-white/65">Die Aufstellung ist gerade nicht erreichbar — später nochmal reinschauen.</p>
          )}
          {eintraege && eintraege.length === 0 && (
            <p className="text-sm text-white/65">{NOCH_KEINE_AUFSTELLUNG}</p>
          )}

          {sortiert.length > 0 && (
            <>
              {/* Ohne Ueberschrift: „Lineup" steht schon ueber der Karte, und ein zweites
                  Schild „Feld" an einem Feld sagt nichts. Die Ueberschrift von FieldView
                  setzt ausserdem hellen Grund voraus — hier liegt sie auf `bg-spotlight`. */}
              <FieldView
                entries={alsFeldEintraege(sortiert)}
                hervorgehobenerSpielerId={playerId ?? undefined}
                ohneUeberschrift
              />

              <ol className="space-y-1 mt-3">
                {sortiert.map(e => {
                  const ich = playerId != null && (e.player.id === playerId || e.dhBatterPlayer?.id === playerId)
                  return (
                    <li
                      key={e.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${ich ? 'bg-amber-400/15 border-amber-400/50' : 'bg-white/5 border-white/10'}`}
                    >
                      <span className="font-display w-6 text-center text-sm font-extrabold text-white/60">{e.battingOrder}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate">{e.player.name}</span>
                        {e.dhBatterPlayer && (
                          <span className="block text-[11px] text-white/60 truncate">DH: {e.dhBatterPlayer.name}</span>
                        )}
                      </span>
                      <span className="font-display text-xs font-bold tracking-widest uppercase text-white/80">{e.position ?? '–'}</span>
                    </li>
                  )
                })}
              </ol>
            </>
          )}

          {/* Der Coach-Satz haengt NICHT an der Aufstellung: das Backend baut die
              Auskunft aus den Staff-Eintraegen, und das Druckblatt zeigt `1B Jan`
              auch ueber einem „Kein Lineup". Seine Nummern zeigen auf die Liste
              darueber, deshalb steht er hinter ihr und nicht vor ihr. */}
          {coachSatz && <p className={NEBENZEILE}>{coachSatz}</p>}

          {/* Die Bank dagegen bleibt am Feld: ohne Aufstellung waere sie der ganze
              Kader und damit keine Auskunft. */}
          {bank.length > 0 && (
            <p className={NEBENZEILE}>{`Bank: ${bank.map(p => p.name).join(' · ')}`}</p>
          )}
        </>
      )}
    </section>
  )
}
