/**
 * Lade-Zustand des Dashboards während die Spieltage einer Saison geladen werden.
 * Spiegelt die echte Layout-Silhouette (Hero-Card + Listen-Zeilen) wider, statt eines
 * generischen zentrierten Spinners — so springt das Layout beim Dateneintritt nicht.
 * Editorial-Sports-Card-Ästhetik: Navy-Hero mit rotem Stripe + Cream-Listen-Karten.
 */
export function DashboardLoading() {
  return (
    <div className="space-y-3 sm:space-y-4" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Spieltage werden geladen…</span>

      {/* Hero-Card-Silhouette */}
      <div className="rounded-2xl overflow-hidden shadow-lg shadow-navy-900/15">
        {/* Roter Stripe mit Label-Platzhalter */}
        <div className="bg-softball-red-600 px-4 py-1.5 flex items-center">
          <div className="skeleton-shimmer h-2.5 w-40 rounded-full bg-white/30" />
        </div>
        {/* Navy-Body */}
        <div className="bg-navy-900 px-3.5 py-2.5 sm:px-5 sm:py-4 md:py-5 space-y-2.5 sm:space-y-3">
          {/* Datum + Standort-Zeile */}
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton-shimmer h-7 sm:h-8 w-36 sm:w-52 rounded-md bg-white/15" />
            <div className="skeleton-shimmer h-3 w-20 rounded-full bg-white/10" />
          </div>
          {/* Game-Zeilen */}
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-2 sm:gap-2.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 sm:px-2.5 sm:py-2">
              <div className="skeleton-shimmer w-5 h-5 sm:w-6 sm:h-6 rounded bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton-shimmer h-3 w-32 sm:w-44 rounded-full bg-white/12" />
                <div className="skeleton-shimmer h-2 w-16 rounded-full bg-white/8" />
              </div>
              <div className="skeleton-shimmer h-6 w-14 rounded-md bg-white/8 shrink-0" />
            </div>
          ))}
          {/* CTA-Button-Platzhalter */}
          <div className="skeleton-shimmer h-9 sm:h-10 w-full rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Listen-Sektion: Label + Zeilen-Karten */}
      <div>
        <div className="px-1 mb-2">
          <div className="skeleton-shimmer h-3 w-24 rounded-full bg-cream-300" />
        </div>
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div key={i} className="rounded-xl border border-cream-300 bg-white p-4">
              <div className="skeleton-shimmer h-2.5 w-20 rounded-full bg-cream-300 mb-2" />
              <div className="skeleton-shimmer h-4 w-40 rounded-md bg-cream-200 mb-2" />
              <div className="skeleton-shimmer h-2.5 w-28 rounded-full bg-cream-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
