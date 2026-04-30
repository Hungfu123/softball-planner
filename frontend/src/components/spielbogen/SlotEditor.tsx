import { useState, useEffect, useRef } from 'react'
import { POSITION_OPTIONS } from '@/types'
import type { SetLineupRequest } from '@/types'

interface Props {
  slots: SetLineupRequest['slots']
  onChange: (slots: SetLineupRequest['slots']) => void
}

function PositionPicker({
  value, available, onChange,
}: { value: string | null; available: string[]; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-cream-50 border border-cream-300 rounded-md px-2 py-1.5 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none cursor-pointer flex items-center justify-between"
      >
        <span>{value ?? '—'}</span>
        <span className={`text-gray-400 transition-transform text-xs ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cream-300 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-cream-100 cursor-pointer ${
              value === null ? 'bg-navy-50 text-navy-900 font-semibold' : 'text-gray-700'
            }`}
          >—</button>
          {available.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-cream-100 cursor-pointer ${
                value === p ? 'bg-navy-50 text-navy-900 font-semibold' : 'text-gray-700'
              }`}
            >{p}</button>
          ))}
        </div>
      )}
    </div>
  )
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

      {slots.map((s, idx) => {
        const usedPositions = new Set(
          slots
            .filter((other, i) => i !== idx && other.position && other.position !== 'EH' && other.position !== 'DH')
            .map(other => other.position)
        )
        const availableOptions = [...POSITION_OPTIONS].filter(p =>
          p === 'EH' || p === 'DH' || !usedPositions.has(p) || p === s.position
        )

        return (
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
            <PositionPicker
              value={s.position ?? null}
              available={availableOptions}
              onChange={(p) => updateSlot(idx, { position: p })}
            />
          </div>
        )
      })}

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
