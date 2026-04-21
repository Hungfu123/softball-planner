import { useState, useMemo } from 'react'
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
import { Card, Button, EmptyState, ConfirmModal, LoadingSkeleton } from '@/components/shared'
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
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3">
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
      >
        <GripHandle size={16} />
      </button>
      <span className="text-xs font-mono font-semibold text-gray-400 w-5 text-center shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-900">{player.name}</span>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const orderMode = tab === 'batting'

  const orderedPlayers = useMemo(() => {
    if (!orderMode) return players
    return [...players].sort((a, b) => {
      if (a.defaultBattingOrder != null && b.defaultBattingOrder != null)
        return a.defaultBattingOrder - b.defaultBattingOrder
      if (a.defaultBattingOrder != null) return -1
      if (b.defaultBattingOrder != null) return 1
      return a.name.localeCompare(b.name)
    })
  }, [players, orderMode])

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedPlayers.findIndex(p => p.id === active.id)
    const newIndex = orderedPlayers.findIndex(p => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...orderedPlayers]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    try {
      await reorderBattingOrder(reordered.map(p => p.id))
      toast.show('Schlagreihenfolge gespeichert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-2">
        {([
          ['spieler', 'Spieler'],
          ['batting', 'Batting Reihenfolge'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setEditingId(null) }}
            className={`py-2.5 px-4 rounded-lg text-sm font-semibold cursor-pointer transition-colors text-center ${
              tab === key
                ? 'bg-navy-800 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!orderMode && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Name eingeben..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
            autoFocus
          />
          <Button onClick={handleCreate} disabled={!newName.trim()} icon={<PlusCircle size={16} />}>
            Hinzufügen
          </Button>
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
          <SortableContext items={orderedPlayers.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <Card className="divide-y divide-gray-100">
              {orderedPlayers.map((p, i) => (
                <SortablePlayerRow key={p.id} player={p} index={i} />
              ))}
            </Card>
          </SortableContext>
        </DndContext>
      ) : (
        <Card className="divide-y divide-gray-100">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 group">
              {editingId === p.id ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUpdate(p.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => handleUpdate(p.id)}
                  className="flex-1 border border-navy-600 rounded-lg px-3 py-1.5 text-sm ring-2 ring-navy-100 outline-none"
                  autoFocus
                />
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-900">{p.name}</span>
                </>
              )}
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50"
                  title="Bearbeiten"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50"
                  title="Löschen"
                >
                  <TrashBin size={16} />
                </button>
              </div>
            </div>
          ))}
        </Card>
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
  )
}
