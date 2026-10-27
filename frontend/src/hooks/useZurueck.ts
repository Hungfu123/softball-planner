import { useLocation } from 'react-router-dom'

/**
 * Erlaubte Rückwege. Eine feste Liste, keine freie Adresse.
 *
 * `state` kommt aus dem Verlauf des Browsers und ist nichts, worauf man ein Sprungziel
 * ungeprüft baut — auch wenn es hier nur die eigene App füllt.
 */
const ZIELE = ['/', '/players', '/orga', '/spielbetrieb'] as const

export type Rueckweg = typeof ZIELE[number]

/**
 * Wohin das Zurück zeigt: dorthin, wo man hergekommen ist — sonst zum Vorgabeziel.
 *
 * Seiten wie das Spielerprofil oder der Counter haben mehrere Eingänge. Vorher entschied
 * dort die ROLLE, wohin der Pfeil führt: wer als Trainer von der Startseite kam, landete
 * auf dem Kader oder auf Orga, also auf einer Seite, die er nie geöffnet hatte. Der Link
 * beim Hergehen weiß es besser und sagt es jetzt mit `state={{ zurueck: … }}`.
 *
 * Ohne Angabe — geteilter Link, eingetippte Adresse, Neuladen — bleibt es beim Vorgabeziel.
 */
export function useZurueck(standard: string): string {
  const gemerkt = (useLocation().state as { zurueck?: string } | null)?.zurueck
  return ZIELE.find(z => z === gemerkt) ?? standard
}

/** Kurze Beschriftung neben dem Pfeil. Ein Pfeil ohne Wort sagt nicht, wo man landet. */
export function zurueckLabel(ziel: string): string {
  switch (ziel) {
    case '/players': return 'Kader'
    case '/orga': return 'Orga'
    case '/spielbetrieb': return 'Spielbetrieb'
    default: return 'Start'
  }
}

/**
 * Ganzer Satz fuer Vorlesewerkzeuge und Knopf-Beschriftungen.
 *
 * Mit Artikel, nicht zusammengesetzt: aus `Zurück zu ${label}` wurde "Zurück zu Start",
 * und das sagt so niemand.
 */
export function zurueckSatz(ziel: string): string {
  switch (ziel) {
    case '/players': return 'Zurück zum Kader'
    case '/orga': return 'Zurück zur Orga'
    case '/spielbetrieb': return 'Zurück zum Spielbetrieb'
    default: return 'Zurück zur Startseite'
  }
}
