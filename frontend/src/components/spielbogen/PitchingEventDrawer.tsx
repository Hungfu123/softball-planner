import { useState } from 'react'
import { Drawer } from 'vaul'
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

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl flex flex-col p-4 focus:outline-none">
          <Drawer.Title className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide mb-2">
            Pitcher-/Catcher-Mistake
          </Drawer.Title>

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

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-2 text-sm rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={submit}
              disabled={runners.length === 0}
              className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bestätigen
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
