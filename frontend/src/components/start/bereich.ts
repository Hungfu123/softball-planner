/**
 * Der Zeitraum der Startseite: ein JAHR.
 *
 * Erst war es eine geratene Saison — der Fehler, mit dem alles anfing. Dann das laufende Jahr
 * mit waehlbarer Saison. Jetzt das Jahr, und zwar waehlbar: eine Saison ist ein Ausschnitt
 * (Liga, Turnier, Trainingsspiele), ein Jahr ist das, was im naechsten wiederkommt. Wer im
 * Januar 2027 nachsehen will, wie 2026 lief, fragt nach dem Jahr und nicht nach „Ruhr Fun Liga".
 *
 * Die Seite traegt EINEN Zeitraum: Kopf und Terminband zeigen dasselbe Jahr. Das ist keine
 * Schoenheit, sondern die Lehre aus dem Fehler — zwei Zeitraeume nebeneinander, und der
 * kleinere gewinnt, ohne dass es jemand merkt.
 */
const SCHLUESSEL = 'startseite-jahr'

/**
 * Das gemerkte Jahr, pro Geraet — oder das laufende.
 *
 * Der `localStorage` kann in einem privaten Fenster werfen, deshalb der Fang. Ein Wert, der
 * kein Jahr ist, wird verworfen statt geraten.
 */
export function gemerktesJahr(laufendes: number): number {
  try {
    const roh = Number(localStorage.getItem(SCHLUESSEL))
    return Number.isInteger(roh) && roh >= 2000 && roh <= 2200 ? roh : laufendes
  } catch {
    return laufendes
  }
}

export function merkeJahr(jahr: number): void {
  try {
    localStorage.setItem(SCHLUESSEL, String(jahr))
  } catch {
    // Kein Speicher, kein Gedaechtnis — die Seite funktioniert trotzdem.
  }
}

/**
 * Die Jahre zur Auswahl: die mit Saisons, dazu IMMER das laufende.
 *
 * Das laufende Jahr gehoert auch dann in die Liste, wenn noch keine Saison dafuer angelegt
 * ist — im Januar steht sonst das eigene Jahr nicht zur Wahl. Neueste zuerst: wer nachsieht,
 * meint meist das letzte, nicht das erste.
 */
export function jahreZurWahl(ausDenSaisons: number[], laufendes: number): number[] {
  return [...new Set([laufendes, ...ausDenSaisons])].sort((a, b) => b - a)
}
