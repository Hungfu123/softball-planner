/**
 * Lade-Silhouette für den GameDay-/Lineup-Planer.
 * Spiegelt die echte Layout-Struktur wider (Header, Game-Tabs, Lineup-Zeilen,
 * Coach/Bench-Block), statt eines generischen zentrierten Spinners.
 * Kein Layout-Sprung wenn die echten Daten ankommen.
 */
export function GameDayPlannerSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Lineup wird geladen…</span>

      {/* Header — Datum/Label + Button-Leiste */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Titel + Standort */}
          <div className="space-y-1.5">
            <div className="skeleton-shimmer h-7 w-56 rounded-md bg-cream-200" />
            <div className="skeleton-shimmer h-3 w-28 rounded-full bg-cream-200" />
          </div>
          {/* Right: Button-Gruppe */}
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-9 w-32 rounded-lg bg-cream-200" />
              <div className="skeleton-shimmer h-9 w-28 rounded-lg bg-cream-200" />
            </div>
            <div className="flex items-center gap-1 pt-1.5 border-t border-cream-200">
              {[56, 48, 64, 40].map((w, i) => (
                <div key={i} className={`skeleton-shimmer h-6 rounded-lg bg-cream-200`} style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game-Tabs — Reihe von Chip-Platzhaltern */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm px-2 sm:px-4 pt-2 pb-3">
        <div className="flex items-center gap-2">
          {[96, 80, 80].map((w, i) => (
            <div key={i} className={`skeleton-shimmer h-8 rounded-lg bg-cream-200`} style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>

      {/* Lineup/Feld Toggle (mobile) */}
      <div className="flex bg-cream-100 border border-cream-300 rounded-lg p-0.5 xl:hidden max-w-md">
        <div className="skeleton-shimmer flex-1 h-9 rounded-md bg-cream-200" />
        <div className="flex-1 h-9 rounded-md" />
      </div>

      {/* Haupt-Grid — 1 Spalte (mobile), 3 Spalten (lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr_3fr] gap-4 lg:gap-5">

        {/* Col 1: Lineup-Liste */}
        <div className="space-y-3">
          {/* Lineup-Header (Titel + kleine Aktions-Chips) */}
          <div className="flex items-center justify-between">
            <div className="skeleton-shimmer h-4 w-20 rounded-full bg-cream-300" />
            <div className="flex gap-1.5">
              <div className="skeleton-shimmer h-6 w-12 rounded-lg bg-cream-200" />
              <div className="skeleton-shimmer h-6 w-12 rounded-lg bg-cream-200" />
            </div>
          </div>

          {/* Lineup-Zeilen: Nummer + Name + Position */}
          <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 border-b border-cream-200 last:border-b-0"
              >
                {/* Batting-Order-Nummer */}
                <div className="skeleton-shimmer w-6 h-6 rounded bg-cream-200 shrink-0" />
                {/* Spieler-Name */}
                <div className={`skeleton-shimmer h-3.5 rounded-full bg-cream-200 flex-1`} style={{ maxWidth: `${120 + (i % 3) * 32}px` }} />
                {/* Position-Badge */}
                <div className="skeleton-shimmer h-6 w-10 rounded-md bg-cream-200 shrink-0 ml-auto" />
              </div>
            ))}
          </div>

          {/* Save-Button (desktop) */}
          <div className="skeleton-shimmer h-10 w-32 rounded-xl bg-cream-200 hidden lg:block" />
        </div>

        {/* Col 2: Pool/Bench (mobile/lg) */}
        <div className="space-y-4">
          {/* Spieler-Pool Header */}
          <div className="flex items-center gap-2 pb-1.5 border-b border-cream-200">
            <div className="skeleton-shimmer h-3.5 w-24 rounded-full bg-cream-300" />
          </div>
          {/* Pool-Zeilen */}
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg"
              >
                <div className={`skeleton-shimmer h-3 rounded-full bg-cream-200 flex-1`} style={{ maxWidth: `${100 + (i % 4) * 20}px` }} />
                <div className="skeleton-shimmer h-5 w-8 rounded bg-cream-200 shrink-0 ml-auto" />
              </div>
            ))}
          </div>

          {/* Bench-Block */}
          <div className="space-y-2">
            <div className="skeleton-shimmer h-3.5 w-16 rounded-full bg-cream-300" />
            <div className="flex flex-wrap gap-1.5">
              {[48, 56, 40, 64, 52].map((w, i) => (
                <div key={i} className={`skeleton-shimmer h-6 rounded-full bg-cream-200`} style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Coach-Slots + Training (lg, hidden on mobile) */}
        <div className="hidden lg:block space-y-4">
          {/* Coach-Slots */}
          <div className="bg-cream-50 border border-cream-300 rounded-xl p-3 space-y-2">
            <div className="skeleton-shimmer h-3.5 w-28 rounded-full bg-cream-300 mb-3" />
            {[0, 1].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="skeleton-shimmer h-3 w-12 rounded-full bg-cream-200" />
                <div className="skeleton-shimmer h-7 flex-1 rounded-lg bg-cream-200" />
              </div>
            ))}
          </div>

          {/* Training-Stats */}
          <div className="space-y-2">
            <div className="skeleton-shimmer h-3.5 w-20 rounded-full bg-cream-300" />
            <div className="bg-cream-50 border border-cream-300 rounded-xl p-3 space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="skeleton-shimmer h-2.5 w-14 rounded-full bg-cream-200" />
                  <div className={`skeleton-shimmer h-4 flex-1 rounded-full bg-cream-200`} />
                  <div className="skeleton-shimmer h-2.5 w-5 rounded-full bg-cream-200 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
