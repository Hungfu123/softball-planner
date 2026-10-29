import { clearApiCache } from '@/pwa/apiCaching'

/**
 * Der Spielermodus: ein Superadmin sieht die App, wie ein Spieler sie sieht — zum Testen,
 * ohne sich ab- und mit einem zweiten Konto wieder anzumelden.
 *
 * Er lebt **nur hier im Browser**. An `app_user.role` wird nichts geschrieben; jede Anfrage
 * trägt den Wunsch als Kopfzeile, und das Backend stuft die Rechte für genau diese eine
 * Anfrage herab (`SpielerSichtFilter`). Abmelden, anderes Gerät, Neustart — überall ist man
 * wieder Superadmin. Es gibt nichts, was hängenbleiben könnte.
 *
 * Nur abwärts: der Kopf kann Rechte ausschließlich wegnehmen.
 */
const SCHLUESSEL = 'spielermodus'

/** Der Wert der Kopfzeile. Gleicher Name wie `SpielerSichtFilter.KOPF` im Backend. */
export const ROLLE_KOPF = 'X-Rolle-Ansicht'

export function spielermodusAktiv(): boolean {
  try {
    return localStorage.getItem(SCHLUESSEL) === '1'
  } catch {
    // Privates Fenster, gesperrte Site-Daten: dann eben nicht. Der Modus ist Komfort.
    return false
  }
}

/**
 * Schaltet um und lädt die Seite neu.
 *
 * **Der Cache muss weg**, und zwar aus demselben Grund, aus dem `clearApiCache` schon beim
 * An- und Abmelden läuft: der Schlüssel des API-Caches ist **nur die URL**, die Rolle geht
 * nicht ein. Ohne das Leeren bekäme der Spielermodus bei schlechtem Netz die gespeicherte
 * Antwort des Trainers — ausgerechnet die Aufstellung eines gesperrten Spieltags.
 *
 * **Neu geladen wird**, weil der Zustand sonst aus dem anderen Blick stehen bliebe: die Daten
 * liegen in einem Dutzend eigener Hooks, einen zentralen Punkt zum Verwerfen gibt es nicht.
 * Ein Reload ist der einzige Weg, bei dem garantiert nichts übrig ist.
 */
export async function spielermodusSetzen(an: boolean): Promise<void> {
  try {
    if (an) localStorage.setItem(SCHLUESSEL, '1')
    else localStorage.removeItem(SCHLUESSEL)
  } catch {
    /* kein Speicher — dann bleibt es beim bisherigen Zustand */
  }
  await clearApiCache()
  // Auf die Startseite: als Spieler darf man auf keiner Trainer-Seite bleiben, und
  // zurück aus dem Modus steht man sonst auf einer Seite, die es für ihn nicht gab.
  window.location.assign('/')
}
