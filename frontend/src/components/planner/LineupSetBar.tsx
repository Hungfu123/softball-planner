import type { LineupSetResponse } from '@/types'
import { Pencil, TrashBin } from '@/icons'

interface Props {
  sets: LineupSetResponse[]
  onApply: (set: LineupSetResponse) => void
  onSaveNew: () => void
  onRename: (set: LineupSetResponse) => void
  onDelete: (set: LineupSetResponse) => void
}

export function LineupSetBar({ sets, onApply, onSaveNew, onRename, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-400 shrink-0">
        Sets
      </span>
      {sets.map(set => (
        <div
          key={set.id}
          className="group/set inline-flex items-center rounded-lg border border-cream-300 bg-cream-50 hover:border-navy-400 transition-colors"
        >
          <button
            onClick={() => onApply(set)}
            className="font-display px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase text-navy-800 cursor-pointer"
            title={`"${set.name}" in Editor laden`}
          >
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
        className="font-display px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
        title="Aktuellen Stand als Set speichern"
      >
        + Als Set speichern
      </button>
    </div>
  )
}
