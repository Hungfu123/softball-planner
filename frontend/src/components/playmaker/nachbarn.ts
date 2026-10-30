import type { Play } from './board/types'

export interface Nachbarn {
  vorheriges: Play | null
  naechstes: Play | null
  /** Platz in der Kategorie, 1-basiert. 0 heisst: nicht gefunden. */
  nummer: number
  anzahl: number
}

/**
 * Wo das Play in seiner Kategorie steht, und was davor und danach kommt.
 *
 * Das Kapitel ist hier die **Kategorie**, nicht die ganze Liste. Einundfuenfzig Plays am
 * Stueck sind kein Weg mit einem Ende; neun Cut-off-Plays sind einer. Die Reihenfolge ist
 * die der Uebersicht, also die Reihenfolge, in der die Liste hereinkommt.
 *
 * Kennt die Liste das Play nicht — kein Netz, Link direkt aufgerufen —, blaettert
 * nichts. Das ist kein Fehler, nur ein Play ohne Nachbarn.
 */
export function nachbarn(plays: Play[], aktuelles: Play): Nachbarn {
  const kapitel = plays.filter(p => p.categoryId === aktuelles.categoryId)
  const i = kapitel.findIndex(p => p.id === aktuelles.id)
  if (i < 0) return { vorheriges: null, naechstes: null, nummer: 0, anzahl: 0 }

  return {
    vorheriges: kapitel[i - 1] ?? null,
    naechstes: kapitel[i + 1] ?? null,
    nummer: i + 1,
    anzahl: kapitel.length,
  }
}
