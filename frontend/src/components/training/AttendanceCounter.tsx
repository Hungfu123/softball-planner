import { BarChart3, ChevronRight } from 'lucide-react'

type Props = {
  present: number
  avgRecent: number | null
  recentCount: number
  onStatsClick: () => void
}

export function AttendanceCounter({ present, avgRecent, recentCount, onStatsClick }: Props) {
  return (
    <div className="bg-white border border-cream-300 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex-1 px-4 py-3 flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-black text-navy-800 tabular-nums leading-none">
              {present}
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-wider text-navy-600">
              Anwesend
            </span>
          </div>
          {avgRecent != null && recentCount > 0 && (
            <span className="text-xs text-navy-500 tabular-nums">
              Ø {avgRecent.toFixed(1)} · letzte {recentCount} Trainings
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onStatsClick}
          aria-label="Statistik anzeigen"
          className="flex items-center gap-1 px-4 border-l border-cream-300 text-navy-700 hover:bg-cream-50 active:bg-cream-100 transition-colors cursor-pointer"
        >
          <BarChart3 size={18} />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Statistik</span>
          <ChevronRight size={16} className="text-navy-400" />
        </button>
      </div>
    </div>
  )
}
