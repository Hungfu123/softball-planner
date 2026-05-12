type Props = { present: number; total: number }

export function AttendanceCounter({ present, total }: Props) {
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100)
  return (
    <div className="bg-white border border-cream-300 rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl font-black text-navy-800 tabular-nums">
          {present} / {total}
        </span>
        <span className="font-display text-lg font-bold text-navy-600 tabular-nums">{percentage}%</span>
      </div>
      <div className="mt-3 h-2 bg-cream-200 rounded-full overflow-hidden">
        <div className="h-full bg-navy-700 transition-all duration-300" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
