/*
 * Wann eine neue Fassung von selbst einziehen darf. Eigene Datei, damit die Regel testbar ist —
 * wie bei `apiCaching.ts`: der Service Worker läuft in Vitest nicht, die Entscheidung schon.
 *
 * Die App aktualisiert sich LEISE: kein Hinweis, keine Frage. Nur gilt „leise" nicht als
 * Erlaubnis, jemandem die Arbeit unter den Händen wegzuziehen. Deshalb zwei Bedingungen,
 * die beide erfüllt sein müssen:
 *
 *  1. Die App kommt gerade in den Vordergrund. Bei der installierten App ist das der eine
 *     Moment, in dem ein Neuladen wie ein normaler Start aussieht — dort fällt es niemandem
 *     auf. Lädt man dagegen neu, während jemand hinsieht, springt die Seite grundlos.
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
