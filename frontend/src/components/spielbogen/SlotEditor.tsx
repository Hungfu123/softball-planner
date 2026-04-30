import { POSITION_OPTIONS } from '@/types'
import type { SetLineupRequest } from '@/types'

interface Props {
  slots: SetLineupRequest['slots']
  onChange: (slots: SetLineupRequest['slots']) => void
}

export function SlotEditor({ slots, onChange }: Props) {
  const updateSlot = (idx: number, patch: Partial<SetLineupRequest['slots'][number]>) => {
    const next = slots.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onChange(next)
  }

  const filled = slots.filter(s => s.name.trim().length > 0).length
  const minOk = filled >= 9

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[36px_36px_1fr_72px] gap-2 items-center pb-1 border-b border-cream-300">
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">№</span>
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">BO</span>
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Name</span>
        <span className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase">Pos</span>
      </div>

      {slots.map((s, idx) => (
        <div key={idx} className="grid grid-cols-[36px_36px_1fr_72px] gap-2 items-center">
          <span className="font-display text-sm font-bold text-navy-800">{s.slot}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={s.battingOrder}
            onChange={(e) => updateSlot(idx, { battingOrder: Number(e.target.value) })}
            className="bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
          />
          <input
            type="text"
            placeholder={`Spieler ${s.slot}`}
            value={s.name}
            onChange={(e) => updateSlot(idx, { name: e.target.value })}
            className="bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
          />
          <select
            value={s.position ?? ''}
            onChange={(e) => updateSlot(idx, { position: e.target.value || null })}
            className="bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none cursor-pointer"
          >
            <option value="">—</option>
            {POSITION_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      ))}

      <div className="text-xs text-gray-500 mt-2">
        {minOk ? (
          <span className="text-emerald-700">✓ Mindestens 9 Spieler eingetragen ({filled}/10)</span>
        ) : (
          <span className="text-amber-600">Mindestens 9 Spieler nötig (aktuell {filled})</span>
        )}
      </div>
    </div>
  )
}
