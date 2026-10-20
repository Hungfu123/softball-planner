import { createPortal } from 'react-dom'

/**
 * Was die Formen bedeuten.
 *
 * Ein Spieler sieht das Board zum ersten Mal ohne den Trainer daneben. Form traegt die
 * Bedeutung, Farbe verstaerkt sie nur — Rot und Gelb messen zueinander 2,17 und fallen bei
 * Gruenblindheit auf 2,00, deshalb ist Punkt gegen Raute keine Spielerei.
 */
export function LegendSheet({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-cream-50 p-5 sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-headline text-xl font-extrabold uppercase tracking-wide text-navy-900">Legende</h2>
        <ul className="mt-4 space-y-3 text-sm text-navy-900">
          <Zeile beschreibung="Verteidiger, mit Positionskürzel">
            <circle cx="14" cy="14" r="11" fill="#10133F" />
            <text x="14" y="17.5" textAnchor="middle" fill="#FBF6EC" fontSize="8" fontWeight="700">
              SS
            </text>
          </Zeile>
          <Zeile beschreibung="Runner">
            <rect x="6" y="6" width="16" height="16" rx="2" transform="rotate(45 14 14)" fill="#B91C2A" />
          </Zeile>
          <Zeile beschreibung="Ball">
            <circle cx="14" cy="14" r="6" fill="#E6F03C" />
          </Zeile>
          <Zeile beschreibung="Flugbahn des Balls">
            <path d="M2,14 L26,14" stroke="#E6F03C" strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
          </Zeile>
          <Zeile beschreibung="Laufweg des Runners">
            <path d="M2,14 L26,14" stroke="#B91C2A" strokeWidth="3" strokeLinecap="round" />
          </Zeile>
          <Zeile beschreibung="Blass: der Wurf davor — bei Cut-off-Ketten ist die Kette der Inhalt">
            <path
              d="M2,14 L26,14"
              stroke="#E6F03C"
              strokeWidth="3"
              strokeDasharray="5 4"
              strokeLinecap="round"
              opacity="0.35"
            />
          </Zeile>
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl bg-navy-800 font-display text-sm font-bold text-cream-50"
        >
          Schließen
        </button>
      </div>
    </div>,
    document.body,
  )
}

function Zeile({ children, beschreibung }: { children: React.ReactNode; beschreibung: string }) {
  return (
    <li className="flex items-center gap-3">
      <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0">
        {children}
      </svg>
      <span>{beschreibung}</span>
    </li>
  )
}
