interface Props {
  /** Anzahl Sachen je Lagerort. */
  counts: Record<string, number>
  /** Aktuell gewählter Lagerort (Filter), oder null. */
  selected: string | null
  onSelect: (location: string | null) => void
}

/** Klickbare Lager-Zonen — Name = kanonischer Lagerort (muss zu storageLocation passen). */
interface Zone {
  name: string
  /** Kurzlabel falls der Name nicht in die Fläche passt. */
  short?: string
  /** SVG-Polygon-Punkte (grob proportional zum echten Gelände). */
  points: string
  /** Label-Anker. */
  lx: number
  ly: number
  /** Label-Schriftgröße. */
  fs?: number
}

// viewBox 0 0 380 240 — Flur als diagonaler Riegel oben (steigt nach rechts),
// West-Räume am SW-Ende, Halle darunter, Garage separat rechts, Laufbahn SE.
const ZONES: Zone[] = [
  { name: 'Flur', points: '60,56 270,22 278,52 68,86', lx: 178, ly: 44, fs: 11 },
  { name: 'Garage', points: '298,52 346,44 352,98 304,106', lx: 326, ly: 78, fs: 9 },
  { name: 'Halle', points: '92,104 226,96 234,182 100,190', lx: 165, ly: 146, fs: 12 },
  { name: 'Spint', points: '60,92 92,88 95,114 63,118', lx: 77, ly: 104, fs: 6 },
  { name: 'Geräteraum', short: 'Geräte', points: '96,88 150,82 153,108 99,114', lx: 124, ly: 100, fs: 6 },
  { name: 'Schrank', points: '154,82 184,78 187,104 157,108', lx: 170, ly: 96, fs: 5.5 },
]

export function VenueMap({ counts, selected, onSelect }: Props) {
  return (
    <div className="bg-cream-50 border border-cream-300 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-[11px] font-extrabold uppercase tracking-widest text-navy-900 inline-flex items-center gap-1.5">
          <span className="w-1 h-4 bg-softball-red-600 rounded-full shrink-0" /> Lageplan
        </span>
        {selected && (
          <button onClick={() => onSelect(null)}
            className="text-[11px] font-bold uppercase tracking-wider text-navy-700 hover:text-navy-900 hover:underline cursor-pointer">
            Alle anzeigen
          </button>
        )}
      </div>
      <svg viewBox="0 0 380 240" className="w-full h-auto" role="group" aria-label="Lageplan Gelände">
        {/* Laufbahn (Orientierung, nicht klickbar) */}
        <g fill="none" className="stroke-softball-red-500" strokeWidth="2.5" opacity="0.5">
          <path d="M 120 214 Q 250 250 392 196" />
          <path d="M 120 226 Q 250 264 392 210" />
        </g>
        <text x="298" y="232" fontSize="7" className="fill-softball-red-700 font-display uppercase tracking-widest" opacity="0.8">Laufbahn</text>

        {ZONES.map(z => {
          const active = selected === z.name
          const count = counts[z.name] ?? 0
          return (
            <g key={z.name} role="button" tabIndex={0}
              aria-label={`${z.name}${count ? `, ${count} Sachen` : ''}`}
              className="cursor-pointer"
              onClick={() => onSelect(active ? null : z.name)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(active ? null : z.name) } }}>
              <polygon points={z.points} strokeWidth="1.5"
                className={`transition-colors ${active ? 'fill-navy-800 stroke-navy-900' : 'fill-cream-100 stroke-navy-400 hover:fill-cream-200'}`} />
              <text x={z.lx} y={z.ly} fontSize={z.fs ?? 8} textAnchor="middle"
                className={`font-display font-bold uppercase tracking-wider pointer-events-none ${active ? 'fill-white' : 'fill-navy-800'}`}>
                {z.short ?? z.name}
              </text>
              {count > 0 && (
                <text x={z.lx} y={z.ly + (z.fs ?? 8) + 2} fontSize="6" textAnchor="middle"
                  className={`font-display font-bold tabular-nums pointer-events-none ${active ? 'fill-cream-200' : 'fill-softball-red-600'}`}>
                  {count}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <p className="text-[11px] text-gray-400 mt-1">Tipp auf ein Gebäude zeigt was dort liegt.</p>
    </div>
  )
}
