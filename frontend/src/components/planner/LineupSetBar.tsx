import { useState } from 'react'
import type { LineupSetResponse } from '@/types'
import { Pencil, TrashBin, PlusCircle, StarIcon } from '@/icons'

interface Props {
  sets: LineupSetResponse[]
  activeSetId: number | null
  onApply: (set: LineupSetResponse) => void
  onSaveNew: () => void
  onRename: (set: LineupSetResponse) => void
  onDelete: (set: LineupSetResponse) => void
}

export function LineupSetBar({ sets, activeSetId, onApply, onSaveNew, onRename, onDelete }: Props) {
  const [menuId, setMenuId] = useState<number | null>(null)

  return (
    <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50/60 px-3 py-2">
      <span className="font-display text-[10px] font-bold tracking-widest uppercase text-navy-700 shrink-0 inline-flex items-center gap-1.5">
        <StarIcon size={12} className="text-softball-red-500" />
        Sets
      </span>

      {/* Scrollbarer Pill-Bereich — läuft nie in den Speichern-Button */}
      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {sets.length === 0 ? (
          <span className="text-[11px] text-gray-400 italic whitespace-nowrap">Aktuelle Aufstellung als Variante sichern</span>
        ) : (
          <div className="flex items-center gap-2 w-max">
            {sets.map(set => {
              const active = set.id === activeSetId
              return (
                <div key={set.id} className="relative shrink-0">
                  <div
                    className={`inline-flex items-center rounded-full border transition-colors ${
                      active
                        ? 'border-navy-800 bg-navy-800'
                        : 'border-cream-300 bg-white hover:border-navy-400'
                    }`}
                  >
                    <button
                      onClick={() => onApply(set)}
                      className={`font-display pl-3 pr-2 py-2 text-[11px] font-bold tracking-wide uppercase cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform ${
                        active ? 'text-white' : 'text-navy-800'
                      }`}
                      title={active ? `„${set.name}" ist geladen — erneut anwenden` : `„${set.name}" in den Editor laden`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-softball-red-400' : 'bg-softball-red-500/70'}`} />
                      {set.name}
                    </button>
                    <button
                      onClick={() => setMenuId(menuId === set.id ? null : set.id)}
                      className={`px-2.5 py-2 text-sm leading-none cursor-pointer rounded-r-full border-l ${
                        active
                          ? 'border-white/20 text-white/80 hover:bg-white/10'
                          : 'border-cream-300 text-gray-500 hover:text-navy-700 hover:bg-cream-100'
                      }`}
                      title="Umbenennen / Löschen"
                      aria-label="Set verwalten"
                    >
                      ⋯
                    </button>
                  </div>

                  {menuId === set.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[9rem] rounded-lg border border-cream-300 bg-white shadow-lg py-1">
                      <button
                        onClick={() => { onRename(set); setMenuId(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-navy-800 hover:bg-cream-100 cursor-pointer"
                      >
                        <Pencil size={12} /> Umbenennen
                      </button>
                      <button
                        onClick={() => { onDelete(set); setMenuId(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                      >
                        <TrashBin size={12} /> Löschen
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Speichern — fest rechts, außerhalb des Scrolls */}
      <button
        onClick={onSaveNew}
        className="shrink-0 font-display px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase text-navy-700 border border-navy-200 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 hover:bg-navy-800 hover:text-white hover:border-navy-800"
        title="Aktuellen Stand als Set speichern"
      >
        <PlusCircle size={13} />
        <span className="hidden sm:inline">Set speichern</span>
        <span className="sm:hidden">Set</span>
      </button>

      {/* Klick-außerhalb schließt das Menü */}
      {menuId !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} aria-hidden />
      )}
    </div>
  )
}
