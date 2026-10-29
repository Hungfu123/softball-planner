import { useEffect, useMemo, useState } from 'react'
import * as api from '@/api/client'
import { useRolle } from '@/hooks/useRolle'
import { CrossBones } from '@/icons'
import { LoadingSkeleton } from '@/components/shared'
import type {
  GameDayLineupsResponse, GameDayResponse, GameResponse, LineupEntryResponse, MeResponse, Player,
} from '@/types'
import type { Aufstellungen } from '@/utils/aufstellungsLage'
import { alleLeer, aufstellungenJeSpiel, istVergangen, NOCH_NICHT_FREIGEGEBEN, stehtNochNicht } from '@/utils/aufstellungsLage'
import { Aufstellungsansicht } from './Aufstellungsansicht'
import { KARTE, UEBERSCHRIFT } from './karte'
import { HeroNextGameDay } from './HeroNextGameDay'
import { UpcomingList } from './UpcomingList'

/*
 * Die Startseite eines Spielers. Alles hier ist Auskunft: der Planer (/gameday/:id) ist
 * eine Admin-Werkbank und für Spieler gesperrt, dieses Dashboard liefert ihnen stattdessen
 * die lesbare Hälfte — Lineup eingeschlossen. Verfügbarkeit wird nur angezeigt; Zusagen
 * laufen über die WhatsApp-Umfrage, ein zweiter Weg hinein würde sie aufweichen.
 *
 * Keine Trainingszahl, kein Link in den Planer, kein Bearbeiten-Knopf.
 */

function useNaechsterSpieltag() {
  const [laden, setLaden] = useState(true)
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [seasonName, setSeasonName] = useState<string | null>(null)
  const [spieltage, setSpieltage] = useState<GameDayResponse[]>([])
  const [ladefehler, setLadefehler] = useState(false)

  useEffect(() => {
    let abgebrochen = false
    ;(async () => {
      try {
        const seasons = await api.getSeasons()
        // findAll liefert unsortiert: die jüngste Saison ist die mit dem höchsten Jahr, bei Gleichstand der höchsten id.
        const aktuelle = [...seasons].sort((a, b) => a.year - b.year || a.id - b.id).at(-1)
        if (!aktuelle) return
        const tage = await api.getGameDays(aktuelle.id)
        if (abgebrochen) return
        setSeasonId(aktuelle.id)
        setSeasonName(aktuelle.name)
        setSpieltage([...tage].sort((a, b) => a.date.localeCompare(b.date)))
      } catch {
        // Ein Ausfall ist nicht „kein Spiel": die Seite sagt es getrennt.
        if (!abgebrochen) setLadefehler(true)
      } finally {
        if (!abgebrochen) setLaden(false)
      }
    })()
    return () => { abgebrochen = true }
  }, [])

  const kommende = useMemo(() => spieltage.filter(gd => !istVergangen(gd)), [spieltage])
  return { laden, ladefehler, seasonId, seasonName, naechster: kommende[0] ?? null, danach: kommende.slice(1) }
}

/**
 * EIN Abruf fuer den ganzen Spieltag statt einer je Spiel: er bringt Aufstellungen, Staff
 * und die Base-Coach-Auskunft zusammen. Faellt er aus, heisst das „nicht erreichbar" —
 * nicht „steht noch nicht". null = nicht ladbar, undefined = laedt noch.
 */
function useAufstellungen(spieltag: GameDayResponse | null): GameDayLineupsResponse | null | undefined {
  const [stand, setStand] = useState<{ id: number; daten: GameDayLineupsResponse | null } | null>(null)
  useEffect(() => {
    if (!spieltag) return
    let abgebrochen = false
    api.getGameDayLineups(spieltag.id)
      .catch(() => null)
      .then(daten => { if (!abgebrochen) setStand({ id: spieltag.id, daten }) })
    return () => { abgebrochen = true }
  }, [spieltag])
  return stand && spieltag && stand.id === spieltag.id ? stand.daten : undefined
}

