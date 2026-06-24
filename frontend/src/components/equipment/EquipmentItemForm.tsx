import { useState } from 'react'
import type { EquipmentInput, EquipmentItem } from '@/types'

export const LOCATION_SUGGESTIONS = ['Garage', 'Halle', 'Flur', 'Spint', 'Geräteraum', 'Schrank']
export const EMPTY_EQUIPMENT_INPUT: EquipmentInput = {
  name: '', quantity: 1, storageLocation: 'Garage', notes: '',
}

const NEW_LOCATION = '__neu__'

interface Props {
  initial: EquipmentInput | EquipmentItem
  /** Bereits vorhandene Lagerorte (aus dem Katalog) zur Auswahl. */
  locations: string[]
  onCancel: () => void
  onSubmit: (input: EquipmentInput) => Promise<void>
}

export function EquipmentItemForm({ initial, locations, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(initial.name)
  const [storageLocation, setStorageLocation] = useState(initial.storageLocation ?? 'Garage')
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [quantity, setQuantity] = useState(initial.quantity || 1)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), quantity, storageLocation: storageLocation.trim() || null, notes: notes.trim() || null })
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 space-y-2 mx-2 my-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (z.B. Pavillon)" autoFocus
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex gap-2">
        {creatingLocation ? (
          <input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Neuer Lagerort" autoFocus
            className="flex-1 px-2 py-1.5 rounded border border-cream-300 text-sm" />
        ) : (
          <select value={storageLocation}
            onChange={e => {
              if (e.target.value === NEW_LOCATION) { setCreatingLocation(true); setStorageLocation('') }
              else setStorageLocation(e.target.value)
            }}
            className="flex-1 px-2 py-1.5 rounded border border-cream-300 text-sm bg-white cursor-pointer">
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
            <option value={NEW_LOCATION}>+ Neuer Lagerort…</option>
          </select>
        )}
        <input type="number" min={0} value={quantity} onChange={e => setQuantity(Math.max(0, Number(e.target.value)))}
          className="w-20 px-2 py-1.5 rounded border border-cream-300 text-sm tabular-nums" />
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notiz (optional)"
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-cream-200 rounded cursor-pointer">Abbrechen</button>
        <button onClick={submit} disabled={!name.trim() || saving}
          className="px-3 py-1.5 text-sm font-bold text-white bg-navy-800 hover:bg-navy-900 rounded cursor-pointer disabled:opacity-50">Speichern</button>
      </div>
    </div>
  )
}
