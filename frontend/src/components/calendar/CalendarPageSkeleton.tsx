/** Loading-Skeleton der Kalender-Seite: Monats-Grid-Silhouette + Agenda-Zeilen. */
export function CalendarPageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Kalender wird geladen…</span>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-7 w-40 rounded-md bg-cream-300" />
        <div className="skeleton-shimmer h-9 w-28 rounded-lg bg-cream-200" />
      </div>
      {/* Grid */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm shadow-navy-900/5 p-3">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-3 rounded bg-cream-200" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer aspect-square rounded-lg bg-cream-200" />
          ))}
        </div>
      </div>
      {/* Agenda */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm shadow-navy-900/5 p-3 flex items-center gap-3">
            <div className="skeleton-shimmer h-10 w-12 rounded-md bg-cream-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-3 w-24 rounded-full bg-cream-300" />
              <div className="skeleton-shimmer h-4 w-40 rounded-md bg-cream-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
