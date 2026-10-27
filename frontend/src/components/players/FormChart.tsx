import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerFormPoint } from '@/types'
import {
  METRICS, MIN_AT_BATS, axis, cumulativeSeries, denominator, fmt, fmtDate, monthTicks, xFractions,
  type CumulativePoint, type Metric,
} from './formSeries'

/*
 * Die Zeichenfläche misst echte Pixel statt einer festen viewBox: ein skaliertes
 * 720er-Koordinatensystem drückt die Kurve am Handy auf Briefmarkengröße und
 * schrumpft die Beschriftung mit. Gemessen wird der Container, die Höhe ist
 * am Handy flacher als am Desktop.
 */
const PAD = { top: 16, right: 14, bottom: 28, left: 40 }
const FALLBACK_WIDTH = 720

/*
 * Tokens, keine Paletten-Variablen. Der Shim deutet KLASSEN um, nicht `--color-navy-800`
 * — eine Kurve, die direkt aus der Palette malt, bleibt im Dunkeln dunkel. Genau so
 * verschwand die Formkurve: #193253 auf einer Karte in #273D5A sind 1,25:1.
 * `--color-bar` ist dafuer gebaut: im Hellen derselbe Wert wie bisher, im Dunkeln hell.
 * Der letzte Punkt bleibt Rot — er zeigt auf beiden Gruenden.
 */
const INK = {
  primary: 'var(--color-bar)',
  last: 'var(--color-softball-red-600)',
}

/**
 * Bis zu zwei Vergleichsreihen, jede mit eigener Farbe UND eigenem Strich.
 *
 * Gewählt nach Kontrast, nicht nach Geschmack — gemessen gegen Cream (lesbar?) und
 * gegen die navy-800 der Hauptlinie (unterscheidbar?):
 *
 * | Farbe      | Sättigung | zu Cream | zu navy-800 |
 * |------------|-----------|----------|-------------|
 * | navy-800   |    59 %   |  16.42   |      —      |
 * | #5964C5    |    48 %   |   4.81   |    3.42     |
 * | teal-700   |    77 %   |   5.08   |    3.23     |
 * | navy-400   |    24 %   |   4.70   |    3.49  ✗  |
 * | navy-500   |    36 %   |   7.46   |    2.20  ✗  |
 * | gray-500   |     3 %   |   7.27   |    2.26  ✗  |
 *
 * Zwei Fehlversuche davor: gray-500 und navy-500 stehen der Hauptlinie zu nah, beide
 * lasen sich als dasselbe Dunkel. navy-400 hat die Abstände, ist aber das
 * ausgewaschene Glied der Leiter — mit 24 % Sättigung neben einem satten navy-800
 * liest es sich als anderes Blau statt als dasselbe, nur heller. Deshalb hier ein
 * eigener Ton im Hausfarbton (234°), auf Sättigung gebracht statt aus der Leiter
 * gegriffen.
 *
 * Amber und Emerald sind im Haus belegt (positiv / Sieg), Rot ist negativen Signalen
 * vorbehalten — eine Vergleichslinie darf nicht werten, sie soll unterscheiden.
 *
 * Der Strich ist der zweite Kanal: wer Farben schlecht trennt oder das Bild ausdruckt,
 * erkennt die Reihen trotzdem.
 */
const COMPARE_STYLES = [
  { ink: 'var(--color-serie-b)', dash: '6 4' },
  { ink: 'var(--color-serie-c)', dash: '1.5 4' },
] as const

export const MAX_COMPARE = COMPARE_STYLES.length

export type ComparePlayer = { playerId: number; playerName: string; points: PlayerFormPoint[] }

type Props = {
  points: PlayerFormPoint[]
  playerName: string
  /** Mitspieler, mit denen sich vergleichen lässt. */
  teammates?: { playerId: number; playerName: string }[]
  /** Aktuell verglichene Mitspieler, höchstens {@link MAX_COMPARE}. */
  compares?: ComparePlayer[]
  onComparesChange?: (playerIds: number[]) => void
}

