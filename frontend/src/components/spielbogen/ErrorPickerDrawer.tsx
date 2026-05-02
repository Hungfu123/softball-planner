import { useState, useEffect } from 'react'
import { Drawer } from 'vaul'

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

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[80vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Error-Position wählen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
          <div className="px-5 py-3 border-b border-cream-200 flex items-center justify-between shrink-0">
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
              Welcher Fielder hatte den Fehler?
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
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
            <div className="flex gap-2 mt-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm rounded-lg border border-cream-300 text-gray-600 hover:bg-cream-100 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected == null}
                className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-softball-red-600 hover:bg-softball-red-700 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
