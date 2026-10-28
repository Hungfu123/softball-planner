import type { BaseCoachAuskunft } from '@/types'

/**
 * Der Satz zur Base-Coach-Auskunft des Backends. Er steht absichtlich allein:
 * PDF und Spieler-Ansicht müssen gleichlautend sein, und das garantiert nur
 * eine gemeinsame Funktion, nicht zwei Stellen mit derselben Idee.
 *
 * Je nicht benannter Base kommt ein Schlagplatz: beide benannt → keine Nummern,
 * einer benannt → eine, keiner → zwei. Der Satz steht im PDF unter einem Feld
 * von rund 160 px bei 11 px Schrift und darf nicht umbrechen (Länge im Test).
 */
export function baseCoachSatz(a: BaseCoachAuskunft | undefined): string | null {
  if (!a) return null
  const slots = a.startSlots.map(s => `#${s}`).join(' ')
  // Ohne Aufstellung gibt es niemanden, der „zuletzt aus" sein könnte: dann nur der Name
  const mitRegel = (name: string, andereBase: string) =>
    slots ? `${name} · ${andereBase} zuletzt aus · ${slots}` : name

  if (a.firstBase && a.thirdBase) return `1B ${a.firstBase} · 3B ${a.thirdBase}`
  if (a.firstBase) return mitRegel(`1B ${a.firstBase}`, '3B')
  if (a.thirdBase) return mitRegel(`3B ${a.thirdBase}`, '1B')
  return slots ? `Coaches: zuletzt aus · ${slots}` : null
}
