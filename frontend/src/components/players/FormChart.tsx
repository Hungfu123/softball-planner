import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerFormPoint } from '@/types'

/*
 * Die Zeichenfläche misst echte Pixel statt einer festen viewBox: ein skaliertes
 * 720er-Koordinatensystem drückt die Kurve am Handy auf Briefmarkengröße und
 * schrumpft die Beschriftung mit. Gemessen wird der Container, die Höhe ist
 * am Handy flacher als am Desktop.
 */
const PAD = { top: 16, right: 14, bottom: 28, left: 36 }
const FALLBACK_WIDTH = 720

/** Mögliche Abstände der Hilfslinien, aufsteigend. Gewählt wird der kleinste, der
 *  höchstens fünf Linien ergibt — ein Spieler mit zwei Spielen spannt sonst von .300
 *  bis 1.100 und bekommt neun Linien. */
const GUIDE_STEPS = [0.05, 0.1, 0.2, 0.25, 0.5]
const MAX_GUIDES = 5

/**
 * Die vier Quoten, die man im Verlauf lesen kann. Steals und Walks sind Zählwerte,
 * keine Quoten — sie stehen im Teamvergleich darunter, nicht in der Kurve.
 */
const METRICS = {
  rollingAverage: { label: 'AVG', long: 'Schlagdurchschnitt' },
  rollingOnBase: { label: 'OBP', long: 'On-Base-Quote' },
  rollingSlugging: { label: 'SLG', long: 'Schlagkraft' },
  rollingOps: { label: 'OPS', long: 'OBP plus SLG' },
} as const

type Metric = keyof typeof METRICS

/**
 * Form-Kurve eines Spielers: gleitender Schnitt über die letzten Plate Appearances,
 * ein Punkt je Spiel. Die dicke Navy-Linie ist der Schlagdurchschnitt, die dünne
 * darüber die On-Base-Quote.
 *
 * Gestrichelt heißt: das Fenster ist noch nicht voll, der Wert schwankt noch stark.
 *
 * Bewusst von Hand gezeichnet statt mit Chart-Library — der Spiel-Verlauf macht es
 * genauso, und eine Library brächte eigene Farben und Fonts mit.
 */
export function FormChart({ points }: { points: PlayerFormPoint[] }) {
  const [metric, setMetric] = useState<Metric>('rollingAverage')
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
  }, [points, metric])

  // Die Achse umschließt die Daten statt bei .000 zu beginnen: ein Schnitt bewegt sich
  // selten unter .150, und eine Nulllinie drückt genau die Ausschläge flach, die man
  // sehen will. Gerundet auf ganze Hilfslinien, damit die Beschriftung aufgeht.
  const geometry = useMemo(() => {
    const values = points.map(p => p[metric])
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const step = GUIDE_STEPS.find(s => (rawMax - rawMin + 0.04) / s <= MAX_GUIDES - 1)
      ?? GUIDE_STEPS[GUIDE_STEPS.length - 1]
    const min = Math.max(0, Math.floor((rawMin - 0.02) / step) * step)
    const max = Math.ceil((rawMax + 0.02) / step) * step
    const span = Math.max(max - min, step)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i: number) => points.length <= 1
      ? PAD.left + innerW / 2
      : PAD.left + (i / (points.length - 1)) * innerW
    const y = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH
    const guides: number[] = []
    for (let g = min; g <= max + 1e-9; g += step) guides.push(Number(g.toFixed(3)))
    return { x, y, min, max, guides }
  }, [points, metric, W, H])

  if (points.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Noch nichts gescort. Sobald ein Spiel live mitgeschrieben wird, wächst hier die Kurve.
      </p>
    )
  }

  const { x, y } = geometry

  const active = activeIndex != null ? points[activeIndex] : null
  const last = points[points.length - 1]
  const shown = active ?? last
  const firstSolid = points.findIndex(p => !p.provisional)

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
              metric === key
                ? 'bg-navy-800 text-white'
                : 'text-gray-600 hover:text-navy-900'
            }`}
          >
            {METRICS[key].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <p className="text-sm text-navy-900">
          <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(shown[metric])}</span>
          <span className="text-gray-500"> {METRICS[metric].label} über die letzten {shown.rollingPlateAppearances} Schlagversuche</span>
        </p>
        <p className="text-[11px] text-gray-500 tabular-nums">
          {active
            ? `${fmtDate(active.date)} vs ${active.opponent ?? 'unbekannt'} · ${active.hits} von ${active.atBats}${active.walks > 0 ? ` · ${active.walks} BB` : ''}${active.stolenBases > 0 ? ` · ${active.stolenBases} SB` : ''}`
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
        aria-label={`${METRICS[metric].long} über ${points.length} Spiele, zuletzt ${fmt(last[metric])}`}
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

        {/* Provisorischer Anfang gestrichelt, der belastbare Teil durchgezogen. */}
        {firstSolid !== 0 && (
          <path
            d={points.slice(0, firstSolid < 0 ? points.length : firstSolid + 1)
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[metric]).toFixed(1)}`).join(' ')}
            fill="none" stroke="var(--color-navy-400)" strokeWidth="2.5" strokeDasharray="5 5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        <path
          ref={pathRef}
          d={firstSolid < 0 ? '' : points.slice(firstSolid)
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i + firstSolid).toFixed(1)} ${y(p[metric]).toFixed(1)}`).join(' ')}
          fill="none" stroke="var(--color-navy-800)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {points.map((p, i) => {
          // Der jüngste Punkt ist der einzige farbige: er sagt „hier steht er gerade".
          const isLast = i === points.length - 1
          const ink = isLast ? 'var(--color-softball-red-600)' : 'var(--color-navy-800)'
          return (
            <circle
              key={p.gameId}
              cx={x(i)} cy={y(p[metric])} r={activeIndex === i ? 5 : isLast ? 4.5 : 3}
              className="transition-[r] duration-150"
              fill={activeIndex === i || isLast ? ink : 'var(--color-cream-50)'}
              stroke={ink} strokeWidth="2"
            />
          )
        })}

        {/* Unsichtbare Trefferflächen: am Handy trifft man keinen 3px-Punkt. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.gameId}`}
            x={x(i) - (W - PAD.left - PAD.right) / Math.max(points.length, 1) / 2}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / Math.max(points.length, 1)}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            onPointerEnter={() => setActiveIndex(i)}
            onPointerDown={() => setActiveIndex(i)}
          />
        ))}

        {/* Zeitachse: erstes und letztes Spiel beschriften, dazwischen gäbe es Gedrängel. */}
        <text x={PAD.left} y={H - 8} className="fill-gray-400 text-[10px]">{fmtDate(points[0].date)}</text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-gray-400 text-[10px]">{fmtDate(last.date)}</text>
      </svg>
      </div>

      <p className="mt-2 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-4 border-t-2 border-dashed border-navy-400" /> gestrichelt = noch zu wenig Schlagversuche
        </span>
      </p>
    </div>
  )
}

/** Quoten im Softball ohne führende Null: .312, nicht 0.312. */
function fmt(value: number): string {
  return value.toFixed(3).replace(/^0/, '')
}

function fmtDate(date: string | null): string {
  if (!date) return 'ohne Datum'
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
