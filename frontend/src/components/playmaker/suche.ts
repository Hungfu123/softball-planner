import type { Play } from './board/types'

/**
 * Die Suche ueber die Plays.
 *
 * Sie laeuft im Browser, nicht im Backend — entgegen der Hausregel, und mit Absicht: die
 * Uebersicht laedt ohnehin alle Plays MITSAMT ihren Staenden (daran haengt das
 * Offline-Versprechen, siehe ladePlay.ts). Am Platz ohne Netz waere ein Suchendpunkt tot,
 * waehrend die Daten vollstaendig im Zwischenspeicher liegen.
 */

/**
 * Gross/klein egal, Umlaute egal — und zwar in BEIDE Richtungen: wer "ueberwurf" tippt,
 * findet "Überwurf", und wer "überwurf" tippt, auch. Dafuer werden beide Seiten auf
 * dieselbe magere Form gebracht. Dass dabei "zuerst" zu "zurst" wird, stoert nicht:
 * Suchtext und Fundstelle werden gleich behandelt, sie treffen sich trotzdem.
 */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
}

export type Trefferfeld = 'titel' | 'kategorie' | 'lage' | 'notiz'

export interface Treffer {
  feld: Trefferfeld
  /** Die Stelle, an der es gefunden wurde — sie steht dann in der Zeile. */
  text: string
}

/**
 * Wo in diesem Play der Suchtext vorkommt, oder null.
 *
 * Die Reihenfolge ist die Rangfolge: ein Titeltreffer sagt mehr als eine Notiz im
 * siebten Stand. Gefunden wird die ERSTE Stelle — sie wird in der Zeile gezeigt, damit
 * man sieht, warum das Play dasteht, statt es aufmachen zu muessen.
 */
export function trefferIn(play: Play, suchtext: string, kategorieName?: string): Treffer | null {
  const frage = normalisiere(suchtext.trim())
  if (!frage) return null

  if (normalisiere(play.title).includes(frage)) return { feld: 'titel', text: play.title }
  if (kategorieName && normalisiere(kategorieName).includes(frage)) {
    return { feld: 'kategorie', text: kategorieName }
  }
  if (play.gameStateNote && normalisiere(play.gameStateNote).includes(frage)) {
    return { feld: 'lage', text: play.gameStateNote }
  }
  for (const stand of play.steps) {
    if (stand.note && normalisiere(stand.note).includes(frage)) {
      return { feld: 'notiz', text: stand.note }
    }
  }
  return null
}
