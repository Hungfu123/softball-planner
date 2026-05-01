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

  const allSegments: Array<[typeof HOME, typeof HOME]> = [
    [HOME, FIRST],
    [FIRST, SECOND],
    [SECOND, THIRD],
    [THIRD, HOME],
  ]
  const activeSegments = allSegments.slice(0, reach)
  const diamondPath = `M ${HOME.x} ${HOME.y} L ${FIRST.x} ${FIRST.y} L ${SECOND.x} ${SECOND.y} L ${THIRD.x} ${THIRD.y} Z`

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
        ) : (
          <>
            {labels.length <= 1 ? (
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
            ) : (
              labels.slice(-2).map((lbl, i) => (
                <text
                  key={i}
                  x={30}
                  y={61 + i * 8}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#1f2937"
                  style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
                >
                  {lbl}
                </text>
              ))
            )}
          </>
        )
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
      {notation?.stealingArrow && (
        <line
          x1={baseToCoord(notation.stealingArrow.fromBase).x}
          y1={baseToCoord(notation.stealingArrow.fromBase).y}
          x2={baseToCoord(notation.stealingArrow.toBase).x}
          y2={baseToCoord(notation.stealingArrow.toBase).y}
          stroke={
            notation.stealingArrow.type === 'WILD_PITCH' || notation.stealingArrow.type === 'PASSED_BALL'
              ? '#f97316'
              : notation.stealingArrow.type === 'CAUGHT_STEALING' || notation.stealingArrow.type === 'OUT_ON_PLAY'
              ? '#7c2d12'
              : '#dc2626'
          }
          strokeWidth="1.5"
          strokeDasharray="2 1"
        />
      )}
      {notation?.stealingArrow && (notation.stealingArrow.type === 'WILD_PITCH' || notation.stealingArrow.type === 'PASSED_BALL') && (
        <text
          x={30}
          y={17}
          textAnchor="middle"
          fontSize="5"
          fontWeight="700"
          fill="#f97316"
          style={{ fontFamily: "'Saira Condensed', Impact, sans-serif" }}
        >
          {notation.stealingArrow.type === 'WILD_PITCH' ? 'WP' : 'PB'}
        </text>
      )}
    </svg>
  )
}
