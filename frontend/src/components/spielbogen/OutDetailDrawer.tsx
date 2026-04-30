import { useState } from 'react'
import { Drawer } from 'vaul'
import type { SpielbogenRecordAtBatRequest, BogenBaseStateDto } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  baseStateAfter: BogenBaseStateDto | null
}

const POSITION_NAMES: Record<number, string> = {
  1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS',
  7: 'LF', 8: 'CF', 9: 'RF',
}

// Rough positions in a 280x240 svg viewbox arranged like a field
const FIELD_POSITIONS: Array<{ pos: number; cx: number; cy: number }> = [
  { pos: 7, cx: 55,  cy: 45 },  // LF
  { pos: 8, cx: 140, cy: 25 },  // CF
  { pos: 9, cx: 225, cy: 45 },  // RF
  { pos: 5, cx: 72,  cy: 115 }, // 3B
  { pos: 6, cx: 108, cy: 100 }, // SS
  { pos: 4, cx: 168, cy: 100 }, // 2B
  { pos: 3, cx: 210, cy: 115 }, // 1B
  { pos: 1, cx: 140, cy: 130 }, // P
  { pos: 2, cx: 140, cy: 180 }, // C
]

interface InfieldOptionsProps {
  fielder: number
  hasRunners: boolean
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  onBack: () => void
}

function InfieldOptionsView({ fielder, hasRunners, onSubmit, onBack }: InfieldOptionsProps) {
  const defaultThrow = 3
  const defaultDpPartner = fielder === 6 ? 4 : defaultThrow

  const options: Array<{ label: string; description: string; action: () => void; primary?: boolean }> = [
    {
      label: `▶ Wirft zu 1B (${fielder}-3)`,
      description: 'Normale Groundout, Throw to 1B',
      primary: true,
      action: () => onSubmit({
        result: 'OUT',
        outType: 'GROUNDER',
        fielderChain: [fielder, defaultThrow],
      }),
    },
    {
      label: `Solo-Out (${fielder} unassisted)`,
      description: 'Fielder schafft Out alleine',
      action: () => onSubmit({
        result: 'OUT',
        outType: 'UNASSISTED',
        fielderChain: [fielder],
      }),
    },
    ...(hasRunners ? [{
      label: `Double Play (${fielder}-${defaultDpPartner}-3)`,
      description: 'Doppelspiel',
      action: () => onSubmit({
        result: 'OUT',
        outType: 'DOUBLE_PLAY',
        fielderChain: [fielder, defaultDpPartner, 3],
      }),
    }] : []),
    {
      label: `Error E${fielder}`,
      description: 'Fehler beim Fielder',
      action: () => onSubmit({
        result: 'OUT',
        isError: true,
        errorPosition: fielder,
      }),
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-sm font-display font-bold text-navy-900 uppercase tracking-wide mb-3">
        Feldposition {POSITION_NAMES[fielder]} ({fielder})
      </p>
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={opt.action}
          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
            opt.primary
              ? 'bg-navy-50 border-navy-300 text-navy-900 hover:bg-navy-100'
              : 'bg-white border-cream-300 text-gray-700 hover:bg-cream-100'
          }`}
        >
          <div className="text-sm font-semibold">{opt.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
        </button>
      ))}
      <button
        onClick={onBack}
        className="w-full mt-2 py-2.5 text-sm font-display font-bold tracking-wide rounded-xl border border-cream-300 text-gray-600 bg-white hover:bg-cream-100 cursor-pointer"
      >
        ← Zurück
      </button>
    </div>
  )
}

export function OutDetailDrawer({ open, onClose, onSubmit, baseStateAfter }: Props) {
  const [selectedFielder, setSelectedFielder] = useState<number | null>(null)

  const runnersOnBase = baseStateAfter != null && (
    baseStateAfter.firstSlotId != null ||
    baseStateAfter.secondSlotId != null ||
    baseStateAfter.thirdSlotId != null
  )

  const handleFielderTap = (pos: number) => {
    if (pos >= 7) {
      // Outfield: directly submit FLY out
      onSubmit({
        result: 'OUT',
        outType: 'FLY',
        fielderChain: [pos],
      })
    } else {
      // Infield: switch to options state within the same drawer
      setSelectedFielder(pos)
    }
  }

  const handleSkip = () => {
    onSubmit({ result: 'OUT' })
  }

  const handleFoulOut = () => {
    onSubmit({ result: 'OUT', outType: 'FOUL' })
  }

  const handleInfieldSubmit = (req: Partial<SpielbogenRecordAtBatRequest>) => {
    setSelectedFielder(null)
    onSubmit(req)
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) { setSelectedFielder(null); onClose() } }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[80vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Out-Detail</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
          <div className="px-5 py-3 border-b border-cream-200 flex items-center justify-between shrink-0">
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
              Aus — Detail wählen
            </h2>
            <button onClick={() => { setSelectedFielder(null); onClose() }} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedFielder == null ? (
              <>
                <p className="text-xs text-gray-500 text-center mb-3 font-body">
                  Tippe auf die Feldposition, die den Out gemacht hat
                </p>
                {/* Mini field SVG */}
                <svg viewBox="0 0 280 220" className="w-full max-w-xs mx-auto block">
                  {/* Fair territory arc */}
                  <path
                    d="M 30 200 Q 140 20 250 200"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Infield square */}
                  <path
                    d="M 140 175 L 210 120 L 140 65 L 70 120 Z"
                    fill="none"
                    stroke="#d1d5db"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />

                  {FIELD_POSITIONS.map(({ pos, cx, cy }) => (
                    <g key={pos} onClick={() => handleFielderTap(pos)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="22"
                        fill={pos >= 7 ? '#dbeafe' : '#f0f4f8'}
                        stroke={pos >= 7 ? '#3b82f6' : '#6b7280'}
                        strokeWidth="1.5"
                      />
                      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e3a5f">
                        {pos}
                      </text>
                      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#374151">
                        {POSITION_NAMES[pos]}
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleFoulOut}
                    className="flex-1 py-2.5 text-sm font-display font-bold tracking-widest uppercase rounded-xl border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                  >
                    Foul Out
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-2.5 text-sm font-display font-bold tracking-widest uppercase rounded-xl border border-cream-300 text-gray-600 bg-white hover:bg-cream-100 cursor-pointer"
                  >
                    Skip (nur AUS)
                  </button>
                </div>
                <button
                  onClick={() => { setSelectedFielder(null); onClose() }}
                  className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <InfieldOptionsView
                fielder={selectedFielder}
                hasRunners={runnersOnBase}
                onSubmit={handleInfieldSubmit}
                onBack={() => setSelectedFielder(null)}
              />
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
