import { useState, useEffect } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (errorPosition: number) => void
}

const POSITION_NAMES: Record<number, string> = {
  1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS',
  7: 'LF', 8: 'CF', 9: 'RF',
}

const FIELD_POSITIONS: Array<{ pos: number; cx: number; cy: number }> = [
  { pos: 7, cx: 55,  cy: 45 },
  { pos: 8, cx: 140, cy: 25 },
  { pos: 9, cx: 225, cy: 45 },
  { pos: 5, cx: 72,  cy: 115 },
  { pos: 6, cx: 108, cy: 100 },
  { pos: 4, cx: 168, cy: 100 },
  { pos: 3, cx: 210, cy: 115 },
  { pos: 1, cx: 140, cy: 130 },
  { pos: 2, cx: 140, cy: 180 },
]

export function ErrorPickerDrawer({ open, onClose, onPick }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (!open) setSelected(null)
  }, [open])

  const handleConfirm = () => {
    if (selected == null) return
    onPick(selected)
    onClose()
  }

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onClose}
        className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
      >
        Abbrechen
      </button>
      <button
        onClick={handleConfirm}
        disabled={selected == null}
        className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Bestätigen
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Welcher Fielder hatte den Fehler?" maxWidth="md" footer={footer}>
      <div className="p-4">
        <p className="text-xs text-gray-500 text-center mb-3 font-body">
          Tippe auf Feldposition mit Fehler. Batter erreicht 1B safe.
        </p>
        <svg viewBox="0 0 280 220" className="w-full max-w-xs mx-auto block">
          <path d="M 30 200 Q 140 20 250 200" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M 140 175 L 210 120 L 140 65 L 70 120 Z" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 2" />
          {FIELD_POSITIONS.map(({ pos, cx, cy }) => {
            const isSelected = selected === pos
            return (
              <g
                key={pos}
                role="button"
                aria-label={`Feldposition ${pos} ${POSITION_NAMES[pos]}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(pos)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={cx} cy={cy} r="22"
                  fill={isSelected ? '#E63946' : '#FFF5F5'}
                  stroke={isSelected ? '#B91C2A' : '#E63946'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                />
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={isSelected ? 'white' : '#1e3a5f'}>{pos}</text>
                <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill={isSelected ? 'white' : '#374151'}>{POSITION_NAMES[pos]}</text>
              </g>
            )
          })}
        </svg>
        {selected != null && (
          <div className="mt-3 bg-softball-red-50 border border-softball-red-300 rounded-lg p-2.5 text-center">
            <div className="text-[10px] tracking-widest uppercase text-gray-500 font-bold">Gewählt</div>
            <div className="font-display text-base font-extrabold text-softball-red-700">
              E{selected} — {POSITION_NAMES[selected]}
            </div>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  )
}
