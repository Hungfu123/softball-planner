import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'

interface PitchingEvent {
  slotId: number
  type: 'WILD_PITCH' | 'PASSED_BALL'
  fromBase: 1 | 2 | 3
  toBase: 2 | 3 | 4
}

interface Props {
  open: boolean
  onClose: () => void
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onSubmit: (events: PitchingEvent[]) => void
}

export function PitchingEventDrawer({ open, onClose, baseState, slots, onSubmit }: Props) {
  const [type, setType] = useState<'WILD_PITCH' | 'PASSED_BALL'>('WILD_PITCH')
  const runners = [
    baseState.thirdSlotId  != null ? { from: 3 as const, slotId: baseState.thirdSlotId  } : null,
    baseState.secondSlotId != null ? { from: 2 as const, slotId: baseState.secondSlotId } : null,
    baseState.firstSlotId  != null ? { from: 1 as const, slotId: baseState.firstSlotId  } : null,
  ].filter(Boolean) as Array<{ from: 1 | 2 | 3; slotId: number }>

  const [targets, setTargets] = useState<Record<number, number>>({})

  const cycle = (from: 1 | 2 | 3) => {
    setTargets(prev => {
      const curr = prev[from] ?? from
      const next = curr === 4 ? from : curr + 1
      return { ...prev, [from]: next }
    })
  }

  const submit = () => {
    const events = runners
      .filter(r => (targets[r.from] ?? r.from) !== r.from)
      .map(r => ({
        slotId: r.slotId,
        type,
        fromBase: r.from,
        toBase: (targets[r.from] ?? r.from) as 2 | 3 | 4,
      }))
    if (events.length > 0) onSubmit(events)
    setTargets({})
    onClose()
  }

  const handleClose = () => {
    setTargets({})
    onClose()
  }

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={handleClose}
        className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
      >
        Abbrechen
      </button>
      <button
        onClick={submit}
        disabled={runners.length === 0}
        className="h-11 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Bestätigen
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={handleClose} title="Pitcher-/Catcher-Mistake" maxWidth="md" footer={footer}>
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setType('WILD_PITCH')}
            className={`flex-1 py-2 rounded-xl font-display text-xs font-bold tracking-widest uppercase cursor-pointer ${
              type === 'WILD_PITCH' ? 'bg-navy-800 text-white' : 'border border-cream-300 bg-white text-navy-700'
            }`}
          >
            Wild Pitch
          </button>
          <button
            onClick={() => setType('PASSED_BALL')}
            className={`flex-1 py-2 rounded-xl font-display text-xs font-bold tracking-widest uppercase cursor-pointer ${
              type === 'PASSED_BALL' ? 'bg-navy-800 text-white' : 'border border-cream-300 bg-white text-navy-700'
            }`}
          >
            Passed Ball
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-2">Tipp pro Runner um Ziel-Base zu wählen (bleibt → +1 → +2 → Home).</p>

        {runners.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Keine Runner auf Base</p>
        )}

        <div className="space-y-2">
          {runners.map(r => {
            const slot = slots.find(s => s.id === r.slotId)
            const t = targets[r.from] ?? r.from
            const label = t === r.from ? 'bleibt' : t === 4 ? '→ Home (Run!)' : `→ ${t}B`
            return (
              <button
                key={r.from}
                onClick={() => cycle(r.from)}
                className={`w-full text-left px-4 py-3 rounded-xl border cursor-pointer ${
                  t === r.from ? 'border-cream-300 bg-white' : 'border-navy-500 bg-navy-50'
                }`}
              >
                <div className="font-display font-bold text-sm flex items-center justify-between">
                  <span>{slot?.name ?? `Slot ${r.slotId}`} (auf {r.from}B)</span>
                  <span className="text-xs">{label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
