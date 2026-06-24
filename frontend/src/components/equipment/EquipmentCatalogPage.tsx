import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog'
import { useToastContext } from '@/components/layout/Layout'
import { ConfirmModal, EmptyState } from '@/components/shared'
import { EquipmentItemForm, EMPTY_EQUIPMENT_INPUT } from './EquipmentItemForm'
import { PlusCircle, Pencil, TrashBin, AlertTriangle, CrossBones } from '@/icons'
import type { EquipmentItem } from '@/types'

type GroupMode = 'category' | 'location'

export default function EquipmentCatalogPage() {
  const { items, loading, add, edit, remove } = useEquipmentCatalog()
  const toast = useToastContext()
  const [groupMode, setGroupMode] = useState<GroupMode>('category')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteItem, setDeleteItem] = useState<EquipmentItem | null>(null)
  const [expandedNote, setExpandedNote] = useState<number | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>()
    for (const i of items) {
      const key = groupMode === 'category' ? (i.category || 'Sonstiges') : (i.storageLocation?.trim() || 'Ohne Ort')
      const arr = map.get(key) ?? []
      arr.push(i)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [items, groupMode])

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await remove(deleteItem.id); toast.show(`„${deleteItem.name}" gelöscht`) }
    catch (e) { toast.show((e as Error).message, 'error') }
    finally { setDeleteItem(null) }
  }

  return (
    <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-4">
      <Link to="/orga" className="inline-flex items-center gap-1 text-gray-500 text-sm hover:text-navy-700 hover:underline">← Zurück zur Orga</Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 tracking-wide uppercase">
          Aufbau Heimspieltag
        </h1>
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
      </div>
      <p className="text-sm text-gray-500 -mt-2">Stammliste fürs Heimspieltag-Material — was brauchen wir, wo liegt es.</p>

      <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-3 space-y-0" role="status" aria-label="Lade Daten">
            {/* group-header placeholder */}
            <div className="px-0 pt-3 pb-2">
              <div className="skeleton-shimmer h-2.5 w-20 rounded-full bg-cream-300" />
            </div>
            {[{ w: 'w-2/3' }, { w: 'w-1/2' }, { w: 'w-3/5' }].map((row, i) => (
              <div key={i} className="flex items-center gap-2 min-h-[48px] px-0 border-b border-cream-200 last:border-b-0">
                <div className={`skeleton-shimmer h-4 ${row.w} bg-cream-200 rounded-full`} />
              </div>
            ))}
            {/* second group placeholder */}
            <div className="px-0 pt-3 pb-2 mt-1">
              <div className="skeleton-shimmer h-2.5 w-16 rounded-full bg-cream-300" />
            </div>
            {[{ w: 'w-3/4' }, { w: 'w-2/5' }].map((row, i) => (
              <div key={i} className="flex items-center gap-2 min-h-[48px] px-0 border-b border-cream-200 last:border-b-0">
                <div className={`skeleton-shimmer h-4 ${row.w} bg-cream-200 rounded-full`} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<CrossBones size={40} />} title="Noch keine Sachen"
            description="Leg den Heimspieltag-Aufbau an — baut sich nach und nach auf." />
        ) : groups.map(([groupName, groupItems]) => (
          <div key={groupName}>
            <div className="px-3 py-2 bg-cream-100/70 border-y border-cream-200 font-display text-[11px] font-extrabold uppercase tracking-widest text-navy-700">{groupName}</div>
            {groupItems.map(item => (
              <div key={item.id} className="group flex items-center gap-2 min-h-[44px] px-3 border-b border-cream-100 last:border-b-0 hover:bg-cream-100">
                <div className="flex-1 min-w-0 py-2">
                  <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                    <span className="font-semibold text-navy-900 truncate">{item.name}</span>
                    {item.quantity > 1 && <span className="text-xs text-gray-400 tabular-nums shrink-0">×{item.quantity}</span>}
                    {item.storageLocation && groupMode === 'category' && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500 shrink-0"><MapPin size={11} className="shrink-0" /> {item.storageLocation}</span>
                    )}
                    {item.notes && (
                      <button onClick={() => setExpandedNote(expandedNote === item.id ? null : item.id)} aria-label="Notiz" className="shrink-0 cursor-pointer">
                        <AlertTriangle size={13} className="text-amber-400" />
                      </button>
                    )}
                  </div>
                  {expandedNote === item.id && item.notes && (
                    <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingId(item.id)} aria-label="Bearbeiten" className="p-1.5 text-gray-400 hover:text-navy-700 cursor-pointer"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteItem(item)} aria-label="Löschen" className="p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer"><TrashBin size={14} /></button>
                </div>
              </div>
            ))}
            {editingId != null && groupItems.some(i => i.id === editingId) && (
              <EquipmentItemForm
                initial={groupItems.find(i => i.id === editingId)!}
                onCancel={() => setEditingId(null)}
                onSubmit={async input => { await edit(editingId, input); setEditingId(null) }}
              />
            )}
          </div>
        ))}
        {adding && (
          <EquipmentItemForm
            initial={EMPTY_EQUIPMENT_INPUT}
            onCancel={() => setAdding(false)}
            onSubmit={async input => { await add(input); setAdding(false) }}
          />
        )}
      </div>

      <button onClick={() => setAdding(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-navy-800 text-white font-bold text-sm hover:bg-navy-900 cursor-pointer">
        <PlusCircle size={18} /> Sache hinzufügen
      </button>

      {deleteItem && (
        <ConfirmModal
          title="Aus Katalog löschen"
          message={`„${deleteItem.name}" dauerhaft aus dem Katalog löschen? Wird aus allen Spieltagen entfernt.`}
          confirmLabel="Löschen"
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}
