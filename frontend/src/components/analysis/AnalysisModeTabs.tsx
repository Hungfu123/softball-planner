import { sichtbareStatsView } from './statsView'
import { useRolle } from '@/hooks/useRolle'
import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

/**
 * Reiterzeile des ANALYSE-Punkts: welche Tabelle ich sehe. Schlagen und Einsätze sind
 * Ansichten von `/stats` (URL-Parameter `view`), Spiel-Verlauf und Gegner eigene Seiten.
 * NavLink prüft keine Suchparameter, deshalb wird der aktive Reiter hier selbst bestimmt.
 * Der Zeitraum ist bewusst kein Reiter — er filtert nur.
 *
 * <p>**Einsätze fehlt Spielern ganz** — die Begründung steht an `sichtbareStatsView`. Der
 * Reiter verschwindet UND die Ansicht fällt zurück auf Schlagen: ein weggelassener Reiter
 * allein wäre eine Attrappe, die URL steht jedem offen.
 */
export function AnalysisModeTabs({ trailing }: { trailing?: ReactNode } = {}) {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { istAdmin } = useRolle()

  const onStats = pathname === '/stats'
  const statsView = sichtbareStatsView(params.get('view'), istAdmin)

  // Auf /stats bleibt der gewählte Zeitraum beim Reiterwechsel erhalten.
  const statsHref = (view: 'batting' | 'games') => {
    const next = new URLSearchParams(onStats ? params : undefined)
    next.set('view', view)
    return `/stats?${next.toString()}`
  }

  const tabs = [
    { label: 'Schlagen', to: statsHref('batting'), active: onStats && statsView === 'batting', replace: onStats },
    ...(istAdmin
      ? [{ label: 'Einsätze', to: statsHref('games'), active: onStats && statsView === 'games', replace: onStats }]
      : []),
    { label: 'Spiel-Verlauf', to: '/teams/spiele', active: pathname === '/teams/spiele', replace: false },
    { label: 'Gegner', to: '/teams', active: pathname === '/teams', replace: false },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4 sm:border-b sm:border-cream-300">
    <nav className="flex overflow-x-auto max-w-full w-full sm:w-auto pb-px border-b border-cream-300 sm:border-b-0" aria-label="Analyse-Ansichten">
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
    {trailing && <div className="mt-3 sm:mt-0 min-w-0 max-w-full">{trailing}</div>}
    </div>
  )
}
