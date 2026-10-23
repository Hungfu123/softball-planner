import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '@/api/client'
import { useRolle } from '@/hooks/useRolle'
import { CrossBones } from '@/icons'
import { LoadingSkeleton } from '@/components/shared'
import type {
  GameDayResponse, GameResponse, LineupEntryResponse, MeResponse,
  PlayerBattingStatsResponse, SeasonPlayerStats,
} from '@/types'
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

/** null = Aufstellung nicht ladbar, undefined = lädt noch. */
type Aufstellungen = Record<number, LineupEntryResponse[] | null | undefined>

const KARTE = 'rounded-2xl bg-navy-900 text-white shadow-lg shadow-navy-900/15 p-4 sm:p-5'
const UEBERSCHRIFT = 'font-display text-[11px] font-bold tracking-widest uppercase text-white/60 mb-3'
const LINK_KNOPF = 'font-display min-h-11 inline-flex items-center justify-center gap-2 px-4 rounded-lg text-[11px] font-extrabold tracking-widest uppercase'

function fmtAvg(v: number): string {
  const s = v.toFixed(3)
  return s.startsWith('0') ? s.slice(1) : s
}

function heute(): string {
  return new Date().toISOString().slice(0, 10)
}

function useNaechsterSpieltag() {
  const [laden, setLaden] = useState(true)
  const [seasonId, setSeasonId] = useState<number | null>(null)
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

  const kommende = useMemo(() => spieltage.filter(gd => gd.date >= heute()), [spieltage])
  return { laden, ladefehler, seasonId, naechster: kommende[0] ?? null, danach: kommende.slice(1) }
}

function useAufstellungen(spieltag: GameDayResponse | null): Aufstellungen {
  const [stand, setStand] = useState<{ id: number; daten: Aufstellungen } | null>(null)
  useEffect(() => {
    if (!spieltag) return
    let abgebrochen = false
    Promise.all(spieltag.games.map(g =>
      api.getLineup(g.id).then(l => [g.id, l] as const).catch(() => [g.id, null] as const),
    )).then(paare => {
      if (!abgebrochen) setStand({ id: spieltag.id, daten: Object.fromEntries(paare) })
    })
    return () => { abgebrochen = true }
  }, [spieltag])
  return stand && spieltag && stand.id === spieltag.id ? stand.daten : {}
}

/**
 * Wer zugesagt hat, steht nur im Einzelabruf des Spieltags: die Saison-Liste liefert
 * `availablePlayers` bewusst leer (N+1). Wer die Liste fragt, sagt jedem „nicht dabei".
 * null = nicht ladbar, undefined = lädt noch.
 */
function useZusagen(spieltag: GameDayResponse | null): number[] | null | undefined {
  const [stand, setStand] = useState<{ id: number; ids: number[] | null } | null>(null)
  useEffect(() => {
    if (!spieltag) return
    let abgebrochen = false
    api.getGameDay(spieltag.id)
      .then(gd => gd.availablePlayers.map(p => p.id))
      .catch(() => null)
      .then(ids => { if (!abgebrochen) setStand({ id: spieltag.id, ids }) })
    return () => { abgebrochen = true }
  }, [spieltag])
  return stand && spieltag && stand.id === spieltag.id ? stand.ids : undefined
}

function useMeineZahlen(seasonId: number | null, playerId: number | null) {
  const [stand, setStand] = useState<{
    key: string
    /** true = Abruf gescheitert; dann sind schlag/spiele bedeutungslos. */
    fehler: boolean
    schlag: PlayerBattingStatsResponse | null
    spiele: SeasonPlayerStats | null
  } | null>(null)
  const key = `${seasonId}:${playerId}`

  useEffect(() => {
    if (seasonId == null || playerId == null) return
    let abgebrochen = false
    Promise.all([
      api.getSeasonBattingStats(seasonId),
      api.getSeasonStats(seasonId),
    ]).then(([schlag, spiele]) => {
      if (abgebrochen) return
      setStand({
        key,
        fehler: false,
        schlag: schlag.find(s => s.playerId === playerId) ?? null,
        spiele: spiele.find(s => s.playerId === playerId) ?? null,
      })
    }).catch(() => {
      if (!abgebrochen) setStand({ key, fehler: true, schlag: null, spiele: null })
    })
    return () => { abgebrochen = true }
  }, [seasonId, playerId, key])

  return stand && stand.key === key ? stand : null
}

