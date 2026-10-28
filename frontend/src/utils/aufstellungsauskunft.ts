import type { GameDayResponse } from '@/types'

export const NOCH_NICHT_FREIGEGEBEN = 'Die Aufstellung steht noch nicht. Sobald sie steht, findest du sie hier.'

/**
 * Warum eine leere Aufstellung leer ist. Die Freigabe verbirgt nichts — das tut das Backend
 * (und es gibt sie auch Admins, Scorern und vergangenen Spieltagen frei). Sie erklaert nur die
 * Leere: ein Spieltag von heute oder spaeter, der nicht freigegeben ist, hat noch keine
 * sichtbare Aufstellung; ein vergangener oder freigegebener hat schlicht keine.
 */
export function stehtNochNicht(gameDay: Pick<GameDayResponse, 'date' | 'lineupsReleasedAt'>): boolean {
  return !gameDay.lineupsReleasedAt && gameDay.date >= new Date().toISOString().slice(0, 10)
}
