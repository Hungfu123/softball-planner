import { Loader2 } from 'lucide-react'

interface Props {
  variant?: 'dots' | 'list' | 'card' | 'table' | 'ball' | 'inline'
  rows?: number
  className?: string
  /** Was genau laedt — fuer Screenreader. Vorgabe: „Lade Daten". */
  label?: string
}

/** Inline-Spinner für Buttons/kleine Bereiche — Lucide Loader2 (generic, wartungsarm) */
export function InlineSpinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />
}

/**
 * Brand-Loading-Spinner: rotierender Softball mit roten Stitches.
 * Stadium-Pocket-Pattern statt generic Spinner.
 */
function SoftballSpinner({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="animate-[spin_1.2s_linear_infinite] drop-shadow-sm"
      aria-hidden="true"
    >
      {/* Ball body */}
      <circle cx="50" cy="50" r="44" fill="#FFFBF3" stroke="#E8DEC5" strokeWidth="1.5" />
      {/* Stitches — left curve */}
      <path
        d="M 18 35 Q 50 50, 18 65"
        stroke="#CC2936"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="4 3"
      />
      {/* Stitches — right curve */}
      <path
        d="M 82 35 Q 50 50, 82 65"
        stroke="#CC2936"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="4 3"
      />
      {/* Subtle highlight */}
      <ellipse cx="38" cy="35" rx="10" ry="6" fill="#fff" opacity="0.5" />
    </svg>
  )
}

/**
 * Ein Platzhalterbalken — die Grundform jedes Skeletons.
 *
 * `bar-track` ist die Rolle „Rinne": da liegt noch nichts. Genau das ist ein Skeleton, und
 * im Dunkeln geht die Rinne nach UNTEN statt nach oben — eine helle Flaeche waere dort ein
 * Block, kein fehlender Inhalt.
 */
export function Platzhalter({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer bg-bar-track rounded ${className}`} aria-hidden="true" />
}

/**
 * Einheitliches Loading-Feedback.
 * dots → kompakter Bouncing-Indikator (für Suspense, kleine Bereiche)
 * list → Skeleton-Zeilen für Listen
 * card → Skeleton-Block für Karten-Grids
 * table → Tabellen-Skeleton mit Header + Rows
 * ball → Brand-Softball-Spinner (für Page-Loads / wichtige Wartemomente)
 */
export function LoadingSkeleton({ variant = 'dots', rows = 5, className = '', label = 'Lade Daten' }: Props) {
  if (variant === 'inline') {
    return <InlineSpinner className={className} />
  }
  if (variant === 'ball') {
    return (
      <div className={`py-12 flex flex-col items-center gap-3 ${className}`} role="status" aria-label={label}>
        <SoftballSpinner size={56} />
        <span className="font-display text-[11px] tracking-widest uppercase font-bold text-ink-faint">Laden</span>
      </div>
    )
  }
  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`} role="status" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <Platzhalter key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  }
  if (variant === 'card') {
    return (
      <Platzhalter className={`rounded-xl h-40 ${className}`} />
    )
  }
  if (variant === 'table') {
    return (
      <div className={`bg-surface-raised border border-line rounded-xl overflow-hidden ${className}`} role="status" aria-label={label}>
        <div className="h-10 bg-band" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 border-t border-line flex items-center px-3">
            <Platzhalter className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    )
  }
  // dots default — Brand-Softball
  return (
    <div className={`py-12 flex flex-col items-center gap-3 ${className}`} role="status" aria-label={label}>
      <SoftballSpinner size={48} />
      <span className="font-display text-[11px] tracking-widest uppercase font-bold text-ink-faint">Laden</span>
    </div>
  )
}