/** Eine Zeile je Spiel: wo steht der Spieler in dieser Aufstellung? */
function meinePlatzierung(eintraege: LineupEntryResponse[] | null | undefined, playerId: number): string {
  if (eintraege === undefined) return 'Aufstellung lädt …'
  if (eintraege === null) return 'Die Aufstellung ist gerade nicht erreichbar — später nochmal reinschauen.'
  if (eintraege.length === 0) return 'Es gibt noch keine Aufstellung — sie erscheint hier, sobald sie steht.'

  const eigener = eintraege.find(e => e.player.id === playerId)
  if (eigener) {
    const stelle = eigener.dhBatterPlayer
      ? `schlägt nicht (DH: ${eigener.dhBatterPlayer.name})`
      : `Schlagplatz ${eigener.battingOrder}`
    return `${eigener.position ? `Position ${eigener.position}` : 'Nur Schlagen'} · ${stelle}`
  }
  const alsDh = eintraege.find(e => e.dhBatterPlayer?.id === playerId)
  if (alsDh) return `Du schlägst als DH für ${alsDh.player.name} · Schlagplatz ${alsDh.battingOrder}`
  return 'Nicht aufgestellt — in diesem Spiel bist du nicht im Lineup.'
}

function BinIchDabei({ spieltag, zusagen, aufstellungen, playerId }: {
  spieltag: GameDayResponse
  zusagen: number[] | null | undefined
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
      ) : zusagen.includes(playerId) ? (
        <p className="font-display text-xl font-extrabold tracking-wide uppercase text-amber-400">Du bist dabei</p>
      ) : (
        <>
          <p className="font-display text-xl font-extrabold tracking-wide uppercase">Du stehst nicht auf der Zusageliste</p>
          <p className="text-sm text-white/65 mt-1">
            Zusagen laufen über die WhatsApp-Umfrage. Antworte dort, dann steht es hier.
          </p>
        </>
      )}
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
    </section>
  )
}

function LineupLesen({ spieltag, aufstellungen, playerId }: {
  spieltag: GameDayResponse
  aufstellungen: Aufstellungen
  playerId: number | null
}) {
  const spiele = spieltag.games
  const [gewaehlt, setGewaehlt] = useState<number | null>(null)
  // Standard: das erste Spiel, das noch läuft oder aussteht.
  const aktiv = spiele.find(g => g.id === gewaehlt) ?? spiele.find(g => !g.endedAt) ?? spiele[0]
  const eintraege = aktiv ? aufstellungen[aktiv.id] : undefined
  const sortiert = eintraege ? [...eintraege].sort((a, b) => a.battingOrder - b.battingOrder) : []

  return (
    <section aria-label="Lineup" className={KARTE}>
      <h2 className={UEBERSCHRIFT}>Lineup</h2>
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
      {eintraege === undefined && <p className="text-sm text-white/65">Aufstellung lädt …</p>}
      {eintraege === null && (
        <p className="text-sm text-white/65">Die Aufstellung ist gerade nicht erreichbar — später nochmal reinschauen.</p>
      )}
      {eintraege && eintraege.length === 0 && (
        <p className="text-sm text-white/65">
          Für dieses Spiel gibt es noch keine Aufstellung. Sobald der Trainer sie macht, steht sie hier.
        </p>
      )}
      {sortiert.length > 0 && (
        <ol className="space-y-1">
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
      )}
    </section>
  )
}

function Kachel({ wert, label }: { wert: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/8 border border-white/15 px-3 py-3 text-center">
      <div className="font-display text-3xl font-extrabold text-amber-400 leading-none">{wert}</div>
      <div className="font-display text-[11px] font-bold tracking-widest uppercase text-white/60 mt-1.5">{label}</div>
    </div>
  )
}

