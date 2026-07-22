/**
 * Lade-Zustand der Spielbogen-Liste.
 * Spiegelt die echte Layout-Silhouette (Header + Karten-Zeilen) wider — kein Layout-Jump.
 * Struktur: Seitentitel + "Neuer Spielbogen"-Button-Platzhalter + 6 BogenTile-Silhouetten.
 */
export function SpielbogenListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Spielbogen werden geladen…</span>

      {/* Header: Titel + Button-Platzhalter */}
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-7 w-36 rounded-md bg-navy-100" />
        <div className="skeleton-shimmer h-9 w-36 rounded-lg bg-navy-100" />
      </div>

      {/* BogenTile-Silhouetten */}
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-cream-50 border border-cream-300 rounded-2xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                {/* Status-Pill + Datum */}
                <div className="flex items-center gap-2">
                  <div className="skeleton-shimmer h-4 w-16 rounded-full bg-cream-200" />
                  <div className="skeleton-shimmer h-3 w-28 rounded-full bg-cream-200" />
                </div>
                {/* Team-Namen-Zeile */}
                <div className="skeleton-shimmer h-5 w-56 rounded-md bg-cream-200" />
              </div>
              {/* Hover-Action-Platzhalter (Pencil + Trash) */}
              <div className="skeleton-shimmer h-7 w-7 rounded bg-cream-200 shrink-0" />
              <div className="skeleton-shimmer h-7 w-7 rounded bg-cream-200 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
