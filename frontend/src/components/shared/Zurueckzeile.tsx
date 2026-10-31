import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from '@/icons'

/**
 * Der Weg zurueck ueber einer Ueberschrift.
 *
 * **Einmal, weil es zweimal auseinanderlief**: dieselbe Zeile stand auf zwei Seiten
 * nebeneinander einmal mit dem Schriftzeichen „‹" und einmal mit dem Winkel aus dem
 * Zeichensatz, einmal in Tokens und einmal in alten Palettenklassen, einmal mit
 * Tipp-Hoehe und einmal ohne. Zwei Seiten weiter steht in der Kopfleiste der
 * Buehnenseiten das Wort „Zurueck" — dort traegt es eine eigene Leiste, hier steht der
 * Name des Ziels, weil man sonst nicht sieht, wohin es zurueckgeht.
 */
export function Zurueckzeile({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-display inline-flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink-strong active:text-ink-strong"
    >
      <ChevronLeft size={12} aria-hidden="true" />
      {children}
    </Link>
  )
}
