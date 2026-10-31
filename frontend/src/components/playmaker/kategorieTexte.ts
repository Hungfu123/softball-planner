import type { Play } from './board/types'
import { beteiligte } from './board/beteiligte'

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
  Spielsituationen: 'Der Ball geht irgendwohin. Was tust du?',
  'Base-Coverage': 'Wer deckt welche Base, wenn es losgeht?',
  'Pop-up-Priorities': 'Hoher Ball zwischen zweien. Wer ruft?',
  'Bunt-Defense': 'Der Bunt liegt da. Wer holt ihn, wohin geht der Wurf?',
  'Steal-Defense & Pickoff': 'Der Runner geht. Wer deckt, wer wirft?',
  Rundown: 'Zwischen zwei Bases gefangen. Wie macht man den Out?',
  'First-and-Third': 'Runner auf 1 und 3, und beide laufen.',
  'Cut-off & Relay': 'Der Ball ist weit weg. Die Kette nach innen.',
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

/**
 * Wie schwer ein einzelnes Play ist — gerechnet, nicht gepflegt.
 *
 * Zwei Dinge machen ein Play schwer: **wie viele Leute den Ball anfassen** (eine Kette
 * ueber drei Stationen muss man sich merken) und **wie viele Runner unterwegs sind**
 * (jeder zwingt zu einer Entscheidung). Beides steht in den Staenden.
 *
 * Bewusst grob: drei Stufen sollen sortieren, nicht benoten. Ein Feld dafuer muesste
 * jemand bei jeder Aenderung nachziehen, und ein vergessenes Feld sagt etwas Falsches.
 */
export function playStufe(play: Play): 1 | 2 | 3 {
  const kette = beteiligte(play.steps).length
  const runner = Math.max(
    0,
    ...play.steps.map(s => s.markers.runners.filter(r => r.status === 'ACTIVE').length),
  )

  const punkte = kette + runner
  if (punkte <= 2) return 1
  if (punkte <= 4) return 2
  return 3
}
