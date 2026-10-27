import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PositionBadges } from '@/components/players/PositionBadges'
import { cumulativeSeries, MIN_AT_BATS, type CumulativePoint, type Metric } from '@/components/players/formSeries'
import type { MeineZahlen } from './useMeineZahlen'

/**
 * Was die Zahl bedeutet, in einem Satz.
 *
 * Die Abkuerzungen sind Fachsprache, und ein gutes Drittel des Kaders liest sie zum ersten
 * Mal. Die Schwellen stammen aus dem Glossar (`StatsGlossarySheet`) — dieselbe Auskunft,
 * nur hier in der Schreibweise der Kacheln (.300 statt 30 %), damit nicht zwei Notationen
 * nebeneinander stehen.
 */
const ERKLAERUNG: Record<Metric, string> = {
  average: 'Treffer ÷ Versuche — wie oft du triffst, wenn du schlägst. Gut ab .300.',
  onBase: 'Wie oft du überhaupt auf Base kommst, Walks und Hit-by-Pitch mitgezählt. Gut ab .380.',
  slugging: 'Wie kräftig du triffst: Bases pro Versuch. Gut ab .450.',
  ops: 'Auf-Base-Quote plus Schlagkraft in einer Zahl. Stark ab .800.',
}

/** Die drei Quoten im Kopf, in dieser Reihenfolge. SLG steht im Profil, nicht hier. */
const KACHELN: { metrik: Metric; label: string; wert: (z: NonNullable<MeineZahlen['schlag']>) => number }[] = [
  { metrik: 'average', label: 'AVG', wert: z => z.battingAverage },
  { metrik: 'onBase', label: 'OBP', wert: z => z.onBasePct },
  { metrik: 'ops', label: 'OPS', wert: z => z.ops },
]

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
  const [metrik, setMetrik] = useState<Metric>('average')
  // Dieselbe Rechnung wie im Profil — zwei Definitionen derselben Quote waeren eine zu viel.
  const reihe = useMemo(
    () => cumulativeSeries(daten?.verlauf ?? []).filter(p => !p.provisional),
    [daten],
  )
  const leer = daten && !daten.schlag && !daten.spiele

  return (
    <section
      aria-label="Meine Zahlen"
      className="rounded-2xl bg-kopf text-spotlight-ink shadow-lg shadow-navy-900/15 px-4 py-3 sm:px-6 sm:py-5"
    >
      {/*
        Am Handy untereinander, ab lg nebeneinander: vier Kacheln ueber 1200px verteilt
        lassen die Zahlen in der Flaeche schwimmen, und der Name haette rechts von sich
        nichts als Luft. Nebeneinander traegt jede Haelfte ihre eigene Breite.
      */}
      <div className="md:flex md:items-center md:justify-between md:gap-6 lg:gap-8">
      {/* Am Handy sitzt der Profil-Knopf rechts oben; ab lg direkt neben dem Namen —
          `justify-between` wuerde ihn dort in die Luecke zur Zahlenreihe schieben. */}
      <div className="flex items-start justify-between gap-3 flex-wrap md:flex-1 md:min-w-0 md:justify-start md:gap-5">
        <div className="min-w-0">
          <h1 className="font-headline text-[1.75rem] sm:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tight leading-none">
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
            state={{ zurueck: '/' }}
            className="font-display min-h-11 inline-flex items-center px-4 rounded-lg bg-invers hover:bg-navy-800 hover:text-white text-invers-ink text-[11px] font-extrabold tracking-widest uppercase transition-colors shrink-0"
          >
            Ganzes Profil
          </Link>
        )}
      </div>

      <div className="mt-4 md:mt-0 md:w-[22rem] lg:w-[34rem] xl:w-[40rem] md:shrink-0">
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
            {/*
              AVG, OBP, OPS — und die Menge dahinter. Hits ist eine Zaehlung, keine Guete:
              wer oft drankommt, hat viele, und im Profil stehen sie ohnehin.

              Die drei Quoten sind Schalter: ein Tipp legt die Kurve darunter auf diese Zahl
              um und schreibt dazu, was sie bedeutet. "Spiele" ist kein Schalter — dahinter
              steckt keine Quote und also auch keine Kurve.
            */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {KACHELN.map(k => (
                <Kennzahl
                  key={k.metrik}
                  wert={daten.schlag ? quote(k.wert(daten.schlag)) : '–'}
                  label={k.label}
                  gewaehlt={metrik === k.metrik}
                  onWaehlen={() => setMetrik(k.metrik)}
                />
              ))}
              <Kennzahl wert={daten.spiele ? String(daten.spiele.totalGames) : '–'} label="Spiele" />
            </div>
            <Verlauf reihe={reihe} metrik={metrik} />
            <p className="text-[11px] sm:text-xs text-white/75 leading-snug sm:leading-relaxed mt-1.5 sm:mt-2">
              {ERKLAERUNG[metrik]}
            </p>
          </>
        )}
      </div>
      </div>
    </section>
  )
}

