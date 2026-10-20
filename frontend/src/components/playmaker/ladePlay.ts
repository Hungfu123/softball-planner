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
    const alle = await api.getPlays()
    const gefunden = alle.find(play => play.id === id)
    if (!gefunden) throw fehler
    return gefunden
  }
}
