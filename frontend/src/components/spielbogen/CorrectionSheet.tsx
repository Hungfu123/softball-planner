import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { SpielbogenSlotResponse, BogenBaseStateDto } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  initialRunsScored: number
  /** Outs im aktuellen Inning. Bei 3 → Force-Out-Regel-Hinweis. */
  outsAfter?: number
  onSave: (payload: {
    firstSlotId: number | null
    secondSlotId: number | null
    thirdSlotId: number | null
    runsScored: number
  }) => Promise<void>
}

export function CorrectionSheet({ open, onClose, baseState, slots, initialRunsScored, outsAfter, onSave }: Props) {
  const [first, setFirst] = useState<number | null>(baseState.firstSlotId)
  const [second, setSecond] = useState<number | null>(baseState.secondSlotId)
  const [third, setThird] = useState<number | null>(baseState.thirdSlotId)
  const [runs, setRuns] = useState<number>(initialRunsScored)
  const [saving, setSaving] = useState(false)

  const slotOptions = slots.map(s => ({ id: s.id, label: `#${s.battingOrder} ${s.name}` }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ firstSlotId: first, secondSlotId: second, thirdSlotId: third, runsScored: runs })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const SlotSelect = ({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) => (
    <div className="space-y-1">
      <label className="font-display text-[10px] tracking-widest uppercase font-bold text-gray-500">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none cursor-pointer"
      >
        <option value="">— leer —</option>
        {slotOptions.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  )

  const footer = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 py-2 text-sm text-gray-600 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
      >
        Abbrechen
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50 cursor-pointer"
      >
        Speichern
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Korrektur — Letzter AtBat" maxWidth="md" footer={footer}>
      <div className="p-4 space-y-3">
        {outsAfter === 3 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
            <span className="text-amber-700 text-base leading-none mt-0.5" aria-hidden>⚠</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">3. Out im Inning</div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Bei <strong>Force-Out</strong> als 3. Out zählt der Run NICHT (Softball-Regel) — auch wenn Runner Home gekreuzt hat.
                Nur Tag-Out / Fly-Out: Run zählt wenn Runner vor Out gescort hat.
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 font-body">
          Korrigiere Runner-Positionen + Anzahl Runs für den letzten AtBat. Score wird neu berechnet.
        </p>
        <SlotSelect value={third} onChange={setThird} label="3B" />
        <SlotSelect value={second} onChange={setSecond} label="2B" />
        <SlotSelect value={first} onChange={setFirst} label="1B" />
        <div className="space-y-1 pt-2 border-t border-cream-300">
          <label className="font-display text-[10px] tracking-widest uppercase font-bold text-gray-500">Runs (in diesem AtBat)</label>
          <input
            type="number"
            min={0}
            value={runs}
            onChange={(e) => setRuns(Math.max(0, Number(e.target.value) || 0))}
            className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
          />
        </div>
      </div>
    </ResponsiveSheet>
  )
}
