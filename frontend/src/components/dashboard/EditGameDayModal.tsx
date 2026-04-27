import { useState } from 'react'
import type { GameDayResponse } from '@/types'
import { XMark } from '@/icons'
import * as api from '@/api/client'

interface Props {
  gameDay: GameDayResponse
  onSaved: (updated: GameDayResponse) => void
  onClose: () => void
}

export function EditGameDayModal({ gameDay, onSaved, onClose }: Props) {
  const [date, setDate] = useState(gameDay.date)
  const [label, setLabel] = useState(gameDay.label ?? '')
  const [location, setLocation] = useState(gameDay.location ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateGameDay(gameDay.id, {
        date,
        label: label.trim() || null,
        location: location.trim() || null,
      })
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300">
          <h2 className="text-lg font-bold text-gray-900">Spieltag bearbeiten</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMark size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="z.B. Spieltag 1"
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="z.B. Bottrop"
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-cream-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-cream-200"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
