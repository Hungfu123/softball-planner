import type { AufstellungsLage, GameDayResponse } from '@/types'

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
 * Beides muss zusammen zutreffen — nur „gesperrt" sagte einem Admin, es sei nichts freigegeben,
 * obwohl schlicht noch nichts aufgestellt ist.
 */
export function stehtNochNicht(
  gameDay: Pick<GameDayResponse, 'aufstellungsLage'>,
  hatEintraege: boolean,
): boolean {
  const lage = lageVon(gameDay)
  return (lage === 'GESPERRT' || lage === 'HEUTE_VOR_SIEBEN') && !hatEintraege
}