function Kennzahl({ wert, label, gewaehlt, onWaehlen }: {
  wert: string
  label: string
  gewaehlt?: boolean
  onWaehlen?: () => void
}) {
  /*
   * Volle Tinte auf den Schaltern, /75 auf der stillen Kachel.
   *
   * Die gewaehlte Kachel ist heller gefuellt — darauf fiel /75 auf 3,89:1, gemessen vom
   * Kontrast-Pruefer. Die Deckung muss mit der Flaeche mitwachsen, und ein Schalter darf
   * ohnehin lauter sein als eine Anzeige.
   */
  const tinte = onWaehlen ? 'text-white' : 'text-white/75'
  const inhalt = (
    <>
      <span className="block font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-kennzahl leading-none tabular-nums">{wert}</span>
      <span className={`block font-display text-[10px] font-bold tracking-widest uppercase ${tinte} mt-1.5`}>{label}</span>
    </>
  )
  const grund = 'relative rounded-xl px-1.5 py-2 sm:py-2.5 text-center block w-full'
  if (!onWaehlen) {
    return <div className={`${grund} bg-white/8 border border-white/15`}>{inhalt}</div>
  }
  return (
    <button
      type="button"
      onClick={onWaehlen}
      aria-pressed={gewaehlt}
      aria-label={`${label} — Kurve anzeigen`}
      className={`${grund} cursor-pointer transition-colors ${
        gewaehlt
          ? 'bg-white/12 border border-white/50'
          : 'bg-white/8 border border-white/15 hover:bg-white/12'
      }`}
    >
      {inhalt}
    </button>
  )
}

/**
 * Die Formkurve als Streifen: nur die Flaeche, keine Achsen, keine Zahlen.
 *
 * Ein Funke, kein Diagramm — er sagt "es geht aufwaerts" oder "es flacht ab". Gefuellt,
 * weil eine fast waagerechte Linie in einem 32px hohen Streifen wie ein Trennstrich
 * aussieht. Die Tinte ist weiss mit Deckung, weil der Block in BEIDEN Themes dunkel ist.
 *
 * Gezeichnet wird die laufende Gesamtquote aus `formSeries` — dieselbe, die das Profil
 * zeigt. Punkte unter `MIN_AT_BATS` At-Bats sind schon draussen: ein 1-aus-1 im ersten Spiel
 * ergibt kumulativ 1.000 und zoege die ganze Kurve schief.
 */
function Verlauf({ reihe, metrik }: { reihe: CumulativePoint[]; metrik: Metric }) {
  const pfad = useMemo(() => {
    const werte = reihe.map(p => p[metrik])
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
  }, [reihe, metrik])

  if (!pfad) {
    return (
      <p className="text-[11px] text-white/70 mt-3">
        Die Kurve beginnt ab {MIN_AT_BATS} At-Bats — davor sagt ein Schnitt mehr, als er weiß.
      </p>
    )
  }
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="w-full h-6 sm:h-8 mt-2.5 sm:mt-3.5 overflow-visible"
      role="img"
      aria-label={`Verlauf von ${metrik === 'average' ? 'AVG' : metrik === 'onBase' ? 'OBP' : 'OPS'} über ${reihe.length} Spiele`}
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
