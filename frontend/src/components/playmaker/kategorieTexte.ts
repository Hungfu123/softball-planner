/**
 * Ein Satz je Kategorie, und die Stufe dazu.
 *
 * Steht hier und nicht in der Datenbank: es ist Text fuer die Oberflaeche, kein Feld, das
 * jemand pflegen muss. Faellt eine Kategorie heraus oder kommt eine dazu, steht da der
 * allgemeine Satz — falsch wird nichts.
 *
 * Benutzt von der Spielwissen-Startseite UND vom Kapitelkopf der Play-Uebersicht, damit
 * beide dasselbe sagen.
 */
export const KATEGORIE_SATZ: Record<string, string> = {
  Spielsituationen: 'Ball im Spiel. Was tust du?',
  'Outfield-Basics': 'Ball kommt raus. Wohin damit?',
  'Base-Coverage': 'Wer covert welche Base?',
  'Pop-up-Priorities': 'Hoher Ball. Wer ruft?',
  'Bunt-Defense': 'Bunt liegt da. Wer holt ihn?',
  'Steal-Defense & Pickoff': 'Runner geht. Wer covert?',
  Rundown: 'Gefangen zwischen zwei Bases.',
  'Runner auf 1 und 3': 'Beide laufen. Wen nimmst du?',
  'Cut-off & Relay': 'Ball weit weg. Kette nach innen.',
}

export const kategorieSatz = (name: string) =>
  KATEGORIE_SATZ[name] ?? 'Wer steht wo, und wohin geht der Ball?'

/**
 * Wie schwer eine Kategorie ist, aus ihrer Sortierung.
 *
 * Die Reihenfolge setzt der Trainer (`play_category.sort_order`), und sie laeuft von
 * einfach nach schwer. Die Stufe daraus abzuleiten heisst: es gibt kein zweites Feld,
 * das jemand nachziehen muss, und die Punkte koennen der Reihenfolge nie widersprechen.
 */
export function kategorieStufe(sortOrder: number): 1 | 2 | 3 {
  if (sortOrder <= 20) return 1
  if (sortOrder <= 50) return 2
  return 3
}
