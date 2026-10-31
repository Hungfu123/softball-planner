import * as api from '@/api/plays'
import type { Play } from './board/types'

/**
 * Ein einzelnes Play laden — und wenn das scheitert, aus der Liste holen.
 *
 * Der Grund ist das Offline-Versprechen. Der Service-Worker legt pro URL ab: ein Aufruf
 * von `/api/plays` waermt den Cache fuer die LISTE, nicht fuer `/api/plays/42`. Wer
 * zuhause die Uebersicht oeffnet und am Platz ohne Netz ein Play antippt, das er noch nie
 * einzeln geoeffnet hat, bekaeme sonst eine Fehlerseite — obwohl das Play vollstaendig im
 * Cache liegt, nur unter einer anderen Adresse.
 *
 * Deshalb liefert der Listen-Endpunkt die Plays mitsamt ihren Staenden: hier ist die
 * Stelle, an der sich das auszahlt.
 */
export async function ladePlayMitRueckfall(id: number): Promise<Play> {
  try {
    return await api.getPlay(id)
  } catch (fehler) {
    let alle: Play[]
    try {
      alle = await api.getPlays()
    } catch {
      // Auch die Liste kommt nicht durch: das ist der Netz- oder Cache-Fall, und der
      // erste Fehler beschreibt ihn besser als der zweite.
      throw fehler
    }
    const gefunden = alle.find(play => play.id === id)
    if (!gefunden) throw new PlayNichtGefunden(id)
    return gefunden
  }
}

/**
 * Das Play gibt es nicht — und das weiss man **ohne Statuscode**: die Liste kam durch,
 * also ist das Netz in Ordnung, und darin steht es nicht.
 *
 * Der Unterschied ist keine Feinheit. Wer einem alten Link folgt, las vorher „nicht im
 * Zwischenspeicher. Ohne Netz zeigt der Playmaker nur, was schon einmal geladen wurde" —
 * eine Meldung, die seinem Netz die Schuld gibt und ihn warten laesst.
 */
export class PlayNichtGefunden extends Error {
  /* Kein Parameter-Feld: `erasableSyntaxOnly` verbietet die Kurzform. */
  readonly playId: number

  constructor(playId: number) {
    super(`Play ${playId} gibt es nicht`)
    this.name = 'PlayNichtGefunden'
    this.playId = playId
  }
}
