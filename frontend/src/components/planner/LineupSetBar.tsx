import type { LineupSetResponse } from '@/types'
import { Pencil, TrashBin, PlusCircle, StarIcon } from '@/icons'

interface Props {
  sets: LineupSetResponse[]
  onApply: (set: LineupSetResponse) => void
  onSaveNew: () => void
  onRename: (set: LineupSetResponse) => void
  onDelete: (set: LineupSetResponse) => void
}

export function LineupSetBar({ sets, onApply, onSaveNew, onRename, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-cream-300 bg-cream-50/60 px-3 py-2">
      <span className="font-display text-[10px] font-bold tracking-widest uppercase text-navy-700 shrink-0 inline-flex items-center gap-1.5">
        <StarIcon size={12} className="text-softball-red-500" />
        Sets
      </span>

      {sets.length === 0 && (
        <span className="text-[11px] text-gray-400 italic">Aktuelle Aufstellung als Variante sichern</span>
      )}

      {sets.map(set => (
        <div
          key={set.id}
          className="group/set inline-flex items-center rounded-lg border border-cream-300 bg-white hover:border-navy-400 hover:shadow-sm transition-all"
        >
          <button
            onClick={() => onApply(set)}
            className="font-display pl-2.5 pr-2 py-1 text-[11px] font-bold tracking-wide uppercase text-navy-800 cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform"
            title={`„${set.name}" in den Editor laden`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-softball-red-500/70 shrink-0" />
            {set.name}
          </button>
          <span className="flex items-center pr-1.5 gap-0.5 sm:opacity-0 sm:group-hover/set:opacity-100 transition-opacity">
            <button
              onClick={() => onRename(set)}
              className="p-0.5 text-gray-400 hover:text-navy-700 cursor-pointer"
              title="Umbenennen"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(set)}
              className="p-0.5 text-gray-400 hover:text-softball-red-600 cursor-pointer"
              title="Löschen"
            >
              <TrashBin size={12} />
            </button>
          </span>
        </div>
      ))}

      <button
        onClick={onSaveNew}
        className="font-display ml-auto px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase text-navy-700 border border-navy-200 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 hover:bg-navy-800 hover:text-white hover:border-navy-800"
        title="Aktuellen Stand als Set speichern"
      >
        <PlusCircle size={13} />
        Set speichern
      </button>
    </div>
  )
}