/**
 * Form-Kurve eines Spielers: die **laufende Gesamtquote** über alle At-Bats
 * des Zeitraums, ein Punkt je Spiel. Vorher war es ein gleitender Schnitt über die
 * letzten 20 At-Bats — der sprang bei jedem Spiel und ließ sich zwischen
 * Spielern nicht vergleichen, weil hinter jedem Punkt eine andere Stichprobe stand.
 *
 * Die Linie beginnt erst ab MIN_AT_BATS — davor sagt die laufende Quote nichts.
 *
 * Bewusst von Hand gezeichnet statt mit Chart-Library — der Spiel-Verlauf macht es
 * genauso, und eine Library brächte eigene Farben und Fonts mit.
 */
export function FormChart({
  points, playerName, teammates = [], compares = [], onComparesChange,
}: Props) {
  const [metric, setMetric] = useState<Metric>('average')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)

  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, Math.round(entry.contentRect.width)))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const W = width
  const H = width < 480 ? 190 : 240

  // Gezeichnet wird erst ab MIN_AT_BATS — davor sagt die laufende Quote nichts und
  // riss die Achse auf. Wer die Schwelle nicht erreicht, bekommt keine Linie: drei
  // At-Bats ergaben sonst einen Strich auf 1.000, der nach Fehler aussah.
  const belastbar = (reihe: CumulativePoint[]) => reihe.filter(p => !p.provisional)
  const alle = useMemo(() => cumulativeSeries(points), [points])
  const series = useMemo(() => belastbar(alle), [alle])
  const compareLines = useMemo(
    () => compares.slice(0, MAX_COMPARE).map((c, i) => ({
      ...c,
      series: belastbar(cumulativeSeries(c.points)),
      style: COMPARE_STYLES[i],
    })),
    [compares],
  )

  // Ein einziger inszenierter Moment: die Kurve zeichnet sich beim ersten Rendern
  // einmal von links nach rechts. Danach bewegt sich nichts mehr von selbst.
  useEffect(() => {
    const path = pathRef.current
    // getTotalLength fehlt in jsdom (Tests) — ohne Messung gibt es eben keine Einzeichnung.
    if (!path || typeof path.getTotalLength !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const length = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    // Reflow erzwingen, sonst fasst der Browser beide Styles zu einem Frame zusammen.
    void path.getBoundingClientRect()
    path.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.23, 1, 0.32, 1)'
    path.style.strokeDashoffset = '0'
  }, [series, metric])

  const geometry = useMemo(() => {
    const values = [...series, ...compareLines.flatMap(c => c.series)].map(p => p[metric])
    const { max, guides } = axis(values)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const toX = (fraction: number) => PAD.left + fraction * innerW
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH
    const span = Math.max(series.length, ...compareLines.map(c => c.series.length), 1)
    return {
      y, guides, max,
      xs: xFractions(series.length, span).map(toX),
      compareXs: compareLines.map(c => xFractions(c.series.length, span).map(toX)),
    }
  }, [series, compareLines, metric, W, H])

  const { y, xs, compareXs } = geometry

  const active = activeIndex != null ? series[activeIndex] : null
  const last = series[series.length - 1]
  const shown = active ?? last

  // Stand der Vergleiche zum selben Zeitpunkt: der letzte Punkt an oder vor diesem Tag.
  const compareAtActive = useMemo(
    () => compareLines.map(c => {
      if (!shown?.date) return c.series[c.series.length - 1] ?? null
      const bis = c.series.filter(p => p.date != null && p.date <= shown.date!)
      return bis[bis.length - 1] ?? null
    }),
    [shown, compareLines],
  )

  if (alle.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Noch nichts gescort. Sobald ein Spiel live mitgeschrieben wird, wächst hier die Kurve.
      </p>
    )
  }

  // Zu wenig At-Bats fuer eine Aussage: lieber sagen, wie weit es noch ist, als eine
  // Linie zeichnen, die nur die letzte Zufallsserie zeigt.
  if (series.length === 0) {
    const bisher = alle[alle.length - 1].atBats
    return (
      <p className="text-sm text-gray-500">
        Noch zu wenig At-Bats für eine Kurve — {bisher} von {MIN_AT_BATS}.
        <span className="block text-[11px] mt-1">
          Bis dahin schwankt der Schnitt bei jedem Schlag zu stark, um etwas zu zeigen.
        </span>
      </p>
    )
  }

  /** Pointer festhalten, damit das Ziehen auch außerhalb der Fläche weiterläuft.
   *  jsdom und ältere Browser kennen die Methoden nicht — dort eben ohne. */
  const fangePointer = (el: Element, id: number) => {
    if (typeof el.setPointerCapture === 'function') el.setPointerCapture(id)
  }
  const loesePointer = (el: Element, id: number) => {
    if (typeof el.releasePointerCapture === 'function') el.releasePointerCapture(id)
  }

  /** Nächstgelegener Punkt zur Finger- oder Mausposition. */
  const waehleBeiX = (clientX: number, ziel: Element) => {
    const box = ziel.getBoundingClientRect()
    if (box.width === 0 || xs.length === 0) return
    // Von Bildschirm- auf viewBox-Koordinaten: das SVG skaliert über max-w-full.
    const x = PAD.left + ((clientX - box.left) / box.width) * (W - PAD.left - PAD.right)
    let naechster = 0
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i] - x) < Math.abs(xs[naechster] - x)) naechster = i
    }
    setActiveIndex(naechster)
  }

  const linie = (pts: CumulativePoint[], px: number[], von = 0, bis = pts.length) =>
    pts.slice(von, bis)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${px[i + von].toFixed(1)} ${y(p[metric]).toFixed(1)}`)
      .join(' ')

  return (
    <div>
      {/* Ein Schalter mit vier Stellungen statt vier einzelner Pillen: die Kennzahlen
          schließen sich aus, und die Karte hat schon genug runde Elemente. */}
      <div className="inline-flex items-center gap-0.5 rounded-full border border-cream-300 bg-cream-100 p-0.5 mb-3" role="group" aria-label="Kennzahl">
        {(Object.keys(METRICS) as Metric[]).map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setMetric(key)}
            aria-pressed={metric === key}
            title={METRICS[key].long}
            className={`font-display text-[11px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 cursor-pointer transition-colors active:scale-95 motion-reduce:active:scale-100 ${
              metric === key ? 'bg-navy-800 text-white' : 'text-gray-600 hover:text-navy-900'
            }`}
          >
            {METRICS[key].label}
          </button>
        ))}
      </div>

      {/* Feste Höhe: beim Wandern von Punkt zu Punkt soll nichts springen. Vorher
          verschob eine längere Gegner-Zeile den ganzen Block unter dem Finger. */}
      <div className="mb-3" style={{ minHeight: `${3.25 + compareLines.length * 1.1}rem` }}>
        <p className="text-sm text-navy-900">
          <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(shown[metric])}</span>
          <span className="text-gray-500"> {METRICS[metric].label} aus {denominator(shown, metric).value} {denominator(shown, metric).label}</span>
        </p>
        <p className="text-[11px] text-gray-500 tabular-nums truncate">
          {active
            ? `${fmtDate(active.date)} vs ${active.opponent ?? 'unbekannt'} · ${active.gameHits} von ${active.gameAtBats}`
              + `${active.gameWalks > 0 ? ` · ${active.gameWalks} BB` : ''}`
              + `${active.gameStolenBases > 0 ? ` · ${active.gameStolenBases} SB` : ''}`
            : null}
          {!active && (
            <>
              <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">
                Auf der Kurve wischen zeigt das einzelne Spiel
              </span>
              <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">
                Mit der Maus über die Kurve fahren zeigt das einzelne Spiel
              </span>
            </>
          )}
        </p>
        {compareLines.map((c, i) => {
          const stand = compareAtActive[i]
          if (!stand) return null
          return (
            <p key={c.playerId} className="text-[11px] tabular-nums truncate" style={{ color: c.style.ink }}>
              {c.playerName}: {fmt(stand[metric])}{active ? ' zum selben Zeitpunkt' : ' insgesamt'}
            </p>
          )
        })}
      </div>

      <div ref={boxRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="max-w-full touch-pan-y"
        role="img"
        aria-label={`${METRICS[metric].long} über ${series.length} Spiele, zuletzt ${fmt(last[metric])}`}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {geometry.guides.map(g => (
          <g key={g}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)}
              stroke="var(--color-line)" strokeWidth="1" strokeDasharray="3 4"
            />
            <text
              x={PAD.left - 6} y={y(g) + 3} textAnchor="end"
              className="fill-gray-400 text-[10px] tabular-nums"
            >
              {fmt(g)}
            </text>
          </g>
        ))}

        {/* Vergleichslinien zuerst: sie liegen hinter der eigenen Kurve. Der Endpunkt
            gehoert dazu — ohne ihn sieht man nicht, wo der andere gerade steht, und
            die Reihe liest sich wie Dekoration statt wie ein zweiter Spieler. */}
        {compareLines.map((c, i) => c.series.length > 0 && (
          <g key={c.playerId}>
            <path
              d={linie(c.series, compareXs[i])}
              fill="none" stroke={c.style.ink} strokeWidth="2.5" strokeDasharray={c.style.dash}
              strokeLinecap="round" strokeLinejoin="round"
            />
            <circle
              cx={compareXs[i][c.series.length - 1]}
              cy={y(c.series[c.series.length - 1][metric])}
              r="4" fill={c.style.ink} stroke={c.style.ink} strokeWidth="2"
            />
          </g>
        ))}

        <path
          ref={pathRef}
          d={linie(series, xs)}
          fill="none" stroke={INK.primary} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {series.map((p, i) => {
          // Der jüngste Punkt ist der einzige farbige: er sagt „hier steht er gerade".
          const isLast = i === series.length - 1
          const ink = isLast ? INK.last : INK.primary
          return (
            <circle
              key={p.gameId}
              cx={xs[i]} cy={y(p[metric])} r={activeIndex === i ? 5 : isLast ? 4.5 : 3}
              className="transition-[r] duration-150"
              fill={activeIndex === i || isLast ? ink : 'var(--color-surface-raised)'}
              stroke={ink} strokeWidth="2"
            />
          )
        })}

        {/* Senkrechte Fanglinie am gewählten Punkt: die Fingerkuppe deckt den Punkt
            zu, die Linie ragt darüber hinaus und sagt, wo man gerade steht. */}
        {activeIndex != null && (
          <line
            x1={xs[activeIndex]} x2={xs[activeIndex]} y1={PAD.top} y2={H - PAD.bottom}
            stroke="var(--color-ink-faint)" strokeWidth="1" pointerEvents="none"
          />
        )}

        {/* EINE Fläche statt einer pro Punkt: bei 17 Spielen waren die Felder 7–14 px
            breit, eine Fingerkuppe deckte drei bis sechs davon. Jetzt zählt nur, wo
            der Finger ist — der nächstgelegene Punkt wird gewählt, und beim Ziehen
            wandert die Auswahl mit, statt dass man neu zielen muss. */}
        <rect
          x={PAD.left} y={PAD.top}
          width={Math.max(W - PAD.left - PAD.right, 1)} height={H - PAD.top - PAD.bottom}
          fill="transparent"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={e => { fangePointer(e.currentTarget, e.pointerId); waehleBeiX(e.clientX, e.currentTarget) }}
          onPointerMove={e => { if (e.buttons > 0 || e.pointerType === 'mouse') waehleBeiX(e.clientX, e.currentTarget) }}
          onPointerUp={e => loesePointer(e.currentTarget, e.pointerId)}
        />

        {/* Zeitachse: Monatswechsel statt zweier Eckdaten. Die Achse zählt Spiele,
            die Marken sagen, wie dicht sie lagen — fünf Punkte zwischen Mai und Jun
            heißt dichter Monat. Zu enge Marken fallen weg. */}
        {monthTicks(series).reduce<{ index: number; label: string; x: number }[]>((behalten, t) => {
          const x = xs[t.index]
          if (behalten.length > 0 && x - behalten[behalten.length - 1].x < 34) return behalten
          return [...behalten, { ...t, x }]
        }, []).map(t => (
          <g key={t.index}>
            {/* Kurzer Strich an der Grundlinie statt einer Linie durchs Bild: ein
                zweites Gitter quer zum ersten nimmt der Kurve die Aufmerksamkeit. */}
            <line
              x1={t.x} x2={t.x} y1={H - PAD.bottom} y2={H - PAD.bottom + 4}
              stroke="var(--color-line-strong)" strokeWidth="1"
            />
            <text x={t.x} y={H - 8} textAnchor="middle" className="fill-gray-400 text-[10px]">{t.label}</text>
          </g>
        ))}
      </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
        {compareLines.length > 0 ? (
          <>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-4 border-t-[3px]" style={{ borderColor: INK.primary }} /> {playerName}
            </span>
            {compareLines.map(c => (
              <span
                key={c.playerId}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cream-300 bg-cream-100 pl-2 pr-0.5 py-0.5"
              >
                <svg width="16" height="3" aria-hidden="true" className="shrink-0">
                  <line x1="0" y1="1.5" x2="16" y2="1.5" stroke={c.style.ink} strokeWidth="2.5" strokeDasharray={c.style.dash} />
                </svg>
                <span style={{ color: c.style.ink }} className="font-medium">{c.playerName}</span>
                {/* Echte Trefferflaeche statt eines 11px-Zeichens: am Handy trifft
                    man ein nacktes × nicht. */}
                <button
                  type="button"
                  onClick={() => onComparesChange?.(compareLines.filter(x => x.playerId !== c.playerId).map(x => x.playerId))}
                  aria-label={`${c.playerName} aus dem Vergleich nehmen`}
                  className="w-7 h-7 -my-1 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-navy-900 hover:bg-cream-300 cursor-pointer transition-colors active:scale-90 motion-reduce:active:scale-100"
                >
                  ×
                </button>
              </span>
            ))}
          </>
        ) : (
          <span className="whitespace-nowrap">Laufender Schnitt ab {MIN_AT_BATS} At-Bats</span>
        )}

        {onComparesChange && teammates.length > 0 && compareLines.length < MAX_COMPARE && (
          <label className="inline-flex items-center gap-1.5 ml-auto">
            <span className="sr-only">Mitspieler zum Vergleich hinzufügen</span>
            <select
              value=""
              onChange={e => {
                if (!e.target.value) return
                onComparesChange([...compareLines.map(c => c.playerId), Number(e.target.value)])
              }}
              className="text-[11px] font-bold text-navy-800 bg-cream-100 border border-cream-300 rounded-full px-3 py-2 sm:py-1.5 cursor-pointer hover:border-navy-500 hover:bg-cream-200 transition-colors focus:outline-none focus:border-navy-600"
            >
              <option value="">+ Spieler vergleichen</option>
              {teammates
                .filter(t => !compareLines.some(c => c.playerId === t.playerId))
                .map(t => <option key={t.playerId} value={t.playerId}>{t.playerName}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Erklaert die Achse — und damit auch, warum ein Monat fehlen kann: dort gab es
          keine Spiele. Steht ausserhalb der Legende, sonst verschwindet der Satz
          ausgerechnet beim Vergleich. */}
      <p className="mt-1.5 text-[11px] text-gray-400">
        Ein Schritt je Spiel · Monate zeigen, wie dicht sie lagen
      </p>
    </div>
  )
}
