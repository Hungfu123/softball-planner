import { sideAnnotations } from '@/utils/bogenSheetRenderer'
import type { CellNotation } from '@/utils/bogenSheetRenderer'

interface Props {
  notation: CellNotation | null | undefined
  outIndex?: string | null
}

const HOME = { x: 30, y: 50 }
const FIRST = { x: 55, y: 28 }
const SECOND = { x: 30, y: 6 }
const THIRD = { x: 5, y: 28 }

function baseToCoord(base: number) {
  if (base === 1) return FIRST
  if (base === 2) return SECOND
  if (base === 3) return THIRD
  return HOME
}

function sidePosition(side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home') {
  // Außerhalb Diamond-Stroke positioniert. Top-Sides ganz oben in Cell-Padding.
  if (side === 'home-1b') return { x: 52, y: 48 }   // unten-rechts außerhalb
  if (side === '1b-2b') return { x: 52, y: 6 }      // ganz oben rechts
  if (side === '2b-3b') return { x: 8, y: 6 }       // ganz oben links
  if (side === '3b-home') return { x: 8, y: 48 }    // unten-links
  return { x: 30, y: 30 }
}

export function DiamondCell({ notation, outIndex }: Props) {
  const reach = notation?.reachedBase ?? 0
  const filled = notation?.runScored ?? false
  const effectiveOutIndex = outIndex ?? notation?.outIndex ?? null
  const rbi = notation?.rbi ?? 0
  const labels = notation?.labels ?? []
  const primary = notation?.primaryLabel ?? ''
  const abCount = notation?.abCount ?? 0
  const isMulti = abCount >= 2
  const inningEnd = notation?.inningEnd ?? false
  const stealingArrows = (notation?.stealingArrows && notation.stealingArrows.length > 0)
    ? notation.stealingArrows
    : (notation?.stealingArrow ? [notation.stealingArrow] : [])

  const allSegments: Array<[typeof HOME, typeof HOME]> = [
    [HOME, FIRST],
    [FIRST, SECOND],
    [SECOND, THIRD],
    [THIRD, HOME],
  ]
  const activeSegments = allSegments.slice(0, reach)
  const diamondPath = `M ${HOME.x} ${HOME.y} L ${FIRST.x} ${FIRST.y} L ${SECOND.x} ${SECOND.y} L ${THIRD.x} ${THIRD.y} Z`

  // Stealing arrow color helper
  const arrowColor = (type: string) =>
    type === 'WILD_PITCH' || type === 'PASSED_BALL' ? '#f97316'
      : type === 'CAUGHT_STEALING' || type === 'OUT_ON_PLAY' ? '#7c2d12'
      : '#dc2626'

  return (
    <svg viewBox="0 0 60 80" className="w-full h-full" style={{ display: 'block' }}>
      <path
        d={diamondPath}
        fill={filled ? '#1e3a8a' : 'none'}
        stroke={filled ? '#1e3a8a' : '#1f2937'}
        strokeWidth="0.5"
      />
      {activeSegments.map(([a, b], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#1e3a8a"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {/* Multi-AB diagonal divider (Wrap-Around Inning) — nur bei nicht-filled
          (sonst sieht Slash auf gefülltem Diamond aus wie Strikethrough). */}
      {isMulti && !filled && (
        <line x1={60} y1={0} x2={0} y2={80} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2 1.5" />
      )}
      {primary && (
        filled ? (
          isMulti ? (
            // Filled + Multi: alle Labels unten zeigen ("1B 1B" / "1B 2B")
            <text
              x={30}
              y={72}
              textAnchor="middle"
              fontSize={labels.length >= 3 ? 8 : 10}
              fontWeight="700"
              fill="#1f2937"
              style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
            >
              {labels.join(' ')}
            </text>
          ) : (
            <text
              x={30}
              y={72}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#1f2937"
              style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
            >
              {primary}
            </text>
          )
        ) : isMulti ? (
          <>
            {/* 1. AB Label oben-links Triangle */}
            <text
              x={6}
              y={26}
              fontSize="9"
              fontWeight="700"
              fill="#1f2937"
              style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
            >
              {labels[labels.length - 2] ?? ''}
            </text>
            {/* Latest AB Label unten-rechts Triangle */}
            <text
              x={54}
              y={72}
              textAnchor="end"
              fontSize="9"
              fontWeight="700"
              fill="#1f2937"
              style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
            >
              {labels[labels.length - 1] ?? ''}
            </text>
          </>
        ) : (
          <text
            x={30}
            y={64}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#1f2937"
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            {primary}
          </text>
        )
      )}
      {/* Inning-End-Marker — RFL-Konvention: kleine Diagonale am rechten
          Cell-Border markiert wo das 3. Out fiel. Hilft Scorekeeper für
          Lineup-Reihenfolge im nächsten Inning. */}
      {inningEnd && (
        <line x1={56} y1={64} x2={60} y2={76} stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" />
      )}
      {effectiveOutIndex && (
        <text
          x={1}
          y={78}
          fontSize="6.5"
          fontWeight="700"
          fill="#1e3a8a"
          style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
        >
          {effectiveOutIndex}
        </text>
      )}
      {rbi > 0 && Array.from({ length: Math.min(rbi, 3) }).map((_, i) => (
        <circle
          key={i}
          cx={56 - i * 4}
          cy={76}
          r={1.4}
          fill="#dc2626"
        />
      ))}
      {stealingArrows.map((arrow, i) => (
        <line
          key={i}
          x1={baseToCoord(arrow.fromBase).x}
          y1={baseToCoord(arrow.fromBase).y}
          x2={baseToCoord(arrow.toBase).x}
          y2={baseToCoord(arrow.toBase).y}
          stroke={arrowColor(arrow.type)}
          strokeWidth="1.5"
          strokeDasharray="2 1"
        />
      ))}
      {/* Ein Label pro Base-Seite. Steal-Events und Advance-×N teilen dieselbe
          Koordinate, daher werden sie vorher in sideAnnotations aufgelöst —
          sonst überlagern sich zwei Texte pixelgleich und keiner ist lesbar. */}
      {sideAnnotations(notation).map(ann => {
        const pos = sidePosition(ann.side)
        return (
          <text
            key={`side-${ann.side}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill={ann.color === 'orange' ? '#f97316' : '#1f2937'}
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            {ann.text}
          </text>
        )
      })}
    </svg>
  )
}
