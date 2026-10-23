import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/shared'
import { SendIcon, CounterIcon, CalendarIcon, CrossBones, ClipboardListIcon } from '@/icons'
import { Mail, Receipt, ChevronRight } from 'lucide-react'

function Kachel({ to, icon, titel, untertitel }: { to: string; icon: ReactNode; titel: string; untertitel: string }) {
  return (
    <Link to={to}>
      <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900 break-words">{titel}</div>
            <div className="text-xs text-gray-500 mt-0.5">{untertitel}</div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

function Zeile({ to, icon, titel, untertitel }: { to: string; icon: ReactNode; titel: string; untertitel: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl hover:bg-navy-800 hover:text-white text-navy-900 transition-colors group"
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm font-extrabold uppercase tracking-widest break-words">{titel}</div>
        <div className="text-xs text-gray-500 group-hover:text-gray-300 mt-0.5">{untertitel}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
    </Link>
  )
}

function Ueberschrift({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{children}</h2>
      <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />
    </div>
  )
}

export function OrgaHome() {
  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Orga</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Kachel to="/counter" icon={<CounterIcon size={20} />} titel="Counter" untertitel="Balls, Strikes, Outs und Score am Feld" />
        <Kachel to="/orga/whatsapp-umfrage" icon={<SendIcon size={20} />} titel="WhatsApp-Umfragen" untertitel="Wöchentliche Trainings-Abstimmungen" />
        <Kachel to="/orga/trainerabrechnung" icon={<Receipt size={20} />} titel="Trainerabrechnung" untertitel="Stunden eines Monats als Bogen für den Hochschulsport" />
      </div>

      <Ueberschrift>Weiteres</Ueberschrift>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Kachel to="/kalender" icon={<CalendarIcon size={20} />} titel="Kalender" untertitel="Spieltage und Trainings im Monat, ICS-Export" />
        <Kachel to="/orga/einladungen" icon={<Mail size={20} />} titel="Einladungen" untertitel="Einladungsschreiben für Heimspieltage" />
        <Kachel to="/orga/playmaker" icon={<CrossBones size={20} />} titel="Playmaker" untertitel="Spielsituationen bauen und als Animation zeigen" />
      </div>

      <Ueberschrift>Selten</Ueberschrift>
      <div className="max-w-md">
        <Zeile to="/spielbogen" icon={<ClipboardListIcon size={20} />} titel="Spielbogen" untertitel="Live-Scoring im RFL-Bogen" />
      </div>
    </div>
  )
}
