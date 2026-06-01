/**
 * Lade-Skeleton für den Trainingsplan-Bereich.
 * Spiegelt das echte Layout wider (Titel/Meta-Zeile + ~3 Sektionsblöcke mit Drill-Zeilen),
 * damit kein Layout-Sprung entsteht, wenn der Plan geladen wird.
 * Folgt der Dashboard-Skeleton-Konvention: skeleton-shimmer + bg-cream-200/bg-navy-100.
 */
export function TrainingPlanSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Trainingsplan wird geladen…</span>

      {/* Header: Titel + Menü-Platzhalter */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="skeleton-shimmer h-3 w-28 rounded-full bg-navy-100" />
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-3 w-12 rounded-full bg-cream-200" />
          <div className="skeleton-shimmer h-3 w-16 rounded-full bg-cream-200" />
          <div className="skeleton-shimmer h-6 w-6 rounded-md bg-cream-200" />
        </div>
      </div>

      {/* Meta-Zeile: Gesamtdauer + Anzahl Blöcke */}
      <div className="skeleton-shimmer h-2.5 w-32 rounded-full bg-cream-200 mb-3" />

      {/* Sektionsblöcke */}
      <div className="space-y-1.5">
        {/* Block 1: Aufwärmen — 2 Drill-Zeilen */}
        <div className="bg-cream-100 border border-cream-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="skeleton-shimmer w-5 h-5 rounded-full bg-cream-300 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-2 w-14 rounded-full bg-cream-300" />
              <div className="skeleton-shimmer h-3.5 w-40 rounded-md bg-cream-200" />
            </div>
            <div className="skeleton-shimmer h-6 w-14 rounded-md bg-cream-200 shrink-0" />
          </div>
        </div>

        {/* Block 2: Drill-Sektion — 3 Drill-Zeilen */}
        <div className="bg-navy-50 border border-navy-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="skeleton-shimmer w-5 h-5 rounded-full bg-navy-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-2 w-10 rounded-full bg-navy-100" />
              <div className="skeleton-shimmer h-3.5 w-52 rounded-md bg-navy-100" />
            </div>
            <div className="skeleton-shimmer h-6 w-14 rounded-md bg-navy-100 shrink-0" />
          </div>
        </div>

        <div className="bg-navy-50 border border-navy-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="skeleton-shimmer w-5 h-5 rounded-full bg-navy-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-2 w-10 rounded-full bg-navy-100" />
              <div className="skeleton-shimmer h-3.5 w-36 rounded-md bg-navy-100" />
            </div>
            <div className="skeleton-shimmer h-6 w-14 rounded-md bg-navy-100 shrink-0" />
          </div>
        </div>

        {/* Block 3: Pause */}
        <div className="bg-cream-100 border border-cream-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="skeleton-shimmer w-5 h-5 rounded-full bg-cream-300 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-2 w-12 rounded-full bg-cream-300" />
              <div className="skeleton-shimmer h-3.5 w-24 rounded-md bg-cream-200" />
            </div>
            <div className="skeleton-shimmer h-6 w-14 rounded-md bg-cream-200 shrink-0" />
          </div>
        </div>

        {/* Block 4: weiterer Drill */}
        <div className="bg-navy-50 border border-navy-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="skeleton-shimmer w-5 h-5 rounded-full bg-navy-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-2 w-10 rounded-full bg-navy-100" />
              <div className="skeleton-shimmer h-3.5 w-44 rounded-md bg-navy-100" />
            </div>
            <div className="skeleton-shimmer h-6 w-14 rounded-md bg-navy-100 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}
