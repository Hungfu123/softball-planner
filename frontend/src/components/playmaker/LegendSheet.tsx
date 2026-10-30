import { createPortal } from 'react-dom'
import { FARBE } from './board/farben'

/**
 * Was die Formen bedeuten.
 *
 * Ein Spieler sieht das Board zum ersten Mal ohne den Trainer daneben. Verteidiger und
 * Runner sind beide Scheiben und unterscheiden sich durch drei Dinge gleichzeitig: Farbe,
 * Groesse und das Kuerzel, das nur der Verteidiger traegt. Der Ball ist deutlich kleiner —
 * Rot und Gelb messen zueinander nur 2,17 und fallen bei Gruenblindheit auf 2,00, Groesse
 * ist hier also kein Schmuck.
 */
export function LegendSheet({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-cream-50/12 bg-navy-900 p-5 text-cream-50 sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-headline text-xl font-extrabold uppercase tracking-wide text-amber-400">Legende</h2>
        <ul className="mt-4 space-y-3 text-sm text-cream-50/85">
          <Zeile beschreibung="Verteidiger, mit Positionskürzel">
            <circle cx="14" cy="14" r="11" fill={FARBE.hell} />
            <text x="14" y="17.5" textAnchor="middle" fill={FARBE.grund} fontSize="8" fontWeight="700">
              SS
            </text>
          </Zeile>
          <Zeile beschreibung="Runner — kleiner als ein Verteidiger und ohne Kürzel">
            <circle cx="14" cy="14" r="9" fill={FARBE.gut} />
          </Zeile>
          <Zeile beschreibung="Out: derselbe Runner, durchgestrichen">
            <circle cx="14" cy="14" r="9" fill={FARBE.raus} />
            <path d="M8,8 L20,20 M20,8 L8,20" stroke={FARBE.hell} strokeWidth="2.4" strokeLinecap="round" />
          </Zeile>
          <Zeile beschreibung="Ball">
            <circle cx="14" cy="14" r="6" fill={FARBE.hell} />
            <circle cx="14" cy="14" r="3.7" fill="none" stroke={FARBE.naht} strokeWidth="2" />
          </Zeile>
          <Zeile beschreibung="Flugbahn des Balls">
            <path d="M2,14 L26,14" stroke={FARBE.hell} strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
          </Zeile>
          <Zeile beschreibung="Blass: der Wurf davor — bei Cut-off-Ketten ist die Kette der Inhalt">
            <path
              d="M2,14 L26,14"
              stroke={FARBE.hell}
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
          className="mt-5 h-11 w-full rounded-xl bg-amber-400 font-display text-sm font-bold text-navy-900 active:brightness-110"
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
