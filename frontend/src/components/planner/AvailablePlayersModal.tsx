import { useState } from 'react'
import type { Player } from '@/types'
import { XMark, CheckCircle } from '@/icons'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300">
          <h2 className="text-lg font-bold text-gray-900">Verfügbare Spieler</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMark size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
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

        <div className="px-4 py-3 border-t border-cream-300 flex items-center justify-between">
          <span className="text-sm text-gray-500">{selected.size} ausgewählt</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-cream-200"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-700 disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
