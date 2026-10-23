import { Link, useLocation, useSearchParams } from 'react-router-dom'

/**
 * Reiterzeile des ANALYSE-Punkts: welche Tabelle ich sehe. Schlagen und Einsätze sind
 * Ansichten von `/stats` (URL-Parameter `view`), Spiel-Verlauf und Gegner eigene Seiten.
 * NavLink prüft keine Suchparameter, deshalb wird der aktive Reiter hier selbst bestimmt.
 * Der Zeitraum ist bewusst kein Reiter — er filtert nur.
 */
export function AnalysisModeTabs() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()

  const onStats = pathname === '/stats'
  const statsView = params.get('view') === 'games' ? 'games' : 'batting'

  // Auf /stats bleibt der gewählte Zeitraum beim Reiterwechsel erhalten.
  const statsHref = (view: 'batting' | 'games') => {
    const next = new URLSearchParams(onStats ? params : undefined)
    next.set('view', view)
    return `/stats?${next.toString()}`
  }

  const tabs = [
    { label: 'Schlagen', to: statsHref('batting'), active: onStats && statsView === 'batting', replace: onStats },
    { label: 'Einsätze', to: statsHref('games'), active: onStats && statsView === 'games', replace: onStats },
    { label: 'Spiel-Verlauf', to: '/teams/spiele', active: pathname === '/teams/spiele', replace: false },
    { label: 'Gegner', to: '/teams', active: pathname === '/teams', replace: false },
  ]

  return (
    <nav
      className="flex overflow-x-auto border-b border-cream-300 mb-4"
      aria-label="Analyse-Ansichten"
    >
      {tabs.map(t => (
        <Link
          key={t.label}
          to={t.to}
          replace={t.replace}
          aria-current={t.active ? 'page' : undefined}
          className={`font-display shrink-0 inline-flex items-center justify-center min-h-11 px-4 text-xs font-bold tracking-widest uppercase cursor-pointer border-b-2 -mb-px transition-[color,transform] active:scale-[0.97] ${
            t.active
              ? 'border-softball-red-600 text-softball-red-700'
              : 'border-transparent text-gray-500 hover:text-navy-900'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
