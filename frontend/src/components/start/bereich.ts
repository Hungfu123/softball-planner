import type { Season } from '@/types'

/**
 * Der Zeitraum, den der Kopf der Startseite zeigt: das ganze Jahr oder eine Saison daraus.
 *
 * Die Vorgabe ist das JAHR, und das ist keine Bequemlichkeit, sondern die Lehre aus dem
 * Fehler davor: die Seite suchte sich selbst eine Saison aus (die des naechstgelegenen
 * Spieltags) und zeigte dann stillschweigend die Bilanz einer Nebensaison mit einem Spiel
 * darin. Ein Zeitraum, den die Seite waehlt, ist eine Falle; einer, den der Mensch waehlt,
 * ist eine Auskunft. Deshalb steht die Auswahl sichtbar neben den Zahlen.
 */
export type Bereich =
  | { art: 'jahr'; jahr: number }
  | { art: 'saison'; seasonId: number; name: string }

/** Was gemerkt wird — die Saison-id oder „das ganze Jahr". */
export type Wahl = number | 'jahr'

const SCHLUESSEL = 'startseite-bereich'

/**
 * Die letzte Wahl, pro Geraet. Faellt auf das Jahr zurueck, wenn nichts (Gueltiges) dasteht.
 *
 * Eine Saison-id aus einem vergangenen Jahr bleibt hier stehen, bis das neue Jahr seine
 * Saisons kennt — `bereichAus` wirft sie dann weg. Der `localStorage` kann in einem
 * privaten Fenster werfen, deshalb der Fang.
 */
export function gemerkteWahl(): Wahl {
  try {
    const roh = localStorage.getItem(SCHLUESSEL)
    if (roh == null || roh === 'jahr') return 'jahr'
    const id = Number(roh)
    return Number.isInteger(id) && id > 0 ? id : 'jahr'
  } catch {
    return 'jahr'
  }
}

export function merkeWahl(wahl: Wahl): void {
  try {
    localStorage.setItem(SCHLUESSEL, String(wahl))
  } catch {
    // Kein Speicher, kein Gedaechtnis — die Seite funktioniert trotzdem.
  }
}

/**
 * Wahl + Saisonliste → Zeitraum. `null` heisst „weiss ich noch nicht", und solange ruft
 * die Seite gar nichts ab: eine gemerkte Saison darf nicht erst die Jahreszahlen laden und
 * sie eine Umdrehung spaeter wieder ersetzen.
 *
 * Eine gemerkte Saison, die es in diesem Jahr nicht gibt (Jahreswechsel, geloeschte
 * Saison), faellt still auf das Jahr zurueck.
 */
export function bereichAus(wahl: Wahl, jahr: number, saisons: Season[] | null): Bereich | null {
  if (wahl === 'jahr') return { art: 'jahr', jahr }
  if (saisons == null) return null
  const treffer = saisons.find(s => s.id === wahl)
  return treffer ? { art: 'saison', seasonId: treffer.id, name: treffer.name } : { art: 'jahr', jahr }
}

/** Der Schluessel, der einen Abruf ausloest — zwei Zeitraeume sind nie derselbe. */
export function bereichSchluessel(b: Bereich): string {
  return b.art === 'jahr' ? `jahr:${b.jahr}` : `saison:${b.seasonId}`
}
