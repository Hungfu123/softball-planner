import { useAuth } from '@/components/auth/AuthProvider'
import { Dashboard } from './Dashboard'
import { PlayerDashboard } from './PlayerDashboard'

/** `/` ist für Spieler ihre eigene Seite; wer unbekannt ist (me null) bekommt wie überall sonst die volle. */
export function Startseite() {
  const { me } = useAuth()
  return me?.role === 'PLAYER' ? <PlayerDashboard /> : <Dashboard />
}
