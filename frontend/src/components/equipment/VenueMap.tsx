import { VENUE_ZONES as ZONES, TREES } from './venueLayout'

interface Props {
  /** Anzahl Sachen je Lagerort. */
  counts: Record<string, number>
  /** Aktuell gewählter Lagerort (Filter), oder null. */
  selected: string | null
  onSelect: (location: string | null) => void
}

export function VenueMap({ counts, selected, onSelect }: Props) {
  return (
    <div className="bg-cream-50 border border-cream-300 rounded-2xl p-3">
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
        <rect x="0" y="0" width="400" height="270" fill="#eaeede" />
        {TREES.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#9bb596" opacity="0.55" />
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
