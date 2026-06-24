import { useState, useId } from 'react'
import type { EquipmentInput, EquipmentItem } from '@/types'

export const CATEGORY_SUGGESTIONS = ['Aufbau', 'Spielmaterial', 'Catering']
export const LOCATION_SUGGESTIONS = ['Garage', 'Raum']
export const EMPTY_EQUIPMENT_INPUT: EquipmentInput = {
  name: '', category: 'Aufbau', quantity: 1, storageLocation: '', notes: '',
}

interface Props {
  initial: EquipmentInput | EquipmentItem | Omit<EquipmentItem, 'used'>
  onCancel: () => void
  onSubmit: (input: EquipmentInput) => Promise<void>
}

export function EquipmentItemForm({ initial, onCancel, onSubmit }: Props) {
  const uid = useId()
  const catListId = `cat-${uid}`
  const locListId = `loc-${uid}`
  const [name, setName] = useState(initial.name)
  const [category, setCategory] = useState(initial.category || 'Aufbau')
  const [quantity, setQuantity] = useState(initial.quantity || 1)
  const [storageLocation, setStorageLocation] = useState(initial.storageLocation ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), category: category.trim() || 'Sonstiges', quantity, storageLocation: storageLocation.trim() || null, notes: notes.trim() || null })
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 space-y-2 mx-2 my-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (z.B. Pavillon)" autoFocus
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex gap-2">
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategorie" list={catListId}
          className="flex-1 px-2 py-1.5 rounded border border-cream-300 text-sm" />
        <input type="number" min={0} value={quantity} onChange={e => setQuantity(Math.max(0, Number(e.target.value)))}
          className="w-20 px-2 py-1.5 rounded border border-cream-300 text-sm tabular-nums" />
      </div>
      <datalist id={catListId}>{CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
      <input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Lagerort (z.B. Garage)" list={locListId}
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <datalist id={locListId}>{LOCATION_SUGGESTIONS.map(l => <option key={l} value={l} />)}</datalist>
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
