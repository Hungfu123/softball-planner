import type { Play } from './board/types'

/**
 * Die Spiellage in einem Wort.
 *
 * Steht hier und nicht in einer der beiden Zeilen, weil die Liste des Trainers und die
 * Lernzeile des Kapitels dieselbe Marke zeigen. `null` heisst Normalfall — dann steht
 * gar nichts da, eine Pille „Egal" waere Platz fuer nichts.
 */
export const LAGE_TEXT: Record<Play['gameState'], string | null> = {
  ANY: null,
  CLOSE_LATE: 'Knapp',
  AHEAD: 'Vorn',
  BEHIND: 'Hinten',
}
