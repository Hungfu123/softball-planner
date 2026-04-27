interface Props {
  variant?: 'dots' | 'list' | 'card' | 'table'
  rows?: number
  className?: string
}

/**
 * Einheitliches Loading-Feedback — drei Varianten, gleicher Style.
 * dots  → kompakter Bouncing-Indikator (für Suspense, kleine Bereiche)
 * list  → Skeleton-Zeilen für Listen (z.B. Spieler, GameDays)
 * card  → Skeleton-Block für Karten-Grids
 * table → Tabellen-Skeleton mit Header + Rows
 */
export function LoadingSkeleton({ variant = 'dots', rows = 5, className = '' }: Props) {
  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`} role="status" aria-label="Lade Daten">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-12 bg-cream-200 rounded-lg" />
        ))}
      </div>
    )
  }
  if (variant === 'card') {
    return (
      <div className={`skeleton-shimmer bg-cream-200 rounded-xl h-40 ${className}`} role="status" aria-label="Lade Daten" />
    )
  }
  if (variant === 'table') {
    return (
      <div className={`bg-white border border-cream-300 rounded-xl overflow-hidden ${className}`} role="status" aria-label="Lade Daten">
        <div className="h-10 bg-navy-900" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 border-t border-cream-200 flex items-center px-3">
            <div className="skeleton-shimmer h-4 w-1/3 bg-cream-200 rounded" />
          </div>
        ))}
      </div>
    )
  }
  // dots default
  return (
    <div className={`py-12 flex flex-col items-center gap-4 ${className}`} role="status" aria-label="Lade Daten">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-navy-600 animate-[bounce_0.6s_ease-in-out_infinite]" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-600 animate-[bounce_0.6s_ease-in-out_0.15s_infinite]" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-600 animate-[bounce_0.6s_ease-in-out_0.3s_infinite]" />
      </div>
      <span className="text-sm text-gray-400">Laden...</span>
    </div>
  )
}
