import { useState } from 'react'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { PlusCircle, Pencil, TrashBin, CrossBones } from '@/icons'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

export function PlayerManager() {
  const { players, loading, create, update, remove } = usePlayers()
  const toast = useToastContext()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null)

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
      await update(id, name)
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Laden...</div>
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-950">Spieler verwalten</h1>
        <span className="text-sm text-gray-500">{players.length} Spieler</span>
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Name eingeben..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
          autoFocus
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-softball-red-600 text-white text-sm font-medium hover:bg-softball-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusCircle size={16} /> Hinzufügen
        </button>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CrossBones size={48} className="mx-auto mb-3 opacity-40" />
          <p>Noch keine Spieler angelegt. Leg los!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
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
                <span className="flex-1 text-sm font-medium text-gray-900">{p.name}</span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  )
}
