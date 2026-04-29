import { useState } from 'react'
import type { Player } from '@/types'
import { CheckCircle } from '@/icons'
import { ResponsiveSheet } from '@/components/shared'

interface Props {
  allPlayers: Player[]
  selectedIds: number[]
  onSave: (playerIds: number[]) => Promise<void>
  onClose: () => void
}

export function AvailablePlayersModal({ allPlayers, selectedIds, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedIds))
  const [saving, setSaving] = useState(false)

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave([...selected])
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <span className="font-display text-[11px] tracking-widest uppercase font-bold text-gray-500">{selected.size} ausgewählt</span>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="font-display px-4 py-2 text-xs font-extrabold tracking-widest uppercase text-white bg-navy-800 rounded-lg hover:bg-navy-900 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onClose} title="Verfügbare Spieler" maxWidth="md" footer={footer}>
      <div className="p-2">
        {allPlayers.map(p => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
              selected.has(p.id)
                ? 'bg-navy-50 text-navy-800'
                : 'text-gray-600 hover:bg-cream-100'
            }`}
          >
            <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
              selected.has(p.id)
                ? 'border-navy-600 bg-navy-600'
                : 'border-cream-300'
            }`}>
              {selected.has(p.id) && <CheckCircle size={14} className="text-white" />}
            </span>
            <span className="font-medium">{p.name}</span>
          </button>
        ))}
      </div>
    </ResponsiveSheet>
  )
}
