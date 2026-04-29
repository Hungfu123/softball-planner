import type { LocalLineupEntry } from '@/types'
import { FIELD_POSITIONS } from '@/types'

interface Props {
  entries: LocalLineupEntry[]
}

const FIELD_COORDS: Record<string, { x: number; y: number }> = {
  P:  { x: 50, y: 58 },
  C:  { x: 50, y: 82 },
  '1B': { x: 76, y: 55 },
  '2B': { x: 62, y: 38 },
  SS:  { x: 38, y: 38 },
  '3B': { x: 24, y: 55 },
  LF:  { x: 18, y: 22 },
  CF:  { x: 50, y: 12 },
  RF:  { x: 82, y: 22 },
}

export function FieldView({ entries }: Props) {
  const posMap = new Map<string, string>()
  for (const e of entries) {
    if (e.position) posMap.set(e.position, e.player.name)
  }

  const hasAny = entries.some(e => e.position && FIELD_POSITIONS.includes(e.position as typeof FIELD_POSITIONS[number]))
  if (!hasAny) return null

  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-2 pb-1.5 border-b border-cream-200 flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Feld
      </h2>
      <div className="relative bg-cream-50 border border-cream-300 rounded-xl shadow-sm overflow-hidden" style={{ paddingBottom: '90%' }}>
        <svg viewBox="0 0 100 95" className="absolute inset-0 w-full h-full">
          {/* Baselines */}
          <polygon
            points="50,70 72,50 50,30 28,50"
            fill="none"
            stroke="var(--color-navy-900)"
            strokeWidth="0.5"
          />
          {/* Bases */}
          <rect x="48.5" y="68.5" width="3" height="3" fill="var(--color-softball-red-500)" stroke="var(--color-softball-red-700)" strokeWidth="0.5" transform="rotate(45 50 70)" />
          <rect x="70.5" y="48.5" width="3" height="3" fill="var(--color-softball-red-500)" stroke="var(--color-softball-red-700)" strokeWidth="0.5" transform="rotate(45 72 50)" />
          <rect x="48.5" y="28.5" width="3" height="3" fill="var(--color-softball-red-500)" stroke="var(--color-softball-red-700)" strokeWidth="0.5" transform="rotate(45 50 30)" />
          <rect x="26.5" y="48.5" width="3" height="3" fill="var(--color-softball-red-500)" stroke="var(--color-softball-red-700)" strokeWidth="0.5" transform="rotate(45 28 50)" />

          {FIELD_POSITIONS.map(pos => {
            const coord = FIELD_COORDS[pos]
            const name = posMap.get(pos)
            return (
              <g key={pos}>
                {/* Position label — kleiner als Name (Name ist primary) */}
                <text
                  x={coord.x}
                  y={name ? coord.y - 3.5 : coord.y - 1}
                  textAnchor="middle"
                  fontSize="2.4"
                  fontWeight="700"
                  letterSpacing="0.15"
                  fill={name ? 'var(--color-softball-red-600)' : 'var(--color-gray-400)'}
                >
                  {pos}
                </text>
                {/* Player name — primary */}
                {name && (
                  <text
                    x={coord.x}
                    y={coord.y + 1.4}
                    textAnchor="middle"
                    fontSize="3.2"
                    fontWeight="700"
                    fill="var(--color-navy-900)"
                  >
                    {name.length > 12 ? name.slice(0, 11) + '…' : name}
                  </text>
                )}
                {/* Empty dot for unassigned */}
                {!name && (
                  <circle
                    cx={coord.x}
                    cy={coord.y + 2}
                    r={1.5}
                    fill="var(--color-gray-300)"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
