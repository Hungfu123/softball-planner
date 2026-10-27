import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PositionBadges } from '@/components/players/PositionBadges'
import type { PlayerFormPoint } from '@/types'
import type { MeineZahlen } from './useMeineZahlen'

/**
 * `.355` statt `0.355` — Schlagzahlen schreibt man im Baseball ohne die fuehrende Null.
 *
 * Ab 1 bleibt die Stelle stehen: OPS ueberschreitet die 1 regelmaessig, und `1.010` ohne
 * Vorzahl waere keine Konvention, sondern ein Lesefehler.
 */
function quote(v: number): string {
  const s = v.toFixed(3)
  return s.startsWith('0.') ? s.slice(1) : s
}

/**
 * Der Kopf der Startseite: wer man ist, wo man spielt, wie man dasteht.
 *
 * Das Erste, was man sieht, soll von einem selbst handeln — danach erst vom Verein.
 * Deshalb steht hier der Name, direkt darunter die Position (die Frage "wo spiele ich
 * eigentlich" beantwortet sonst keine Seite auf einen Blick) und dann drei Zahlen plus
 * die Menge dahinter.
 *
 * Die Daten kommen von aussen: den Verlauf braucht auch die Kachel mit den letzten
 * Spielen, und zwei Haken holten dieselben Listen zweimal.
 */
export function Begruessung({ name, playerId, seasonId, seasonName, daten, fehler, ladefehler = false }: {
  name: string | null
  playerId: number | null
  seasonId: number | null
  seasonName?: string | null
  daten: MeineZahlen | null
  fehler: boolean
  ladefehler?: boolean
}) {
  const leer = daten && !daten.schlag && !daten.spiele

  return (
    <section
      aria-label="Meine Zahlen"
      className="rounded-2xl bg-spotlight text-spotlight-ink shadow-lg shadow-navy-900/15 px-4 py-3.5 sm:px-6 sm:py-5"
    >
      {/*
        Am Handy untereinander, ab lg nebeneinander: vier Kacheln ueber 1200px verteilt
        lassen die Zahlen in der Flaeche schwimmen, und der Name haette rechts von sich
        nichts als Luft. Nebeneinander traegt jede Haelfte ihre eigene Breite.
      */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
      {/* Am Handy sitzt der Profil-Knopf rechts oben; ab lg direkt neben dem Namen —
          `justify-between` wuerde ihn dort in die Luecke zur Zahlenreihe schieben. */}
      <div className="flex items-start justify-between gap-3 flex-wrap lg:flex-1 lg:min-w-0 lg:justify-start lg:gap-6">
        <div className="min-w-0">
          <h1 className="font-headline text-[1.75rem] sm:text-4xl font-black uppercase tracking-tight leading-none">
            Hallo {name ?? 'zusammen'}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {daten?.spieler && <PositionBadges player={daten.spieler} size="sm" tone="dark" />}
            {seasonName && <span className="text-[11px] text-white/70 truncate">{seasonName}</span>}
          </div>
        </div>
        {playerId != null && (
          <Link
            to={`/players/${playerId}`}
            className="font-display min-h-11 inline-flex items-center px-4 rounded-lg bg-invers hover:bg-navy-800 hover:text-white text-invers-ink text-[11px] font-extrabold tracking-widest uppercase transition-colors shrink-0 lg:self-end"
          >
            Ganzes Profil
          </Link>
        )}
      </div>

      <div className="mt-4 lg:mt-0 lg:w-[30rem] lg:shrink-0">
        {playerId == null ? (
          <p className="text-sm text-white/70">
            Dein Konto ist noch keinem Spieler zugeordnet. Sag dem Trainer Bescheid — dann stehen
            hier deine Position und deine Zahlen.
          </p>
        ) : fehler || ladefehler ? (
          <p className="text-sm text-white/70">
            Deine Zahlen sind gerade nicht erreichbar — später nochmal reinschauen.
          </p>
        ) : seasonId == null ? (
          <p className="text-sm text-white/70">
            Es ist noch keine Saison angelegt. Sobald sie steht und du gespielt hast, stehen hier
            deine Zahlen.
          </p>
        ) : !daten ? (
          <p className="text-sm text-white/70">Zahlen laden …</p>
        ) : leer ? (
          <p className="text-sm text-white/70">
            In dieser Saison hast du noch nicht geschlagen. Sobald ein Spiel gezählt ist, in dem du
            dran warst, stehen die Zahlen hier.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {/*
                AVG, OBP, OPS — und die Menge dahinter. Hits ist eine Zaehlung, keine Guete:
                wer oft drankommt, hat viele, und zwei Zeilen tiefer im Profil stehen sie
                ohnehin. OPS fasst Treffen und Auf-Base-Kommen in einer Zahl zusammen und
                ist damit das Einzige hier, was man mit einem Blick vergleichen kann.
              */}
              <Kennzahl wert={daten.schlag ? quote(daten.schlag.battingAverage) : '–'} label="AVG" />
              <Kennzahl wert={daten.schlag ? quote(daten.schlag.onBasePct) : '–'} label="OBP" />
              <Kennzahl wert={daten.schlag ? quote(daten.schlag.ops) : '–'} label="OPS" />
              <Kennzahl wert={daten.spiele ? String(daten.spiele.totalGames) : '–'} label="Spiele" />
            </dl>
            <Verlauf punkte={daten.verlauf} />
          </>
        )}
      </div>
      </div>
    </section>
  )
}

function Kennzahl({ wert, label }: { wert: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/8 border border-white/15 px-1.5 py-2 sm:py-2.5 text-center">
      <dd className="font-display text-xl sm:text-2xl font-extrabold text-amber-400 leading-none tabular-nums">{wert}</dd>
      {/* /60 waere auf dem im Dunkeln helleren Block nur 3,8:1 — die Deckung muss mitwachsen. */}
      <dt className="font-display text-[10px] font-bold tracking-widest uppercase text-white/75 mt-1.5">{label}</dt>
    </div>
  )
}

/**
 * Die Formkurve als Streifen: nur die Flaeche, keine Achsen, keine Zahlen.
 *
 * Ein Funke, kein Diagramm — er sagt "es geht aufwaerts" oder "es flacht ab". Gefuellt,
 * weil eine fast waagerechte Linie in einem 32px hohen Streifen wie ein Trennstrich
 * aussieht. Die Tinte ist weiss mit Deckung, weil der Block in BEIDEN Themes dunkel ist.
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
    return {
      d: punkteStr.join(' '),
      flaeche: [`0,${H}`, ...punkteStr, `${B},${H}`].join(' '),
      schluss: punkteStr.slice(-2).join(' '),
    }
  }, [punkte])

  if (!pfad) return null
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="w-full h-7 sm:h-8 mt-3 sm:mt-3.5 overflow-visible"
      role="img"
      aria-label="Verlauf des Schlagdurchschnitts in dieser Saison"
    >
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
        Zeichnung in x auseinander — ein <circle> wird darin zum liegenden Strich und haette
        am rechten Rand obendrein die Haelfte verloren.
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
