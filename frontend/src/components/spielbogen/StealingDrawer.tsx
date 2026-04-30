import { Drawer } from 'vaul'
import type { BogenBaseStateDto, SpielbogenSlotResponse, SpielbogenRecordStealingRequest, BogenSide } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  baseState: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
  side: BogenSide
  inning: number
  onSubmit: (req: SpielbogenRecordStealingRequest) => Promise<void>
}

export function StealingDrawer({ open, onClose, baseState, slots, side, inning, onSubmit }: Props) {
  const runners: Array<{ slotId: number; fromBase: number; name: string }> = []
  if (baseState?.firstSlotId != null) {
    const slot = slots.find(s => s.id === baseState.firstSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 1, name: slot.name })
  }
  if (baseState?.secondSlotId != null) {
    const slot = slots.find(s => s.id === baseState.secondSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 2, name: slot.name })
  }
  if (baseState?.thirdSlotId != null) {
    const slot = slots.find(s => s.id === baseState.thirdSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 3, name: slot.name })
  }

  const handle = async (slotId: number, fromBase: number, type: 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY') => {
    const toBase = fromBase + 1  // 1→2, 2→3, 3→home(4)
    await onSubmit({ side, slotId, inning, type, fromBase, toBase })
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[80vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Base Running</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
          <div className="px-5 py-3 border-b border-cream-200 shrink-0">
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
              Base Running
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {runners.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Keine Runner auf Base</p>
            )}
            {runners.map(r => (
              <div key={r.slotId} className="border border-cream-300 rounded-xl p-3 bg-white space-y-2">
                <div className="font-display font-bold text-navy-900 text-sm">
                  {r.name} <span className="text-gray-500 font-normal">auf {r.fromBase}B</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handle(r.slotId, r.fromBase, 'STOLEN_BASE')}
                    className="font-display py-2 text-xs font-bold tracking-widest uppercase rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    SB → {r.fromBase + 1 === 4 ? 'H' : (r.fromBase + 1) + 'B'}
                  </button>
                  <button
                    onClick={() => handle(r.slotId, r.fromBase, 'CAUGHT_STEALING')}
                    className="font-display py-2 text-xs font-bold tracking-widest uppercase rounded-lg bg-softball-red-600 text-white hover:bg-softball-red-700 cursor-pointer"
                  >
                    CS (Aus)
                  </button>
                  <button
                    onClick={() => handle(r.slotId, r.fromBase, 'OUT_ON_PLAY')}
                    className="font-display py-2 text-xs font-bold tracking-widest uppercase rounded-lg bg-gray-500 text-white hover:bg-gray-600 cursor-pointer"
                  >
                    Out on Play
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4 border-t border-cream-200 pt-3 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-600 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
