type Props = { present: number; total: number }

export function AttendanceCounter({ present }: Props) {
  return (
    <div className="bg-white border border-cream-300 rounded-2xl px-4 py-3 shadow-sm flex items-baseline gap-2 h-full">
      <span className="font-display text-5xl font-black text-navy-800 tabular-nums leading-none">
        {present}
      </span>
      <span className="font-display text-sm font-bold uppercase tracking-wider text-navy-500">
        Anwesend
      </span>
    </div>
  )
}
