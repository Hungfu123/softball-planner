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
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-1 h-4 bg-softball-red-500 rounded-full" />
        Feld
      </h2>
      <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden" style={{ paddingBottom: '90%' }}>
        <svg viewBox="0 0 100 95" className="absolute inset-0 w-full h-full">
          {/* Baselines */}
          <polygon
            points="50,70 72,50 50,30 28,50"
            fill="none"
            stroke="#E63946"
            strokeWidth="0.5"
          />
          {/* Bases */}
          <rect x="48.5" y="68.5" width="3" height="3" fill="white" stroke="#E63946" strokeWidth="0.5" transform="rotate(45 50 70)" />
          <rect x="70.5" y="48.5" width="3" height="3" fill="white" stroke="#E63946" strokeWidth="0.5" transform="rotate(45 72 50)" />
          <rect x="48.5" y="28.5" width="3" height="3" fill="white" stroke="#E63946" strokeWidth="0.5" transform="rotate(45 50 30)" />
          <rect x="26.5" y="48.5" width="3" height="3" fill="white" stroke="#E63946" strokeWidth="0.5" transform="rotate(45 28 50)" />

          {FIELD_POSITIONS.map(pos => {
            const coord = FIELD_COORDS[pos]
            const name = posMap.get(pos)
            return (
              <g key={pos}>
                {/* Position label */}
                <text
                  x={coord.x}
                  y={name ? coord.y - 4 : coord.y - 1}
                  textAnchor="middle"
                  fontSize="3.2"
                  fontWeight="bold"
                  fill={name ? '#111B6B' : '#9ca3af'}
                >
                  {pos}
                </text>
                {/* Player name */}
                {name && (
                  <text
                    x={coord.x}
                    y={coord.y + 1}
                    textAnchor="middle"
                    fontSize="2.8"
                    fill="#374151"
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
                    fill="#d1d5db"
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
