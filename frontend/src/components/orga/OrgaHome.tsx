import { Link } from 'react-router-dom'
import { Card } from '@/components/shared'
import { ClipboardListIcon, SendIcon, CounterIcon, CalendarIcon, UsersIcon } from '@/icons'
import { Mail } from 'lucide-react'

export function OrgaHome() {
  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Orga</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/orga/einladungen">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><Mail size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Einladungen</div>
                <div className="text-xs text-gray-500 mt-0.5">Einladungsschreiben für Heimspieltage</div>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/orga/aufbau">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><ClipboardListIcon size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Aufbau Heimspieltag</div>
                <div className="text-xs text-gray-500 mt-0.5">Was brauchen wir, wo liegt es</div>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/orga/whatsapp-umfrage">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><SendIcon size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">WhatsApp-Umfragen</div>
                <div className="text-xs text-gray-500 mt-0.5">Wöchentliche Trainings-Abstimmungen</div>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/counter">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><CounterIcon size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Zähler</div>
                <div className="text-xs text-gray-500 mt-0.5">Balls, Strikes, Outs und Score am Feld</div>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/orga/teams">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><UsersIcon size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Teams</div>
                <div className="text-xs text-gray-500 mt-0.5">Alle Gegner, Ligen, Bilanz und Spiel-Historie</div>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/kalender">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><CalendarIcon size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Kalender</div>
                <div className="text-xs text-gray-500 mt-0.5">Spieltage und Trainings im Monat, ICS-Export</div>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
