import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerFormPoint } from '@/types'
import {
  METRICS, axis, cumulativeSeries, dateRange, fmt, fmtDate, xFractions,
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

const INK = {
  primary: 'var(--color-navy-800)',
  primaryFaint: 'var(--color-navy-400)',
  compare: '#B45309',
  last: 'var(--color-softball-red-600)',
}

type Props = {
  points: PlayerFormPoint[]
  playerName: string
  /** Mitspieler, mit denen sich vergleichen lässt. */
  teammates?: { playerId: number; playerName: string }[]
  compareId?: number | null
  onCompare?: (playerId: number | null) => void
  comparePoints?: PlayerFormPoint[]
  compareName?: string | null
}

/**
 * Form-Kurve eines Spielers: die **laufende Gesamtquote** über alle Schlagversuche
 * des Zeitraums, ein Punkt je Spiel. Vorher war es ein gleitender Schnitt über die
 * letzten 20 Schlagversuche — der sprang bei jedem Spiel und ließ sich zwischen
 * Spielern nicht vergleichen, weil hinter jedem Punkt eine andere Stichprobe stand.
 *
 * Gestrichelt heißt: noch zu wenig Schlagversuche, der Wert schwankt stark.
 *
 * Bewusst von Hand gezeichnet statt mit Chart-Library — der Spiel-Verlauf macht es
 * genauso, und eine Library brächte eigene Farben und Fonts mit.
 */
export function FormChart({
  points, playerName, teammates = [], compareId = null, onCompare, comparePoints = [], compareName = null,
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

  const series = useMemo(() => cumulativeSeries(points), [points])
  const compareSeries = useMemo(() => cumulativeSeries(comparePoints), [comparePoints])

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
    const span = dateRange(series, compareSeries)
    const values = [...series.map(p => p[metric]), ...compareSeries.map(p => p[metric])]
    const { max, guides } = axis(values)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const toX = (fraction: number) => PAD.left + fraction * innerW
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH
    return {
      y, guides, max, span,
      xs: xFractions(series.map(p => p.date), span).map(toX),
      compareXs: xFractions(compareSeries.map(p => p.date), span).map(toX),
    }
  }, [series, compareSeries, metric, W, H])

  const { y, xs, compareXs } = geometry

  const active = activeIndex != null ? series[activeIndex] : null
  const last = series[series.length - 1]
  const shown = active ?? last
  const firstSolid = series.findIndex(p => !p.provisional)

  // Wert des Vergleichs zum selben Zeitpunkt: der letzte Stand an oder vor diesem Tag.
  const compareAtActive = useMemo(() => {
    if (!shown?.date || compareSeries.length === 0) return null
    const bis = compareSeries.filter(p => p.date != null && p.date <= shown.date!)
    return bis.length > 0 ? bis[bis.length - 1] : null
  }, [shown, compareSeries])

  if (series.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Noch nichts gescort. Sobald ein Spiel live mitgeschrieben wird, wächst hier die Kurve.
      </p>
    )
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
      <div className="mb-3 min-h-[3.25rem]">
        <p className="text-sm text-navy-900">
          <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(shown[metric])}</span>
          <span className="text-gray-500"> {METRICS[metric].label} über {shown.plateAppearances} Schlagversuche</span>
        </p>
        <p className="text-[11px] text-gray-500 tabular-nums truncate">
          {active
            ? `${fmtDate(active.date)} vs ${active.opponent ?? 'unbekannt'} · ${active.gameHits} von ${active.gameAtBats}`
              + `${active.gameWalks > 0 ? ` · ${active.gameWalks} BB` : ''}`
              + `${active.gameStolenBases > 0 ? ` · ${active.gameStolenBases} SB` : ''}`
              + `${compareAtActive ? ` · ${compareName}: ${fmt(compareAtActive[metric])}` : ''}`
            : 'Punkt antippen zeigt das einzelne Spiel'}
        </p>
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
              stroke="var(--color-cream-300)" strokeWidth="1" strokeDasharray="3 4"
            />
            <text
              x={PAD.left - 6} y={y(g) + 3} textAnchor="end"
              className="fill-gray-400 text-[10px] tabular-nums"
            >
              {fmt(g)}
            </text>
          </g>
        ))}

        {/* Vergleichslinie zuerst: sie liegt hinter der eigenen Kurve. */}
        {compareSeries.length > 0 && (
          <path
            d={linie(compareSeries, compareXs)}
            fill="none" stroke={INK.compare} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            opacity="0.85"
          />
        )}

        {/* Provisorischer Anfang gestrichelt, der belastbare Teil durchgezogen. */}
        {firstSolid !== 0 && (
          <path
            d={linie(series, xs, 0, firstSolid < 0 ? series.length : firstSolid + 1)}
            fill="none" stroke={INK.primaryFaint} strokeWidth="2.5" strokeDasharray="5 5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        <path
          ref={pathRef}
          d={firstSolid < 0 ? '' : linie(series, xs, firstSolid)}
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
              fill={activeIndex === i || isLast ? ink : 'var(--color-cream-50)'}
              stroke={ink} strokeWidth="2"
            />
          )
        })}

        {/* Unsichtbare Trefferflächen: am Handy trifft man keinen 3px-Punkt. */}
        {series.map((p, i) => {
          const links = i === 0 ? PAD.left : (xs[i - 1] + xs[i]) / 2
          const rechts = i === series.length - 1 ? W - PAD.right : (xs[i] + xs[i + 1]) / 2
          return (
            <rect
              key={`hit-${p.gameId}`}
              x={links} y={PAD.top} width={Math.max(rechts - links, 1)} height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onPointerEnter={() => setActiveIndex(i)}
              onPointerDown={() => setActiveIndex(i)}
            />
          )
        })}

        {/* Zeitachse: Anfang und Ende der SKALA beschriften, nicht der eigenen Reihe —
            beim Vergleich spannt sie über beide, und sonst stuende dort ein Datum, das
            nicht zum linken Rand gehoert. */}
        <text x={PAD.left} y={H - 8} className="fill-gray-400 text-[10px]">
          {fmtDate(geometry.span?.from ?? series[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-gray-400 text-[10px]">
          {fmtDate(geometry.span?.to ?? last.date)}
        </text>
      </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
        {compareSeries.length > 0 ? (
          <>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-4 border-t-[3px]" style={{ borderColor: INK.primary }} /> {playerName}
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-4 border-t-2" style={{ borderColor: INK.compare }} /> {compareName}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-4 border-t-2 border-dashed border-navy-400" /> gestrichelt = noch zu wenig Schlagversuche
          </span>
        )}

        {onCompare && teammates.length > 0 && (
          <label className="inline-flex items-center gap-1.5 ml-auto">
            <span className="sr-only">Mit Mitspieler vergleichen</span>
            <select
              value={compareId ?? ''}
              onChange={e => onCompare(e.target.value ? Number(e.target.value) : null)}
              className="text-[11px] font-medium text-gray-600 bg-transparent border border-cream-300 rounded px-1.5 py-2 sm:py-1 cursor-pointer hover:border-navy-500 transition-colors focus:outline-none focus:border-navy-600"
            >
              <option value="">Vergleichen mit …</option>
              {teammates.map(t => (
                <option key={t.playerId} value={t.playerId}>{t.playerName}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}
