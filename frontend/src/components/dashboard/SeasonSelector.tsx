import { useState, useEffect, useRef } from 'react'
import type { Season } from '@/types'
import { PlusCircle, Pencil, TrashBin } from '@/icons'
import { ChevronDown } from 'lucide-react'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ResponsiveSheet } from '@/components/shared'
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
  const [showMenu, setShowMenu] = useState(false)
  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowMenu(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [showMenu])

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

  const selectedSeason = seasons.find(s => s.id === selectedId)

  return (
    <>
      <div className="flex items-center justify-between gap-3" ref={menuRef}>
        <span className="font-display text-[11px] font-bold tracking-widest uppercase text-gray-500 shrink-0">Saison</span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(s => !s)}
            className="font-display text-base sm:text-lg font-extrabold text-navy-900 inline-flex items-center gap-1 cursor-pointer hover:text-navy-700 outline-none"
            aria-haspopup="menu"
            aria-expanded={showMenu}
          >
            <span className="truncate max-w-[220px]">
              {selectedSeason ? `${selectedSeason.name} · ${selectedSeason.year}` : '— Saison wählen —'}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {showMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-30 w-60 bg-white border border-cream-300 rounded-xl shadow-lg overflow-hidden"
            >
              {seasons.length > 0 && (
                <div className="py-1 max-h-56 overflow-y-auto">
                  {seasons.map(s => (
                    <button
                      key={s.id}
                      role="menuitem"
                      onClick={() => { onSelect(s.id); setShowMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-sm font-medium hover:bg-cream-100 cursor-pointer flex items-center justify-between ${s.id === selectedId ? 'text-navy-900 bg-cream-50' : 'text-gray-700'}`}
                    >
                      <span className="truncate">{s.name} · {s.year}</span>
                      {s.id === selectedId && <span className="text-softball-red-600">●</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-cream-200 py-1">
                {selectedId && (
                  <>
                    <button
                      role="menuitem"
                      onClick={() => {
                        const s = seasons.find(x => x.id === selectedId)
                        if (s) { setName(s.name); setYear(s.year); setShowEditModal(true) }
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-cream-100 cursor-pointer inline-flex items-center gap-2"
                    >
                      <Pencil size={14} /> Bearbeiten
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-softball-red-700 hover:bg-softball-red-50 cursor-pointer inline-flex items-center gap-2"
                    >
                      <TrashBin size={14} /> Löschen
                    </button>
                  </>
                )}
                <button
                  role="menuitem"
                  onClick={() => { setShowModal(true); setShowMenu(false) }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-cream-100 cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusCircle size={14} /> Neue Saison
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ResponsiveSheet
          open
          onClose={() => setShowModal(false)}
          title="Neue Saison"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="font-display px-4 py-2 text-xs font-extrabold tracking-widest uppercase text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-700 disabled:opacity-50 cursor-pointer"
              >
                Erstellen
              </button>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            <div>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Name</label>
              <input
                placeholder="z.B. Saison 2026"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Jahr</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                min={2020}
                max={2030}
                className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
            </div>
          </div>
        </ResponsiveSheet>
      )}

      {showEditModal && selectedId && (
        <ResponsiveSheet
          open
          onClose={() => setShowEditModal(false)}
          title="Saison bearbeiten"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer"
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
                className="font-display px-4 py-2 text-xs font-extrabold tracking-widest uppercase text-white bg-navy-800 rounded-lg hover:bg-navy-900 disabled:opacity-50 cursor-pointer"
              >
                Speichern
              </button>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            <div>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Name</label>
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
                className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Jahr</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                min={2020}
                max={2030}
                className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
            </div>
          </div>
        </ResponsiveSheet>
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
