import { useState, useEffect, useRef, useMemo } from 'react'
import type { Season, YearCopyResponse } from '@/types'
import { PlusCircle, Pencil, TrashBin, ArchiveRestoreIcon } from '@/icons'
import { ChevronDown } from 'lucide-react'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ResponsiveSheet, Button } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'
import { useRolle } from '@/hooks/useRolle'

interface Props {
  seasons: Season[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: (name: string, year: number) => Promise<Season>
  onCopyYear: (templateYear: number, targetYear: number, copyTeams: boolean) => Promise<YearCopyResponse>
  onUpdate: (id: number, name: string, year: number) => Promise<Season>
  onDelete: (id: number) => Promise<void>
}

export function SeasonSelector({ seasons, selectedId, onSelect, onCreate, onCopyYear, onUpdate, onDelete }: Props) {
  const toast = useToastContext()
  const { istAdmin } = useRolle()
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCopyYearModal, setShowCopyYearModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [copyTemplateYear, setCopyTemplateYear] = useState<number | null>(null)
  const [copyTargetYear, setCopyTargetYear] = useState<number>(new Date().getFullYear() + 1)
  const [copyTeams, setCopyTeams] = useState(true)
  const [copyRunning, setCopyRunning] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const availableYears = useMemo(
    () => [...new Set(seasons.map(s => s.year))].sort((a, b) => b - a),
    [seasons],
  )

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

  const handleCopyYear = async () => {
    if (copyTemplateYear == null) return
    setCopyRunning(true)
    try {
      const result = await onCopyYear(copyTemplateYear, copyTargetYear, copyTeams)
      setShowCopyYearModal(false)
      const created = result.createdSeasons.length
      const skipped = result.skippedSeasons.length
      let msg = `${created} ${created === 1 ? 'Liga' : 'Ligen'} für ${result.targetYear} angelegt`
      if (result.copiedTeams > 0) msg += ` · ${result.copiedTeams} Teams mitkopiert`
      if (skipped > 0) msg += ` · ${skipped} bereits vorhanden (übersprungen)`
      toast.show(msg)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setCopyRunning(false)
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
              {istAdmin && <div className="border-t border-cream-200 py-1">
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
                  onClick={() => {
                    setCopyTemplateYear(availableYears[0] ?? null)
                    setShowCopyYearModal(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-cream-100 cursor-pointer inline-flex items-center gap-2"
                  title="Alle Ligen eines Jahres ins nächste Jahr übernehmen"
                >
                  <ArchiveRestoreIcon size={14} /> Neues Jahr übernehmen
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setShowModal(true); setShowMenu(false) }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-cream-100 cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusCircle size={14} /> Neue Saison
                </button>
              </div>}
            </div>
          )}
        </div>
      </div>

      {showCopyYearModal && (
        <ResponsiveSheet
          open
          onClose={() => { if (!copyRunning) setShowCopyYearModal(false) }}
          title="Neues Jahr übernehmen"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCopyYearModal(false)}
                disabled={copyRunning}
                className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer disabled:opacity-50"
              >
                Abbrechen
              </button>
              <Button
                variant="primary"
                onClick={handleCopyYear}
                disabled={copyTemplateYear == null || copyRunning}
                className="font-display text-xs font-extrabold tracking-widest uppercase hover:bg-softball-red-700"
              >
                {copyRunning ? 'Übernehme…' : 'Übernehmen'}
              </Button>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Legt alle Ligen des Vorlagen-Jahres für das Ziel-Jahr neu an — jede Liga
              mit den Dead Sox als eigenem Team. Bereits existierende Ligen im Ziel-Jahr
              werden übersprungen.
            </p>
            <div>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Vorlagen-Jahr</label>
              <select
                value={copyTemplateYear ?? ''}
                onChange={e => setCopyTemplateYear(Number(e.target.value))}
                className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Ziel-Jahr</label>
              <input
                type="number"
                value={copyTargetYear}
                onChange={e => setCopyTargetYear(Number(e.target.value))}
                min={2020}
                max={2050}
                className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              />
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={copyTeams}
                onChange={e => setCopyTeams(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-softball-red-600 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                <strong className="text-navy-900">Gegner-Teams mitkopieren</strong>
                <span className="block text-xs text-gray-500">
                  Alle Gegner der Vorlagen-Ligen stehen dann direkt in den neuen Ligen bereit
                  (händisch anlegen entfällt).
                </span>
              </span>
            </label>
          </div>
        </ResponsiveSheet>
      )}

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
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!name.trim()}
                className="font-display text-xs font-extrabold tracking-widest uppercase hover:bg-softball-red-700"
              >
                Erstellen
              </Button>
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
              <Button
                variant="navy"
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
                className="font-display text-xs font-extrabold tracking-widest uppercase"
              >
                Speichern
              </Button>
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