function MeineZahlen({ playerId, seasonId, ladefehler }: { playerId: number; seasonId: number | null; ladefehler: boolean }) {
  const zahlen = useMeineZahlen(seasonId, playerId)
  const nichts = zahlen && !zahlen.fehler && !zahlen.schlag && !zahlen.spiele
  const nichtErreichbar = ladefehler || zahlen?.fehler
  return (
    <section aria-label="Meine Zahlen" className={KARTE}>
      <h2 className={UEBERSCHRIFT}>Meine Zahlen</h2>
      {nichtErreichbar ? (
        <p className="text-sm text-white/65">Deine Zahlen sind gerade nicht erreichbar — später nochmal reinschauen.</p>
      ) : seasonId == null ? (
        <p className="text-sm text-white/65">
          Es ist noch keine Saison angelegt. Sobald sie steht und du gespielt hast, erscheinen hier deine Zahlen.
        </p>
      ) : nichts ? (
        <p className="text-sm text-white/65">
          Du hast in dieser Saison noch nicht geschlagen. Sobald ein Spiel gezählt ist, in dem du dran warst, stehen hier deine Zahlen.
        </p>
      ) : zahlen ? (
        <div className="grid grid-cols-2 gap-2">
          <Kachel wert={zahlen.schlag ? fmtAvg(zahlen.schlag.battingAverage) : '–'} label="AVG" />
          <Kachel wert={zahlen.schlag ? fmtAvg(zahlen.schlag.onBasePct) : '–'} label="OBP" />
          <Kachel wert={zahlen.spiele ? String(zahlen.spiele.totalGames) : '–'} label="Spiele" />
          <Kachel wert={zahlen.schlag ? String(zahlen.schlag.hits) : '–'} label="Hits" />
        </div>
      ) : (
        <p className="text-sm text-white/65">Zahlen laden …</p>
      )}
      <Link
        to={`/players/${playerId}`}
        className={`${LINK_KNOPF} mt-3 w-full bg-white/95 hover:bg-navy-800 hover:text-white text-navy-900 transition-colors`}
      >
        Ganzes Profil
      </Link>
    </section>
  )
}

function KeinSpiel({ ladefehler }: { ladefehler: boolean }) {
  if (ladefehler) {
    return (
      <section className="rounded-2xl bg-navy-900 text-white p-6 sm:p-8 text-center shadow-lg shadow-navy-900/15">
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
    <section className="rounded-2xl bg-navy-900 text-white p-6 sm:p-8 text-center shadow-lg shadow-navy-900/15">
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

function WerkzeugZeile() {
  const cls = `${LINK_KNOPF} flex-1 bg-cream-50 border border-cream-300 text-navy-900 hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors`
  return (
    <nav aria-label="Werkzeuge" className="flex gap-2">
      <Link to="/orga/playmaker" className={`${cls} min-h-11`}>Playmaker</Link>
      <Link to="/counter" className={`${cls} min-h-11`}>Counter</Link>
    </nav>
  )
}

export function PlayerDashboard() {
  const { me } = useRolle()
  const playerId = me?.playerId ?? null
  const { laden, ladefehler, seasonId, naechster, danach } = useNaechsterSpieltag()
  const aufstellungen = useAufstellungen(naechster)
  const zusagen = useZusagen(naechster)
  const [alleZeigen, setAlleZeigen] = useState(false)

  if (laden) return <LoadingSkeleton variant="ball" />

  const heroVariant = naechster?.date === heute() ? 'today' : 'upcoming'

  return (
    <div className="space-y-3 sm:space-y-4">
      {playerId == null && <Hinweis me={me} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="lg:col-start-1 lg:row-start-1">
          {naechster
            ? <HeroNextGameDay gameDay={naechster} variant={heroVariant} />
            : <KeinSpiel ladefehler={ladefehler} />}
        </div>

        {naechster && playerId != null && (
          <div className="lg:col-start-1 lg:row-start-2">
            <BinIchDabei spieltag={naechster} zusagen={zusagen} aufstellungen={aufstellungen} playerId={playerId} />
          </div>
        )}

        {naechster && (
          <div className="lg:col-span-2 lg:row-start-3">
            <LineupLesen spieltag={naechster} aufstellungen={aufstellungen} playerId={playerId} />
          </div>
        )}

        {/* Ohne „Was kommt“ darunter spannt die Zahlenkarte beide Zeilen — sonst reisst sie unter dem Hero ein Loch. */}
        {playerId != null && (
          <div className={`lg:col-start-2 lg:row-start-1 ${danach.length === 0 ? 'lg:row-span-2' : ''}`}>
            <MeineZahlen playerId={playerId} seasonId={seasonId} ladefehler={ladefehler} />
          </div>
        )}

        {danach.length > 0 && (
          <section aria-label="Was kommt" className="lg:col-start-2 lg:row-start-2">
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

      <WerkzeugZeile />
    </div>
  )
}
