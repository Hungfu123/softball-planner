import type { CellNotation } from '@/utils/bogenSheetRenderer'

interface Props {
  notation: CellNotation | null | undefined
  outIndex?: number | null   // 1, 2, 3 if this at-bat is the Nth out in the inning
}

// Diamond geometry: viewBox 0 0 60 60
// Center: (30, 30). Corners: home(30, 55), 1B(55, 30), 2B(30, 5), 3B(5, 30)
const HOME = { x: 30, y: 55 }
const FIRST = { x: 55, y: 30 }
const SECOND = { x: 30, y: 5 }
const THIRD = { x: 5, y: 30 }

function romanOut(n: number): string {
  return n === 1 ? 'I' : n === 2 ? 'II' : n === 3 ? 'III' : ''
}

function baseToCoord(base: number): { x: number; y: number } {
  if (base === 1) return FIRST
  if (base === 2) return SECOND
  if (base === 3) return THIRD
  return HOME
}

function reachedBaseCount(notation: CellNotation): number {
  if (notation.runScored) return 4
  const lbl = notation.label
  if (lbl === '1B' || lbl === 'BB' || lbl === 'HP') return 1
  if (lbl === '2B') return 2
  if (lbl === '3B') return 3
  if (lbl === 'HR') return 4
  return 0
}

/**
 * Single sheet cell SVG — shows at-bat notation as a real RFL diamond.
 * Diamond outline always visible. Advancement paths traced as thick segments.
 * Run scored → solid navy fill. Out-index shown as Roman numeral.
 */
export function DiamondCell({ notation, outIndex }: Props) {
  const reachedBase = notation ? reachedBaseCount(notation) : 0
  const filled = notation?.runScored ?? false

  // Path segments (cumulative from home → 1B → 2B → 3B → home)
  const allSegments: Array<[typeof HOME, typeof HOME]> = [
    [HOME, FIRST],
    [FIRST, SECOND],
    [SECOND, THIRD],
    [THIRD, HOME],
  ]
  const activeSegments = allSegments.slice(0, reachedBase)

  const diamondPath = `M ${HOME.x} ${HOME.y} L ${FIRST.x} ${FIRST.y} L ${SECOND.x} ${SECOND.y} L ${THIRD.x} ${THIRD.y} Z`

  return (
    <svg viewBox="0 0 60 65" className="w-full h-full" style={{ display: 'block' }}>
      {/* Diamond outline (thin navy) */}
      <path
        d={diamondPath}
        fill={filled ? '#1e3a8a' : 'none'}
        stroke="#1e3a8a"
        strokeWidth="0.6"
      />
      {/* Advancement path segments (medium thickness, navy) */}
      {activeSegments.map(([a, b], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#1e3a8a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      {/* Notation label */}
      {notation?.label && (
        filled ? (
          // HR: centered cream label on navy fill
          <text
            x={30}
            y={34}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#fef3c7"
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            {notation.label}
          </text>
        ) : (
          // Other hits: small label below the diamond (near home corner)
          <text
            x={30}
            y={62}
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#1e3a8a"
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            {notation.label}
          </text>
        )
      )}
      {/* Out index: small Roman numeral in top-left, lighter */}
      {outIndex != null && outIndex > 0 && (
        <text
          x={3}
          y={11}
          fontSize="6"
          fontWeight="600"
          fill="#9ca3af"
          style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
        >
          {romanOut(outIndex)}
        </text>
      )}
      {/* Stealing arrow: dashed red line between bases */}
      {notation?.stealingArrow && (
        <line
          x1={baseToCoord(notation.stealingArrow.fromBase).x}
          y1={baseToCoord(notation.stealingArrow.fromBase).y}
          x2={baseToCoord(notation.stealingArrow.toBase).x}
          y2={baseToCoord(notation.stealingArrow.toBase).y}
          stroke="#dc2626"
          strokeWidth="1.5"
          strokeDasharray="2 1"
        />
      )}
    </svg>
  )
}
