import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { CrossBones } from '@/icons'
import { Dashboard } from './Dashboard'
import { PlayerDashboard } from './PlayerDashboard'

/**
 * `/` ist für Spieler ihre eigene Seite. Ist die Rolle unbekannt (`me` null, die Prüfung
 * ist durch — RequireAuth lässt vorher nichts durch), kommt keine der beiden: ein Spieler
 * mit Netzfehler bekäme sonst die Admin-Startseite voller fehlgeschlagener Aufrufe.
 */
export function Startseite() {
  const { me, neuLaden } = useAuth()
  const [versucht, setVersucht] = useState(false)
  if (me === null) {
    return (
      <div role="status" className="rounded-2xl bg-navy-900 text-white p-6 sm:p-8 text-center shadow-lg shadow-navy-900/15 max-w-xl mx-auto">
        <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-white/80">
          <CrossBones size={24} />
        </div>
        <h2 className="font-display text-lg font-extrabold tracking-wide uppercase mb-1">Dein Konto wird noch geladen</h2>
        <p className="text-sm text-white/65 leading-relaxed mb-4">
          Die Verbindung zum Server steht gerade nicht. Sobald sie wieder da ist, lädt die Seite von selbst — oder du versuchst es gleich noch einmal.
        </p>
        <button
          type="button"
          disabled={versucht}
          onClick={async () => { setVersucht(true); try { await neuLaden() } finally { setVersucht(false) } }}
          className="font-display min-h-11 px-5 rounded-lg bg-white/95 hover:bg-navy-800 hover:text-white text-navy-900 text-[11px] font-extrabold tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-60"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }
  return me.role === 'PLAYER' ? <PlayerDashboard /> : <Dashboard />
}
