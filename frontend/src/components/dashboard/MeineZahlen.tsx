import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '@/api/client'
import { Abschnittsmarke } from '@/components/shared'
import { PositionBadges } from '@/components/players/PositionBadges'
import type { Player, PlayerBattingStatsResponse, PlayerFormPoint, SeasonPlayerStats } from '@/types'

/** `.355` statt `0.355` — Schlagzahlen schreibt man im Baseball ohne die fuehrende Null. */
function quote(v: number): string {
  const s = v.toFixed(3)
  return s.startsWith('0') ? s.slice(1) : s
}

interface Daten {
  schlag: PlayerBattingStatsResponse | null
  spiele: SeasonPlayerStats | null
  verlauf: PlayerFormPoint[]
  spieler: Player | null
}

/**
 * Die eigenen Zahlen auf der Startseite.
 *
 * Vier Kennzahlen und die Kurve — nicht das ganze Profil, sondern der Blick, der einem
 * sagt, ob sich das Hinsehen lohnt. Wer mehr will, geht ins Profil; der Knopf dafuer ist
 * die auffaelligste Flaeche der Karte.
 *
 * `fehler` trennt "noch nicht geschlagen" von "Server antwortet nicht". Beides sieht
 * ohne diese Trennung wie eine leere Bilanz aus, und das eine ist eine Aussage ueber
 * die Person, das andere ueber die Leitung.
 */
export function MeineZahlen({ playerId, seasonId, seasonName, ladefehler = false }: {
  playerId: number
  seasonId: number | null
  seasonName?: string | null
  /**
   * Die Seite kam schon nicht an die Saison heran. Dann ist `seasonId === null` KEIN
   * "noch keine Saison angelegt", sondern ein Ausfall — und die beiden duerfen sich
   * nicht gleich lesen: das eine ist eine Aussage ueber den Verein, das andere ueber
   * die Leitung.
   */
  ladefehler?: boolean
}) {
  const [daten, setDaten] = useState<Daten | null>(null)
  const [fehler, setFehler] = useState(false)
  const schluessel = `${seasonId}:${playerId}`

  useEffect(() => {
    if (seasonId == null) return
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

  const leer = daten && !daten.schlag && !daten.spiele

  return (
    <section
      aria-label="Meine Zahlen"
      className="rounded-2xl bg-spotlight text-spotlight-ink shadow-lg shadow-navy-900/15 p-4"
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-white/70">
          <Abschnittsmarke size="sm" />
          Meine Zahlen
        </h2>
        {seasonName && (
          <span className="text-[11px] text-white/70 truncate min-w-0">{seasonName}</span>
        )}
      </div>

      {daten?.spieler && (
        <div className="mb-3">
          <PositionBadges player={daten.spieler} size="sm" tone="dark" />
        </div>
      )}

      {fehler || ladefehler ? (
        <p className="text-sm text-white/65">
          Deine Zahlen sind gerade nicht erreichbar — später nochmal reinschauen.
        </p>
      ) : seasonId == null ? (
        <p className="text-sm text-white/65">
          Es ist noch keine Saison angelegt. Sobald sie steht und du gespielt hast, stehen hier deine Zahlen.
        </p>
      ) : !daten ? (
        <p className="text-sm text-white/65">Zahlen laden …</p>
      ) : leer ? (
        <p className="text-sm text-white/65">
          In dieser Saison hast du noch nicht geschlagen. Sobald ein Spiel gezählt ist, in dem du
          dran warst, stehen die Zahlen hier.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-1.5">
            <Kennzahl wert={daten.schlag ? quote(daten.schlag.battingAverage) : '–'} label="AVG" />
            <Kennzahl wert={daten.schlag ? quote(daten.schlag.onBasePct) : '–'} label="OBP" />
            <Kennzahl wert={daten.schlag ? String(daten.schlag.hits) : '–'} label="Hits" />
            <Kennzahl wert={daten.spiele ? String(daten.spiele.totalGames) : '–'} label="Spiele" />
          </dl>
          <Verlauf punkte={daten.verlauf} />
        </>
      )}

      <Link
        to={`/players/${playerId}`}
        className="font-display mt-3 w-full min-h-11 inline-flex items-center justify-center px-4 rounded-lg bg-invers hover:bg-navy-800 hover:text-white text-invers-ink text-[11px] font-extrabold tracking-widest uppercase transition-colors"
      >
        Ganzes Profil
      </Link>
    </section>
  )
}

function Kennzahl({ wert, label }: { wert: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/8 border border-white/15 px-1.5 py-2.5 text-center">
      <dd className="font-display text-xl font-extrabold text-amber-400 leading-none tabular-nums">{wert}</dd>
      {/* /60 waere auf dem im Dunkeln helleren Block nur 3,8:1 — die Deckung muss mitwachsen. */}
      <dt className="font-display text-[10px] font-bold tracking-widest uppercase text-white/75 mt-1.5">{label}</dt>
    </div>
  )
}

/**
 * Die Formkurve als Streifen: nur die Linie, keine Achsen, keine Zahlen.
 *
 * Ein Funke, kein Diagramm — er sagt "es geht aufwaerts" oder "es flacht ab", und wer
 * es genauer wissen will, hat den Knopf darunter. Die Tinte ist weiss mit Deckung, weil
 * die Karte in BEIDEN Themes dunkel ist; `--color-bar` waere im Hellen fast unsichtbar.
 */
function Verlauf({ punkte }: { punkte: PlayerFormPoint[] }) {
  const pfad = useMemo(() => {
    const werte = punkte.map(p => p.rollingAverage).filter((v): v is number => typeof v === 'number')
    if (werte.length < 2) return null
    const hoch = Math.max(...werte)
    const tief = Math.min(...werte)
    const spanne = hoch - tief || 1
    const B = 100, H = 24, LUFT = 3
    const punkteStr = werte.map((v, i) => {
      const x = (i / (werte.length - 1)) * B
      const y = H - LUFT - ((v - tief) / spanne) * (H - 2 * LUFT)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    // Die Flaeche: dieselbe Kurve, unten am Rahmen entlang zurueck.
    const flaeche = [`0,${H}`, ...punkteStr, `${B},${H}`].join(' ')
    return { d: punkteStr.join(' '), flaeche, schluss: punkteStr.slice(-2).join(' ') }
  }, [punkte])

  if (!pfad) return null
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="w-full h-8 mt-3.5 overflow-visible"
      role="img"
      aria-label="Verlauf des Schlagdurchschnitts in dieser Saison"
    >
      {/*
        Flaeche statt blosser Linie. Eine fast waagerechte Kurve in einem 32px hohen Streifen
        sieht aus wie ein Trennstrich — die Fuellung macht auf den ersten Blick klar, dass hier
        etwas gemessen wird und nicht etwas getrennt.
      */}
      <polygon points={pfad.flaeche} fill="rgb(255 255 255 / 0.12)" stroke="none" />
      <polyline
        points={pfad.d}
        fill="none"
        stroke="rgb(255 255 255 / 0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/*
        Das letzte Stueck in Rot statt eines Punktes. `preserveAspectRatio="none"` zieht die
        Zeichnung in x auseinander — ein <circle> wird darin zum liegenden Strich, und am
        rechten Rand haette es obendrein die Haelfte verloren. Eine Linie vertraegt die
        Streckung, weil sie in x ohnehin keine Form hat.
      */}
      <polyline
        points={pfad.schluss}
        fill="none"
        stroke="var(--color-softball-red-500)"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
