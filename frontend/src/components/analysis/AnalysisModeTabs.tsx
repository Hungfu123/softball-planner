import { NavLink } from 'react-router-dom'

/**
 * Modus-Umschalter innerhalb des ANALYSE-Punkts: eigene Statistik, eigener Spiel-Verlauf
 * und Gegner-Verzeichnis. Alle drei Ansichten gehören thematisch zusammen — der Nav-Punkt
 * heißt bewusst nicht mehr "Gegner" und auch nicht "Statistik".
 */
export function AnalysisModeTabs() {
  const tabCls = ({ isActive }: { isActive: boolean }) =>
    `font-display text-[11px] font-bold tracking-widest uppercase rounded-full px-4 py-1.5 transition-colors cursor-pointer ${
      isActive ? 'bg-navy-800 text-white' : 'border border-cream-300 text-gray-600 hover:bg-cream-100'
    }`
  return (
    <nav className="flex gap-2 mb-4" aria-label="Analyse-Ansichten">
      <NavLink to="/stats" className={tabCls}>Statistik</NavLink>
      <NavLink to="/teams/spiele" className={tabCls}>Spiel-Verlauf</NavLink>
      <NavLink to="/teams" end className={tabCls}>Gegner</NavLink>
    </nav>
  )
}
