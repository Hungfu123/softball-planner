/*
 * Wann eine neue Fassung von selbst einziehen darf. Eigene Datei, damit die Regel testbar ist —
 * wie bei `apiCaching.ts`: der Service Worker läuft in Vitest nicht, die Entscheidung schon.
 *
 * Die App aktualisiert sich LEISE: kein Hinweis, keine Frage. Nur gilt „leise" nicht als
 * Erlaubnis, jemandem die Arbeit unter den Händen wegzuziehen. Deshalb zwei Bedingungen,
 * die beide erfüllt sein müssen:
 *
 *  1. Die Seite liegt vorn — entweder weil sie gerade aufgebaut wurde, oder weil die App in
 *     den Vordergrund kommt. Beim Aufbau, weil ein Neuladen von Hand genau dort landet: die
 *     installierte App hat keinen Neu-laden-Knopf, das Ziehen ist der einzige Handgriff, und
 *     er muss etwas bewirken. Beim Vordergrund, weil ein Neuladen dort wie ein normaler Start
 *     aussieht. Im Hintergrund dagegen nie — das wäre ein Sprung ohne Anlass.
 *  2. Niemand schreibt gerade ein Spiel mit. Auf den Scoring-Seiten steckt der Stand der
 *     laufenden Begegnung in der Seite; ein Neuladen mitten im dritten Out wäre der teuerste
 *     denkbare Zeitpunkt. Dort wartet das Update, bis derjenige fertig ist und weiterklickt.
 */

/**
 * Seiten, auf denen gerade ein Spiel mitgeschrieben wird. Zwei Wege führen dorthin:
 * der Spielbogen (`/spielbogen/:id`, und der Assistent, der einen anlegt) und das
 * ältere Game-Scoring (`/gameday/:id/scoring/:nr`).
 *
 * Die Listenseite `/spielbogen` steht bewusst NICHT dabei — dort wird nichts geschrieben.
 */
const SCHREIBT_MIT = [
  /^\/gameday\/\d+\/scoring\//,
  /^\/spielbogen\/(new|\d+)$/,
]

/** Wird auf dieser Seite gerade ein Spiel mitgeschrieben? */
export function schreibtGeradeMit(pathname: string): boolean {
  return SCHREIBT_MIT.some(r => r.test(pathname))
}

/**
 * Darf jetzt neu geladen werden? `sichtbar` ist der Übergang in den Vordergrund, nicht der
 * Dauerzustand — der Aufrufer ruft das nur bei `visibilitychange`.
 */
export function darfNeuLaden(pathname: string, sichtbar: boolean): boolean {
  return sichtbar && !schreibtGeradeMit(pathname)
}

/**
 * Wie oft die App beim Server nachfragt, ob es etwas Neues gibt. Ohne das sieht eine stehende
 * installierte App nie nach: der Browser prüft den Service Worker von sich aus nur bei einer
 * Navigation, und die gibt es dort kaum.
 */
export const NACHSEHEN_ALLE_MS = 60 * 60 * 1000

/**
 * Wie lange der Hinweis steht, bevor die Seite wechselt.
 *
 * <p>Leise heisst nicht unerklaert: kommt die App in den Vordergrund, waehrend jemand hinsieht,
 * springt die Seite sonst grundlos. Die kurze Tafel macht daraus einen angekuendigten Vorgang.
 * Lang genug, um gelesen zu werden, zu kurz, um zu warten — und bei
 * `prefers-reduced-motion` steht sie still da, statt zu pulsieren (das regelt der globale
 * Block in `styles/index.css`, hier ist nichts zu tun).
 */
export const HINWEIS_MS = 700

/**
 * Wie lange nach dem Aufbau der Seite ein Update noch als „der hat gerade selbst neu geladen"
 * durchgeht.
 *
 * <p>Ohne diese Grenze griffe der Aufbau-Zweig auch mitten in der Benutzung — die stündliche
 * Nachfrage fände irgendwann etwas, und die Seite spränge jemandem weg, der gerade ein
 * Formular ausfüllt. Genau davor schützt sonst die Bedingung „nur beim Wechsel in den
 * Vordergrund".
 *
 * <p>Eine Minute ist großzügig gewählt, weil der neue Service Worker erst seinen ganzen
 * Vorrat laden muss, bevor er überhaupt wartet; am Handy dauert das. Sie ist trotzdem
 * weit entfernt von „ich benutze die App seit zehn Minuten".
 */
export const AUFBAU_FENSTER_MS = 60 * 1000

/** Liegt der Aufbau der Seite noch so kurz zurück, dass ein Neuladen dazugehört? */
export function nochFrischAufgebaut(seitAufbauMs: number): boolean {
  return seitAufbauMs < AUFBAU_FENSTER_MS
}

/**
 * Höchstens ein selbsttätiges Neuladen beim Aufbau je Tab-Sitzung.
 *
 * <p>Der Weg „Seite baut auf → neue Fassung da → neu laden" führt im Fehlerfall im Kreis:
 * käme die neue Fassung nicht an, fände die neu gebaute Seite dieselbe wartende Fassung
 * wieder vor. Der Wechsel in den Vordergrund braucht die Bremse nicht — der verlangt jedes
 * Mal einen Menschen.
 *
 * <p>Ein privates Fenster ohne Speicher verliert die Bremse; dort trägt das Neuladen selbst:
 * `updateServiceWorker(true)` lädt erst beim Wechsel des Service Workers, bleibt der aus,
 * passiert gar nichts.
 */
const EINMAL_SCHLUESSEL = 'update-beim-aufbau-geladen'

export function schonBeimAufbauGeladen(): boolean {
  try {
    return sessionStorage.getItem(EINMAL_SCHLUESSEL) === '1'
  } catch {
    return false
  }
}

export function merkeAufbauGeladen(): void {
  try {
    sessionStorage.setItem(EINMAL_SCHLUESSEL, '1')
  } catch {
    /* kein Speicher — siehe oben */
  }
}

/**
 * Nimmt die Bremse wieder heraus, sobald nichts mehr zu holen ist.
 *
 * <p>Ohne das hielte die Bremse die ganze Tab-Sitzung: wer morgens einmal aktualisiert hat,
 * bekäme am Nachmittag beim Ziehen wieder nichts. Sie darf nur den Fall abfangen, in dem der
 * Wechsel NICHT geklappt hat — und genau dann steht die neue Fassung ja noch an.
 */
export function loeseAufbauBremse(): void {
  try {
    sessionStorage.removeItem(EINMAL_SCHLUESSEL)
  } catch {
    /* kein Speicher — dann gab es auch keine Bremse */
  }
}

/**
 * Wie lange die Tafel höchstens stehen bleibt, bevor sie sich selbst zurücknimmt.
 *
 * <p>`updateServiceWorker(true)` lädt erst, wenn der neue Service Worker tatsächlich
 * übernimmt. Tut er das nie, stünde die Tafel sonst für immer — ein bildschirmfüllender
 * Vorhang ohne Ausweg, und die App wäre zu. Lieber der alte Stand als gar keiner.
 */
export const TAFEL_GEDULD_MS = 8 * 1000
