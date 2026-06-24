import { useMemo, useState, useId } from 'react'
import { useEquipment } from '@/hooks/useEquipment'
import { useToastContext } from '@/components/layout/Layout'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ClipboardListIcon, CheckCircle, PlusCircle, Pencil, TrashBin, AlertTriangle, XMark, CrossBones } from '@/icons'
import type { EquipmentItem, EquipmentInput } from '@/types'

const CATEGORY_SUGGESTIONS = ['Aufbau', 'Spielmaterial', 'Catering']
const LOCATION_SUGGESTIONS = ['Garage', 'Raum']

interface Props {
  gameDayId: number
  gameDayLabel: string
  onClose: () => void
}

type GroupMode = 'category' | 'location'

const emptyInput: EquipmentInput = { name: '', category: 'Aufbau', quantity: 1, storageLocation: '', notes: '' }

export function MaterialSheet({ gameDayId, gameDayLabel, onClose }: Props) {
  const { items, loading, toggle, add, edit, remove, carryOver } = useEquipment(gameDayId)
  const toast = useToastContext()
  const [groupMode, setGroupMode] = useState<GroupMode>('category')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteItem, setDeleteItem] = useState<EquipmentItem | null>(null)
  const [expandedNote, setExpandedNote] = useState<number | null>(null)

  const usedCount = items.filter(i => i.used).length
  const hasAnyUsed = usedCount > 0

  const groups = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>()
    for (const i of items) {
      const key = groupMode === 'category'
        ? (i.category || 'Sonstiges')
        : (i.storageLocation?.trim() || 'Ohne Ort')
      const arr = map.get(key) ?? []
      arr.push(i)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [items, groupMode])

  const handleToggle = async (item: EquipmentItem) => {
    try { await toggle(item.id, !item.used) }
    catch { toast.show('Konnte nicht speichern', 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await remove(deleteItem.id); toast.show('Sache gelöscht') }
    catch (e) { toast.show((e as Error).message, 'error') }
    finally { setDeleteItem(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-navy-950/70">
      <div className="bg-cream-50 w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-[640px] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-300 sticky top-0 bg-cream-50">
          <ClipboardListIcon size={18} className="text-navy-800" />
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900 truncate">Material</div>
            <div className="text-[11px] text-gray-500 truncate">{gameDayLabel} · Dabei {usedCount}/{items.length}</div>
          </div>
          <button onClick={onClose} aria-label="Schließen" className="p-2 text-gray-400 hover:text-navy-800 cursor-pointer rounded-md hover:bg-cream-100">
            <XMark size={18} />
          </button>
        </div>

        {/* Group toggle */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cream-200">
          <div className="flex bg-cream-100 border border-cream-300 rounded-lg p-0.5">
            <button onClick={() => setGroupMode('category')}
              className={`px-3 h-8 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${groupMode === 'category' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}>
              Kategorie
            </button>
            <button onClick={() => setGroupMode('location')}
              className={`px-3 h-8 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${groupMode === 'location' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}>
              Lagerort
            </button>
          </div>
          {!hasAnyUsed && items.length > 0 && (
            <button onClick={() => carryOver().catch(() => toast.show('Konnte nicht übernehmen', 'error'))}
              className="ml-auto text-xs font-bold uppercase tracking-wider text-navy-700 hover:text-navy-900 hover:bg-cream-100 px-2.5 h-8 rounded-md cursor-pointer">
              Letztes Mal übernehmen
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">Lädt…</p>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <CrossBones size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-gray-500 text-sm">Noch keine Sachen — leg los, baut sich beim Aufbau von selbst auf.</p>
            </div>
          ) : groups.map(([groupName, groupItems]) => {
            const groupUsed = groupItems.filter(i => i.used).length
            return (
              <div key={groupName} className="mb-3">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="font-display text-[11px] font-extrabold uppercase tracking-widest text-navy-900">{groupName}</span>
                  <span className="text-[10px] font-display text-gray-400">{groupUsed}/{groupItems.length}</span>
                </div>
                {groupItems.map(item => (
                  <div key={item.id} className="group flex items-center gap-2 min-h-[52px] px-2 rounded-lg hover:bg-cream-100">
                    <button onClick={() => handleToggle(item)} aria-label={item.used ? 'Abwählen' : 'Dabei'} className="shrink-0 cursor-pointer">
                      {item.used
                        ? <CheckCircle size={22} className="text-softball-red-600" />
                        : <span className="block w-[22px] h-[22px] rounded-full border-2 border-cream-400" />}
                    </button>
                    <div role="button" tabIndex={0} onClick={() => handleToggle(item)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(item) } }} className="flex-1 min-w-0 text-left cursor-pointer py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy-900 truncate">{item.name}</span>
                        <span className="text-xs text-gray-400 tabular-nums shrink-0">×{item.quantity}</span>
                        {item.notes && (
                          <button onClick={e => { e.stopPropagation(); setExpandedNote(expandedNote === item.id ? null : item.id) }}
                            aria-label="Notiz" className="shrink-0 cursor-pointer">
                            <AlertTriangle size={13} className="text-amber-400" />
                          </button>
                        )}
                      </div>
                      {item.storageLocation && groupMode === 'category' && (
                        <span className="inline-block mt-0.5 text-[11px] bg-cream-100 text-navy-800 px-1.5 py-0.5 rounded">📍 {item.storageLocation}</span>
                      )}
                      {expandedNote === item.id && item.notes && (
                        <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingId(item.id)} aria-label="Bearbeiten" className="p-1.5 text-gray-400 hover:text-navy-700 cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteItem(item)} aria-label="Löschen" className="p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer">
                        <TrashBin size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {editingId != null && groupItems.some(i => i.id === editingId) && (
                  <ItemForm
                    initial={groupItems.find(i => i.id === editingId)!}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async input => { await edit(editingId, input); setEditingId(null) }}
                  />
                )}
              </div>
            )
          })}

          {adding && (
            <ItemForm
              initial={emptyInput}
              onCancel={() => setAdding(false)}
              onSubmit={async input => { await add(input); setAdding(false) }}
            />
          )}
        </div>

        {/* Add button (sticky bottom) */}
        <div className="border-t border-cream-300 p-3 bg-cream-50">
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-navy-800 text-white font-bold text-sm hover:bg-navy-900 cursor-pointer">
            <PlusCircle size={18} /> Sache hinzufügen
          </button>
        </div>
      </div>

      {deleteItem && (
        <ConfirmModal
          title="Aus Katalog löschen"
          message={`„${deleteItem.name}" dauerhaft aus dem Material-Katalog löschen? Wird aus allen Spieltagen entfernt.`}
          confirmLabel="Löschen"
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}

interface FormProps {
  initial: EquipmentInput | EquipmentItem
  onCancel: () => void
  onSubmit: (input: EquipmentInput) => Promise<void>
}

function ItemForm({ initial, onCancel, onSubmit }: FormProps) {
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
