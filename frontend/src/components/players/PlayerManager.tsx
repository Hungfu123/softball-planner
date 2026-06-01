import { useState, useMemo, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { PlusCircle, Pencil, TrashBin, CrossBones, GripHandle } from '@/icons'
import { EmptyState, ConfirmModal } from '@/components/shared'
import { PlayerManagerSkeleton } from './PlayerManagerSkeleton'
import type { Player } from '@/types'

function SortablePlayerRow({ player, index }: { player: Player; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 bg-white">
      <button
        {...attributes}
        {...listeners}
        aria-label="Reihenfolge ziehen"
        className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-navy-700 touch-none shrink-0"
      >
        <GripHandle size={16} />
      </button>
      <span className="text-sm font-semibold text-navy-500 tabular-nums w-6 text-center shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 text-navy-900 font-medium">{player.name}</span>
    </div>
  )
}

export function PlayerManager() {
  const { players, loading, create, update, remove, reorderBattingOrder } = usePlayers()
  const toast = useToastContext()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null)
  const [tab, setTab] = useState<'spieler' | 'batting'>('spieler')
  const [search, setSearch] = useState('')

  // Local batting-order state (für Save/Cancel-Pattern)
  const [localBattingOrder, setLocalBattingOrder] = useState<number[]>([])
  const [battingSaving, setBattingSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const orderMode = tab === 'batting'

  // Server-Order ableiten (defaultBattingOrder asc, dann alpha)
  const serverBattingOrder = useMemo(() => {
    return [...players]
      .sort((a, b) => {
        if (a.defaultBattingOrder != null && b.defaultBattingOrder != null)
          return a.defaultBattingOrder - b.defaultBattingOrder
        if (a.defaultBattingOrder != null) return -1
        if (b.defaultBattingOrder != null) return 1
        return a.name.localeCompare(b.name)
      })
      .map(p => p.id)
  }, [players])

  // Lokale Order initialisieren wenn Tab gewechselt oder Server-Daten neu
  useEffect(() => {
    setLocalBattingOrder(serverBattingOrder)
  }, [serverBattingOrder, tab])

  const orderedBattingPlayers = useMemo(() => {
    const map = new Map(players.map(p => [p.id, p]))
    return localBattingOrder.map(id => map.get(id)).filter((p): p is Player => !!p)
  }, [players, localBattingOrder])

  const battingDirty = useMemo(() => {
    if (localBattingOrder.length !== serverBattingOrder.length) return true
    return localBattingOrder.some((id, i) => id !== serverBattingOrder[i])
  }, [localBattingOrder, serverBattingOrder])

  const filteredPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter(p => p.name.toLowerCase().includes(q))
  }, [players, search])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await create(name)
      setNewName('')
      toast.show('Spieler erstellt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleUpdate = async (id: number) => {
    const name = editName.trim()
    if (!name) return
    try {
      await update(id, { name })
      setEditingId(null)
      toast.show('Spieler aktualisiert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleDelete = (id: number) => {
    setDeletePlayerId(id)
  }

  const confirmDeletePlayer = async () => {
    if (!deletePlayerId) return
    setDeletePlayerId(null)
    try {
      await remove(deletePlayerId)
      toast.show('Spieler gelöscht')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localBattingOrder.indexOf(active.id as number)
    const newIndex = localBattingOrder.indexOf(over.id as number)
    if (oldIndex === -1 || newIndex === -1) return
    setLocalBattingOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      return next
    })
  }

  const handleBattingSave = async () => {
    setBattingSaving(true)
    try {
      await reorderBattingOrder(localBattingOrder)
      toast.show('Schlagreihenfolge gespeichert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setBattingSaving(false)
    }
  }

  const handleBattingCancel = () => {
    setLocalBattingOrder(serverBattingOrder)
  }

  if (loading) {
    return <PlayerManagerSkeleton />
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">
            Spieler {players.length > 0 && <span className="text-navy-500 font-bold">({players.length})</span>}
          </h1>
        </div>

        {/* Tab Bar */}
        <div className="inline-flex bg-cream-200 rounded-lg p-0.5 w-full" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'spieler'}
            onClick={() => { setTab('spieler'); setEditingId(null) }}
            className={`flex-1 px-3 py-2 text-sm rounded-md font-bold uppercase tracking-wide cursor-pointer transition-colors ${tab === 'spieler' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}
          >
            Spieler
          </button>
          <button
            role="tab"
            aria-selected={tab === 'batting'}
            onClick={() => { setTab('batting'); setEditingId(null) }}
            className={`flex-1 px-3 py-2 text-sm rounded-md font-bold uppercase tracking-wide cursor-pointer transition-colors ${tab === 'batting' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}
          >
            Batting-Reihenfolge
          </button>
        </div>

        {!orderMode && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Neuer Spieler…"
                className="flex-1 border border-cream-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircle size={16} /> Hinzufügen
              </button>
            </div>
            {players.length > 6 && (
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="w-full border border-cream-300 rounded-lg px-4 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
            )}
          </div>
        )}

        {players.length === 0 ? (
          <EmptyState
            title="Noch keine Spieler angelegt"
            description="Leg los!"
            icon={<CrossBones size={48} />}
          />
        ) : orderMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localBattingOrder} strategy={verticalListSortingStrategy}>
              <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
                {orderedBattingPlayers.map((p, i) => (
                  <SortablePlayerRow key={p.id} player={p} index={i} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
            {filteredPlayers.length === 0 ? (
              <p className="text-center text-sm text-navy-400 italic py-6">Keine Treffer.</p>
            ) : (
              filteredPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 group">
                  {editingId === p.id ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={() => handleUpdate(p.id)}
                      className="flex-1 border border-navy-600 rounded-lg px-3 py-1.5 text-sm ring-2 ring-navy-100 outline-none text-navy-900"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-navy-900 font-medium">{p.name}</span>
                  )}
                  <div className="actions-reveal flex gap-1">
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                      aria-label={`${p.name} bearbeiten`}
                      className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                      title="Bearbeiten"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label={`${p.name} löschen`}
                      className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                      title="Löschen"
                    >
                      <TrashBin size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Batting Save/Cancel — sticky bottom */}
        {orderMode && battingDirty && (
          <div className="sticky bottom-4 grid grid-cols-[auto_1fr] gap-2 z-20">
            <button
              onClick={handleBattingCancel}
              disabled={battingSaving}
              className="px-4 py-3 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-xl hover:bg-cream-100 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              Abbrechen
            </button>
            <button
              onClick={handleBattingSave}
              disabled={battingSaving}
              className="py-3 text-sm font-semibold text-white bg-softball-red-600 rounded-xl hover:bg-softball-red-500 disabled:opacity-50 shadow-lg shadow-softball-red-600/20 cursor-pointer"
            >
              {battingSaving ? 'Speichern…' : 'Reihenfolge speichern'}
            </button>
          </div>
        )}

        {deletePlayerId && (
          <ConfirmModal
            title="Spieler löschen"
            message={`${players.find(p => p.id === deletePlayerId)?.name ?? 'Spieler'} wirklich löschen?`}
            onConfirm={confirmDeletePlayer}
            onCancel={() => setDeletePlayerId(null)}
          />
        )}
      </div>
    </div>
  )
}
