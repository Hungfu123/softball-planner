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

export function DiamondCell({ notation, outIndex }: Props) {
  const reach = notation?.reachedBase ?? 0
  const filled = notation?.runScored ?? false
  const effectiveOutIndex = outIndex ?? notation?.outIndex ?? null
  const rbi = notation?.rbi ?? 0
  const labels = notation?.labels ?? []
  const primary = notation?.primaryLabel ?? ''
  const abCount = notation?.abCount ?? 0
  const isMulti = abCount >= 2
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
      {/* Multi-AB diagonal divider (Wrap-Around Inning) */}
      {isMulti && (
        <line x1={60} y1={0} x2={0} y2={80} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2 1.5" />
      )}
      {primary && (
        filled ? (
          <text
            x={30}
            y={32}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#fef3c7"
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            {primary}
          </text>
        ) : isMulti ? (
          <>
            {/* 1. AB Label oben-links Triangle */}
            <text
              x={4}
              y={20}
              fontSize="7"
              fontWeight="700"
              fill="#1f2937"
              style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
            >
              {labels[labels.length - 2] ?? ''}
            </text>
            {/* Latest AB Label unten-rechts Triangle */}
            <text
              x={56}
              y={75}
              textAnchor="end"
              fontSize="7"
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
      {/* ×N Badge bei 3+ ABs (mehr als nur 2 sichtbar) */}
      {abCount >= 3 && (
        <g>
          <circle cx={6} cy={73} r={5} fill="#CC2936" />
          <text
            x={6}
            y={75.5}
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fill="white"
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            ×{abCount}
          </text>
        </g>
      )}
      {effectiveOutIndex && (
        <text
          x={3}
          y={10}
          fontSize="6.5"
          fontWeight="700"
          fill="#9ca3af"
          style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
        >
          {effectiveOutIndex}
        </text>
      )}
      {rbi > 0 && Array.from({ length: Math.min(rbi, 3) }).map((_, i) => (
        <circle
          key={i}
          cx={56 - i * 4}
          cy={6}
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
      {stealingArrows.map((arrow, i) => (
        (arrow.type === 'WILD_PITCH' || arrow.type === 'PASSED_BALL') && (
          <text
            key={`lbl-${i}`}
            x={30}
            y={17 + i * 6}
            textAnchor="middle"
            fontSize="5"
            fontWeight="700"
            fill="#f97316"
            style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
          >
            {arrow.type === 'WILD_PITCH' ? 'WP' : 'PB'}
          </text>
        )
      ))}
    </svg>
  )
}
