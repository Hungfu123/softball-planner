import { Link, useLocation } from 'react-router-dom'

const ITEMS: { path: string; label: string }[] = [
  { path: '/players', label: 'Spieler' },
  { path: '/stats', label: 'Statistik' },
]

/**
 * Chrome-Leiste (nicht Content) für den zusammengefassten "Kader"-Nav-Tab (Spieler + Statistik).
 * Bewusst außerhalb der Seiten-Inhalte in Layout.tsx gerendert — beide Seiten haben selbst schon
 * navy/rote Pill- bzw. Unterstrich-Tabs (Spieler-Tabs, Schlagen/Einsätze); als Content-Element würde
 * dieser Umschalter optisch mit denen konkurrieren. Als Chrome direkt unter dem Header liest er sich
 * eindeutig als "welche Seite", nicht als weiterer Content-Filter — navy statt rot, kein Pill-Fill.
 */
export function KaderPageSwitch() {
  const location = useLocation()

  return (
    <div className="bg-white border-b border-cream-300 no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex gap-4" role="tablist" aria-label="Kader-Bereich">
        {ITEMS.map(item => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              role="tab"
              aria-selected={active}
              className={`font-display py-2 text-xs font-bold tracking-widest uppercase cursor-pointer border-b-2 -mb-px transition-colors ${
                active ? 'border-navy-900 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-700'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
