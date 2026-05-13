import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
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
  const [saving, setSaving] = useState(false)
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
    if (saving) return
    setSaving(true)
    const toBase = fromBase + 1  // 1→2, 2→3, 3→home(4)
    try {
      await onSubmit({ side, slotId, inning, type, fromBase, toBase })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <button
      onClick={onClose}
      className="w-full h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer"
    >
      Abbrechen
    </button>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Base Running" maxWidth="md" footer={footer}>
      <div className="p-4 space-y-4">
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
                disabled={saving}
                className="font-display py-2 text-xs font-bold tracking-widest uppercase rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                SB → {r.fromBase + 1 === 4 ? 'H' : (r.fromBase + 1) + 'B'}
              </button>
              <button
                onClick={() => handle(r.slotId, r.fromBase, 'CAUGHT_STEALING')}
                disabled={saving}
                className="font-display py-2 text-xs font-bold tracking-widest uppercase rounded-lg bg-softball-red-600 text-white hover:bg-softball-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CS (Aus)
              </button>
              <button
                onClick={() => handle(r.slotId, r.fromBase, 'OUT_ON_PLAY')}
                disabled={saving}
                className="font-display py-2 text-xs font-bold tracking-widest uppercase rounded-lg bg-gray-500 text-white hover:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Out on Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </ResponsiveSheet>
  )
}
