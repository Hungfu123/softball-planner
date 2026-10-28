import type { AufstellungsLage, GameDayResponse, GameResponse, LineupEntryResponse } from '@/types'

export const NOCH_NICHT_FREIGEGEBEN = 'Die Aufstellung steht noch nicht. Sobald sie steht, findest du sie hier.'
export const NOCH_KEINE_AUFSTELLUNG = 'Für dieses Spiel gibt es noch keine Aufstellung. Sobald der Trainer sie macht, steht sie hier.'

/**
 * Die Lage kommt vom Backend, das in Berliner Zeit und mit seiner einen Uhr rechnet. Fehlt sie
 * (alte Antwort, Mock), gilt „gesperrt": im Zweifel nichts versprechen, was nicht da ist.
 */
export function lageVon(gameDay: Pick<GameDayResponse, 'aufstellungsLage'>): AufstellungsLage {
  return gameDay.aufstellungsLage ?? 'GESPERRT'
}

export function istVergangen(gameDay: Pick<GameDayResponse, 'aufstellungsLage'>): boolean {
  return lageVon(gameDay) === 'OFFEN_VERGANGEN'
}

/**
 * Ob der Satz „steht noch nicht" gilt. Die Lage ist fuer jeden Betrachter gleich, ob jemand
 * gesperrt ist, zeigt sich erst daran, ob er etwas bekommen hat: das Backend liefert einem
 * Gesperrten leere Listen (keinen Fehler), Admin und Scorer dagegen die echten Eintraege.
 * Beides muss zusammen zutreffen (`alleLeer`: siehe unten) — nur „gesperrt" sagte einem Admin, es sei nichts freigegeben,
 * obwohl schlicht noch nichts aufgestellt ist.
 */
export function stehtNochNicht(
  gameDay: Pick<GameDayResponse, 'aufstellungsLage'>,
  alleLeer: boolean,
): boolean {
  const lage = lageVon(gameDay)
  return (lage === 'GESPERRT' || lage === 'HEUTE_VOR_SIEBEN') && alleLeer
}

/**
 * Ist fuer JEDES Spiel eine Liste angekommen, und sind alle leer? Beide Karten des Dashboards
 * fragen DAS, damit sie ueber dieselbe Lage nie Gegenteiliges sagen. `undefined` (laedt) und
 * `null` (nicht erreichbar) zaehlen als NEIN: wer nichts weiss, darf nicht behaupten, es stehe
 * noch nichts — „steht noch nicht" bei einem Netzfehler waere eine falsche Auskunft. Dann
 * antwortet jede Karte je Spiel mit dem, was sie hat (Platzhalter oder Fehlertext).
 */
export function alleLeer(
  spiele: Pick<GameResponse, 'id'>[],
  aufstellungen: Record<number, LineupEntryResponse[] | null | undefined>,
): boolean {
  return spiele.every(g => aufstellungen[g.id]?.length === 0)
}
