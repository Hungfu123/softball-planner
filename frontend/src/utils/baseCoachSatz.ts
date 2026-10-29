import type { BaseCoachAuskunft } from '@/types'

/**
 * Der Satz zur Base-Coach-Auskunft des Backends. Er steht absichtlich allein:
 * PDF und Spieler-Ansicht müssen gleichlautend sein, und das garantiert nur
 * eine gemeinsame Funktion, nicht zwei Stellen mit derselben Idee.
 *
 * Je nicht benannter Base kommt ein Startcoach: beide benannt → keine Namen,
 * einer benannt → einer, keiner → zwei. Das angehängte „dann letzte Outs" ist
 * der Kern der Regel — ohne es liest sich die Nennung als Dauerzuweisung, und
 * genau so wurde sie gelesen.
 *
 * Breite: der PDF-Block ist 100 mm bei Helvetica 7 pt, also rund 80 Zeichen.
 * Der Test hält 60 als Abstand dazu; auf dem Schirm darf der Satz umbrechen.
 */
export function baseCoachSatz(a: BaseCoachAuskunft | undefined): string | null {
  if (!a) return null
  const starter = a.startCoaches.join(', ')
  // Ohne Aufstellung gibt es niemanden, der „zuletzt aus" sein könnte: dann nur der Name
  const mitRegel = (name: string, andereBase: string) =>
    starter ? `${name} · ${andereBase} ${starter}, dann letzte Outs` : name

  if (a.firstBase && a.thirdBase) return `1B ${a.firstBase} · 3B ${a.thirdBase}`
  if (a.firstBase) return mitRegel(`1B ${a.firstBase}`, '3B')
  if (a.thirdBase) return mitRegel(`3B ${a.thirdBase}`, '1B')
  return starter ? `Coaches: ${starter}, dann letzte Outs` : null
}
