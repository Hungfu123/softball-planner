/**
 * Lade-Zustand des PlayerManagers — spiegelt die echte Layout-Silhouette wider:
 * Titel-Zeile + Tab-Bar + Eingabe-Bereich + Liste mit ~8 Spieler-Zeilen.
 * Kein Layout-Sprung beim Dateneintritt.
 */
export function PlayerManagerSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4 space-y-4">
        <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
          <span className="sr-only">Spieler werden geladen…</span>

          {/* Titel-Zeile */}
          <div className="flex items-baseline justify-between">
            <div className="skeleton-shimmer h-7 w-32 rounded-md bg-cream-300" />
          </div>

          {/* Tab-Bar-Silhouette */}
          <div className="inline-flex bg-cream-200 rounded-lg p-0.5 w-full gap-0.5">
            <div className="skeleton-shimmer flex-1 h-9 rounded-md bg-navy-100" />
            <div className="skeleton-shimmer flex-1 h-9 rounded-md bg-cream-200" />
          </div>

          {/* Eingabe-Zeile: Textfeld + Button */}
          <div className="flex gap-2">
            <div className="skeleton-shimmer flex-1 h-10 rounded-lg bg-cream-200" />
            <div className="skeleton-shimmer w-32 h-10 rounded-lg bg-cream-300" />
          </div>

          {/* Spieler-Liste */}
          <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0"
              >
                {/* Name-Bar */}
                <div
                  className={`skeleton-shimmer h-4 rounded-full bg-cream-200 flex-1 ${
                    i % 3 === 0 ? 'max-w-[10rem]' : i % 3 === 1 ? 'max-w-[8rem]' : 'max-w-[12rem]'
                  }`}
                />
                {/* Action-Icon-Platzhalter */}
                <div className="flex gap-1 shrink-0">
                  <div className="skeleton-shimmer w-8 h-8 rounded-lg bg-cream-200" />
                  <div className="skeleton-shimmer w-8 h-8 rounded-lg bg-cream-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
