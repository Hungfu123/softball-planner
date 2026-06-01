/**
 * Lade-Zustand der Spielbogen-Detailseite (SpielbogenPage).
 * Spiegelt die echte Layout-Silhouette wider — Navy-Header, Live-State-Strip,
 * Score-Block, Side-Toggle, Diamond-Bereich und Batter-Card-Platzhalter.
 * Kein Layout-Jump beim Dateneintritt.
 */
export function SpielbogenPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-cream-50" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Spielbogen wird geladen…</span>

      {/* Nav-Header — Navy */}
      <header className="bg-navy-900 sticky top-0 z-50 shadow-md">
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
          {/* Zurück-Pfeil-Platzhalter */}
          <div className="skeleton-shimmer w-8 h-8 rounded-lg bg-white/10 shrink-0" />
          {/* Logo-Platzhalter */}
          <div className="skeleton-shimmer w-7 h-7 rounded bg-white/10 shrink-0" />
          <div className="flex-1" />
          {/* Toolbar-Buttons (Hilfe + Reset + Beenden) */}
          <div className="flex items-center gap-1">
            <div className="skeleton-shimmer h-7 w-14 rounded-lg bg-white/10" />
            <div className="skeleton-shimmer h-7 w-16 rounded-lg bg-white/10" />
            <div className="skeleton-shimmer h-7 w-20 rounded-lg bg-white/10" />
          </div>
        </div>
      </header>

      {/* Live-State-Strip — Inning + Outs */}
      <div className="bg-navy-900 px-4 py-2 flex items-center justify-between border-b-[3px] border-softball-red-600">
        <div className="flex items-center gap-2.5">
          <div className="skeleton-shimmer h-3 w-12 rounded-full bg-white/15" />
          <div className="skeleton-shimmer h-7 w-8 rounded-md bg-white/20" />
          <div className="skeleton-shimmer h-5 w-14 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-3 w-8 rounded-full bg-white/15" />
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>

      {/* Score-Block */}
      <div className="px-4 py-3 bg-cream-50 flex items-center justify-center gap-3 border-b border-cream-300">
        <div className="skeleton-shimmer h-4 w-20 rounded-full bg-cream-200" />
        <div className="skeleton-shimmer h-9 w-10 rounded-md bg-cream-200" />
        <div className="skeleton-shimmer h-6 w-4 rounded bg-cream-200" />
        <div className="skeleton-shimmer h-9 w-10 rounded-md bg-cream-200" />
        <div className="skeleton-shimmer h-4 w-20 rounded-full bg-cream-200" />
        <div className="skeleton-shimmer w-6 h-6 rounded bg-cream-200" />
      </div>

      {/* Side-Toggle-Platzhalter */}
      <div className="px-4 py-2 flex items-center gap-2">
        <div className="skeleton-shimmer flex-1 h-10 rounded-xl bg-cream-200" />
        <div className="skeleton-shimmer flex-1 h-10 rounded-xl bg-cream-200" />
      </div>

      {/* Diamond-Bereich: kleines Quadrat als Silhouette */}
      <div className="flex justify-center px-4 py-4">
        <div className="skeleton-shimmer w-52 h-52 sm:w-64 sm:h-64 rounded-2xl bg-cream-200" />
      </div>

      {/* Batter-Card-Platzhalter */}
      <div className="mx-4 mb-3 rounded-xl border border-cream-300 bg-white p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer w-7 h-7 rounded-full bg-cream-200 shrink-0" />
          <div className="skeleton-shimmer h-5 w-32 rounded-md bg-cream-200" />
          <div className="flex-1" />
          <div className="skeleton-shimmer h-4 w-16 rounded-full bg-cream-200" />
        </div>
        {/* Upcoming-Batters mini-row */}
        <div className="flex gap-2 mt-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton-shimmer h-6 w-20 rounded-lg bg-cream-200" />
          ))}
        </div>
      </div>

      {/* Action-Buttons-Bereich — Platzhalter-Grid */}
      <div className="mx-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-12 rounded-xl bg-cream-200" />
        ))}
      </div>
    </div>
  )
}
