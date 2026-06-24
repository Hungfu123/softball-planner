import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from '@/icons'
import type { EquipmentInput, EquipmentItem } from '@/types'

export const LOCATION_SUGGESTIONS = ['Garage', 'Halle', 'Flur', 'Spint', 'Geräteraum', 'Schrank']
export const EMPTY_EQUIPMENT_INPUT: EquipmentInput = {
  name: '', quantity: 1, storageLocation: 'Garage', notes: '',
}

interface Props {
  initial: EquipmentInput | EquipmentItem
  /** Auswählbare Lagerorte (= Zonen des Lageplans). */
  locations: string[]
  onCancel: () => void
  onSubmit: (input: EquipmentInput) => Promise<void>
}

export function EquipmentItemForm({ initial, locations, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(initial.name)
  const [storageLocation, setStorageLocation] = useState(initial.storageLocation ?? 'Garage')
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const [quantity, setQuantity] = useState(initial.quantity || 1)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [saving, setSaving] = useState(false)
  const locRef = useRef<HTMLDivElement>(null)

  // Dropdown bei Klick außerhalb schließen.
  useEffect(() => {
    if (!locOpen) return
    const handler = (e: MouseEvent) => {
      if (!locRef.current?.contains(e.target as Node)) setLocOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [locOpen])

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
          <div className="relative flex-1" ref={locRef}>
            <button type="button" onClick={() => setLocOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-cream-300 bg-white text-sm text-navy-900 cursor-pointer hover:border-navy-400 transition-colors">
              <span className={storageLocation ? '' : 'text-gray-400'}>{storageLocation || 'Lagerort wählen'}</span>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </button>
            {locOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-cream-50 border border-cream-300 rounded-lg shadow-lg py-1 max-h-56 overflow-auto">
                {locations.map(loc => (
                  <button key={loc} type="button"
                    onClick={() => { setStorageLocation(loc); setLocOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-navy-50 hover:text-navy-700 ${loc === storageLocation ? 'bg-navy-50 text-navy-800 font-semibold' : 'text-navy-900'}`}>
                    {loc}
                  </button>
                ))}
                <button type="button"
                  onClick={() => { setCreatingLocation(true); setStorageLocation(''); setLocOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-navy-600 hover:bg-navy-50 cursor-pointer border-t border-cream-200 transition-colors">
                  + Neuer Lagerort…
                </button>
              </div>
            )}
          </div>
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