/**
 * Wer zugesagt hat, steht nur im Einzelabruf des Spieltags: die Saison-Liste liefert
 * `availablePlayers` bewusst leer (N+1). Wer die Liste fragt, sagt jedem „nicht dabei".
 * null = nicht ladbar, undefined = lädt noch.
 */
function useZusagen(spieltag: GameDayResponse | null): Player[] | null | undefined {
  const [stand, setStand] = useState<{ id: number; spieler: Player[] | null } | null>(null)
  useEffect(() => {
    if (!spieltag) return
    let abgebrochen = false
    api.getGameDay(spieltag.id)
      .then(gd => gd.availablePlayers)
      .catch(() => null)
      .then(spieler => { if (!abgebrochen) setStand({ id: spieltag.id, spieler }) })
    return () => { abgebrochen = true }
  }, [spieltag])
  return stand && spieltag && stand.id === spieltag.id ? stand.spieler : undefined
}

function meinePlatzierung(eintraege: LineupEntryResponse[] | null | undefined, playerId: number): string {
  if (eintraege === undefined) return 'Aufstellung lädt …'
  if (eintraege === null) return 'Die Aufstellung ist gerade nicht erreichbar — später nochmal reinschauen.'
  if (eintraege.length === 0) return 'Es gibt noch keine Aufstellung — sie erscheint hier, sobald sie steht.'

  const eigener = eintraege.find(e => e.player.id === playerId)
  if (eigener) {
    const stelle = eigener.dhBatterPlayer
      ? `schlägt nicht (DH: ${eigener.dhBatterPlayer.name})`
      : `#${eigener.battingOrder} im Lineup`
    return `${eigener.position ? `Position ${eigener.position}` : 'Nur Schlagen'} · ${stelle}`
  }
  const alsDh = eintraege.find(e => e.dhBatterPlayer?.id === playerId)
  if (alsDh) return `Du schlägst als DH für ${alsDh.player.name} · #${alsDh.battingOrder} im Lineup`
  return 'Nicht aufgestellt — in diesem Spiel bist du nicht im Lineup.'
}

function BinIchDabei({ spieltag, zusagen, aufstellungen, playerId }: {
  spieltag: GameDayResponse
  zusagen: Player[] | null | undefined
  aufstellungen: Aufstellungen
  playerId: number
}) {
  return (
    <section aria-label="Bin ich dabei" className={KARTE}>
      <h2 className={UEBERSCHRIFT}>Bin ich dabei?</h2>
      {zusagen === undefined ? (
        <p className="text-sm text-white/65">Zusageliste lädt …</p>
      ) : zusagen === null ? (
        <p className="text-sm text-white/65">Die Zusageliste ist gerade nicht erreichbar — später nochmal reinschauen.</p>
      ) : zusagen.some(p => p.id === playerId) ? (
        <p className="font-display text-xl font-extrabold tracking-wide uppercase text-amber-400">Du bist dabei</p>
      ) : (
        <>
          <p className="font-display text-xl font-extrabold tracking-wide uppercase">Du stehst nicht auf der Zusageliste</p>
          <p className="text-sm text-white/65 mt-1">
            Zusagen laufen über die WhatsApp-Umfrage. Antworte dort, dann steht es hier.
          </p>
        </>
      )}
      {stehtNochNicht(spieltag, alleLeer(spieltag.games, aufstellungen)) ? (
        <p className="text-sm text-white/65 mt-3">{NOCH_NICHT_FREIGEGEBEN}</p>
      ) : (
      <ul className="mt-3 space-y-2">
        {spieltag.games.map((g: GameResponse, i) => (
          <li key={g.id} className="rounded-lg bg-white/8 border border-white/15 px-3 py-2">
            <span className="block font-display text-[11px] font-bold tracking-widest uppercase text-white/60">
              {`Spiel ${i + 1} gegen ${g.opponentTeam?.name ?? 'Gegner offen'}`}
            </span>
            <span className="block text-sm mt-0.5">{meinePlatzierung(aufstellungen[g.id], playerId)}</span>
          </li>
        ))}
      </ul>
      )}
    </section>
  )
}

