import { useState } from 'react'
import type { Season } from '@/types'
import { PlusCircle, Pencil, TrashBin, XMark } from '@/icons'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { useToastContext } from '@/components/layout/Layout'

interface Props {
  seasons: Season[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: (name: string, year: number) => Promise<Season>
  onUpdate: (id: number, name: string, year: number) => Promise<Season>
  onDelete: (id: number) => Promise<void>
}

export function SeasonSelector({ seasons, selectedId, onSelect, onCreate, onUpdate, onDelete }: Props) {
  const toast = useToastContext()
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      const s = await onCreate(name.trim(), year)
      onSelect(s.id)
      setShowModal(false)
      setName('')
      toast.show('Saison erstellt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Saison:</label>
        {seasons.length > 0 ? (
          <select
            value={selectedId ?? ''}
            onChange={e => onSelect(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:border-navy-300 hover:bg-navy-50 focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer transition-colors"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.year}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-gray-500">Keine Saison vorhanden</span>
        )}

        {selectedId && (
          <>
            <button
              onClick={() => {
                const s = seasons.find(x => x.id === selectedId)
                if (s) { setName(s.name); setYear(s.year); setShowEditModal(true) }
              }}
              className="p-2 text-navy-600 hover:text-navy-800 hover:bg-navy-50 rounded-lg cursor-pointer"
              title="Saison bearbeiten"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-navy-600 hover:text-softball-red-600 hover:bg-softball-red-50 rounded-lg cursor-pointer"
              title="Saison löschen"
            >
              <TrashBin size={16} />
            </button>
          </>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-800 hover:border-navy-800 hover:text-white cursor-pointer font-medium transition-colors"
        >
          <PlusCircle size={16} /> Neue Saison
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Neue Saison</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <XMark size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  placeholder="z.B. Saison 2026"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Saison bearbeiten</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <XMark size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && name.trim()) {
                      onUpdate(selectedId, name.trim(), year)
                        .then(() => { setShowEditModal(false); toast.show('Saison aktualisiert') })
                        .catch((err: Error) => toast.show(err.message, 'error'))
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  if (!name.trim()) return
                  try {
                    await onUpdate(selectedId, name.trim(), year)
                    setShowEditModal(false)
                    toast.show('Saison aktualisiert')
                  } catch (e: unknown) {
                    toast.show((e as Error).message, 'error')
                  }
                }}
                disabled={!name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedId && (
        <ConfirmModal
          title="Saison löschen"
          message="Saison und alle Spieltage wirklich löschen? Das kann nicht rückgängig gemacht werden."
          onConfirm={async () => {
            setShowDeleteConfirm(false)
            try {
              await onDelete(selectedId)
              toast.show('Saison gelöscht')
            } catch (e: unknown) {
              toast.show((e as Error).message, 'error')
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
