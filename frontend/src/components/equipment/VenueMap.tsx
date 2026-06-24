interface Props {
  /** Anzahl Sachen je Lagerort. */
  counts: Record<string, number>
  /** Aktuell gewählter Lagerort (Filter), oder null. */
  selected: string | null
  onSelect: (location: string | null) => void
}

/** Klickbare Lager-Zone — Name = kanonischer Lagerort (muss zu storageLocation passen). */
interface Zone {
  name: string
  short?: string
  x: number; y: number; w: number; h: number
  /** Label-Anker (sonst Zellmitte). */
  lx?: number; ly?: number
  fs?: number
  /** Verschachtelt (kleiner, dünnere Linie, oben gezeichnet). */
  inner?: boolean
  /** Label um 90° gedreht (für hohe schmale Räume). */
  vertical?: boolean
}

// Zusammenhängender Grundriss (ungedreht), Kanten geteilt = verbunden.
// Flur (langer Riegel oben) · darunter links Geräteraum (Raum) mit Spint+Schrank DRIN ·
// darunter rechts Halle · Garage separat rechts. Komplex wird leicht gedreht (Luftbild).
const ZONES: Zone[] = [
  // Geräteraum: Raum NEBEN dem Flur (links im Top-Riegel); Spint+Schrank DRIN.
  { name: 'Geräteraum', x: 44, y: 40, w: 92, h: 58, lx: 92, ly: 45, fs: 6 },
  // Flur = dünner Rand-Streifen oben über volle Breite (auch über Halle + Garage)
  { name: 'Flur', x: 136, y: 40, w: 246, h: 28, lx: 214, ly: 54, fs: 11 },
  { name: 'Halle', x: 136, y: 68, w: 160, h: 108, lx: 216, ly: 124, fs: 13 },
  // Garage rechts, so hoch wie Halle, große Lücke dazwischen
  { name: 'Garage', x: 328, y: 68, w: 54, h: 108, lx: 355, ly: 124, fs: 9 },
  // innen im Geräteraum: Spint oben-links (klein), Schrank rechts klein (Durchgang frei)
  { name: 'Spint', x: 48, y: 48, w: 24, h: 14, lx: 60, ly: 56, fs: 4.5, inner: true },
  { name: 'Schrank', x: 108, y: 52, w: 17, h: 32, lx: 116, ly: 68, fs: 4.5, inner: true, vertical: true },
]

const TREES: [number, number, number][] = [
  [18, 116, 7], [12, 136, 5], [26, 150, 5],
  [28, 232, 7], [50, 246, 5], [14, 250, 4],
  [364, 150, 7], [378, 170, 5], [356, 186, 5],
  [150, 250, 5], [184, 256, 4], [118, 252, 4],
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
      <svg viewBox="0 0 400 270" className="w-full h-auto rounded-lg" role="group" aria-label="Lageplan Gelände">
        {/* Boden (Grün) für Kontrast */}
        <rect x="0" y="0" width="400" height="270" fill="#e7eedd" />
        {TREES.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#8fae8b" opacity="0.7" />
        ))}
        {/* Weg (gestrichelt) */}
        <path d="M 24 258 Q 110 244 196 252" fill="none" stroke="#c2b79c" strokeWidth="2.5" strokeDasharray="3 4" />

        {/* Laufbahn — Süden, gebogen */}
        <g fill="none" className="stroke-softball-red-500" strokeWidth="3.5" opacity="0.55">
          <path d="M 96 250 Q 250 206 392 244" />
          <path d="M 100 263 Q 250 222 392 257" />
        </g>
        <text x="300" y="240" fontSize="7" className="fill-softball-red-700 font-display uppercase tracking-widest" opacity="0.9">Laufbahn</text>

        {/* Gebäude-Komplex (zusammenhängend), leicht gedreht */}
        <g transform="rotate(-7 200 110)">
          {/* Halle-Dach Sägezahn (x136..296, y68..176) */}
          <g className="stroke-navy-300" strokeWidth="0.8" opacity="0.7">
            <line x1="160" y1="68" x2="146" y2="176" />
            <line x1="190" y1="68" x2="176" y2="176" />
            <line x1="220" y1="68" x2="206" y2="176" />
            <line x1="250" y1="68" x2="236" y2="176" />
            <line x1="280" y1="68" x2="266" y2="176" />
          </g>

          {ZONES.map(z => {
            const active = selected === z.name
            const count = counts[z.name] ?? 0
            const lx = z.lx ?? z.x + z.w / 2
            const ly = z.ly ?? z.y + z.h / 2
            return (
              <g key={z.name} role="button" tabIndex={0}
                aria-label={`${z.name}${count ? `, ${count} Sachen` : ''}`}
                className="cursor-pointer"
                onClick={() => onSelect(active ? null : z.name)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(active ? null : z.name) } }}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h}
                  strokeWidth={z.inner ? 1.3 : 2}
                  className={`transition-colors ${active
                    ? 'fill-navy-800 stroke-navy-900'
                    : z.inner
                      ? 'fill-cream-100 stroke-navy-600 hover:fill-cream-200'
                      : 'fill-white stroke-navy-700 hover:fill-cream-100'}`} />
                <text x={lx} y={ly} fontSize={z.fs ?? 8} textAnchor="middle" dominantBaseline="middle"
                  transform={z.vertical ? `rotate(-90 ${lx} ${ly})` : undefined}
                  className={`font-display font-bold uppercase tracking-wider pointer-events-none ${active ? 'fill-white' : 'fill-navy-800'}`}>
                  {z.short ?? z.name}
                </text>
                {count > 0 && (
                  <text x={lx} y={ly + (z.fs ?? 8)} fontSize="6" textAnchor="middle"
                    className={`font-display font-bold tabular-nums pointer-events-none ${active ? 'fill-cream-200' : 'fill-softball-red-600'}`}>
                    {count}
                  </text>
                )}
              </g>
            )
          })}

          {/* Eingänge (Pfeile): Flur (von Süden) + Garage (von Westen) */}
          <g className="stroke-navy-700 fill-navy-700" strokeWidth="1.6">
            <line x1="310" y1="92" x2="310" y2="72" />
            <polygon points="310,66 306,74 314,74" stroke="none" />
            <line x1="316" y1="118" x2="326" y2="118" />
            <polygon points="331,118 323,114 323,122" stroke="none" />
          </g>
        </g>
      </svg>
      <p className="text-[11px] text-gray-400 mt-1">Tipp auf ein Gebäude zeigt was dort liegt.</p>
    </div>
  )
}