function KeinSpiel({ ladefehler }: { ladefehler: boolean }) {
  if (ladefehler) {
    return (
      <section className="rounded-2xl bg-spotlight text-spotlight-ink p-6 sm:p-8 text-center shadow-lg shadow-navy-900/15">
        <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-white/80">
          <CrossBones size={24} />
        </div>
        <h2 className="font-display text-lg font-extrabold tracking-wide uppercase mb-1">Spiele gerade nicht erreichbar</h2>
        <p className="text-sm text-white/65 max-w-md mx-auto leading-relaxed">
          Der Server antwortet nicht. Das heißt nicht, dass kein Spiel ansteht — lade die Seite später neu.
        </p>
      </section>
    )
  }
  return (
    <section className="rounded-2xl bg-spotlight text-spotlight-ink p-6 sm:p-8 text-center shadow-lg shadow-navy-900/15">
      <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-white/80">
        <CrossBones size={24} />
      </div>
      <h2 className="font-display text-lg font-extrabold tracking-wide uppercase mb-1">Kein Spiel angesetzt</h2>
      <p className="text-sm text-white/65 max-w-md mx-auto leading-relaxed">
        Entweder ist die Saison durch oder der nächste Spieltag ist noch nicht angelegt. Sobald er steht,
        erscheint er hier — die Anfrage dazu kommt wie gewohnt per WhatsApp.
      </p>
    </section>
  )
}

function Hinweis({ me }: { me: MeResponse | null }) {
  const text = me === null
    ? 'Dein Konto wird noch geladen. Sobald die Verbindung steht, erscheinen hier deine Position und deine Zahlen.'
    : 'Dein Konto ist noch keinem Spieler zugeordnet. Sag dem Trainer Bescheid — dann erscheinen hier deine Position und deine Zahlen.'
  return (
    <p role="status" className="rounded-xl border border-dashed border-cream-300 bg-cream-50 px-4 py-3 text-sm text-navy-900">
      {text}
    </p>
  )
}

export function PlayerDashboard() {
  const { me } = useRolle()
  const playerId = me?.playerId ?? null
  const { laden, ladefehler, naechster, danach } = useNaechsterSpieltag()
  const daten = useAufstellungen(naechster)
  const zusagen = useZusagen(naechster)
  const aufstellungen = naechster ? aufstellungenJeSpiel(naechster.games, daten) : {}
  const [alleZeigen, setAlleZeigen] = useState(false)

  if (laden) return <LoadingSkeleton variant="ball" />

  const heroVariant = naechster?.istHeute ? 'today' : 'upcoming'

  return (
    <div className="space-y-3 sm:space-y-4">
      {playerId == null && <Hinweis me={me} />}

      {/* Das naechste Spiel steht ueber allem und ueber die ganze Breite — es ist die
          Frage, mit der man die Seite oeffnet. */}
      {naechster
        ? <HeroNextGameDay gameDay={naechster} variant={heroVariant} />
        : <KeinSpiel ladefehler={ladefehler} />}

      {/* Direkt darunter, noch vor allem anderen: bin ICH dabei. */}
      {naechster && playerId != null && (
        <BinIchDabei spieltag={naechster} zusagen={zusagen} aufstellungen={aufstellungen} playerId={playerId} />
      )}

      {/* Darunter, unter der Falte: wie steht das Team. Wer mehr wissen will, macht hier auf. */}
      {naechster && (
        <Aufstellungsansicht spieltag={naechster} daten={daten} zusagen={zusagen} playerId={playerId} />
      )}

      {danach.length > 0 && (
        <section aria-label="Was kommt">
          <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 inline-flex items-center gap-2 px-1 mb-2">
            <span className="w-1 h-4 bg-softball-red-600 rounded-full shrink-0" />
            Was kommt
          </h2>
          <UpcomingList
            gameDays={danach}
            showAll={alleZeigen}
            onShowAll={() => setAlleZeigen(true)}
            onShowLess={() => setAlleZeigen(false)}
          />
        </section>
      )}
    </div>
  )
}
