/*
 * Regeln des Service Workers für /api. Eigene Datei, damit sie testbar sind: der Worker selbst
 * läuft in Vitest nicht, die Regeln schon.
 *
 * Der Schlüssel des Caches ist nur die URL — der Authorization-Header geht nicht ein. Was je
 * nach angemeldetem Konto anders antwortet, darf deshalb nie aus dem Cache kommen: sonst
 * liefert ein Gerät, das zwei Leute benutzen, bei schlechtem Empfang die Antwort des
 * Vorgängers (andere Rolle, fremde Trainingszahlen).
 *
 * Rollenabhängig sind genau diese GET-Endpunkte (Stand: alle @GetMapping durchgesehen, die
 * `CurrentUser` auswerten):
 *  - /api/me                             Identität, Rolle, Scorer-Recht
 *  - /api/players/{id}/usage             Trainingszahlen — eigene oder Trainer, sonst null
 *  - /api/players/{id}/training-months   dasselbe, je Monat — eigene oder Trainer, sonst 403
 *  - /api/trainings                      Teilnehmerzahl nur für Admins
 *  - /api/seasons/{id}/stats             gezählte Aufstellung — Spieltage ohne Freigabe fehlen
 *  - /api/years/{year}/stats             dasselbe über ein Jahr
 *  - /api/stats/all-time/games           dasselbe über alles
 *  - /api/games/{id}/lineup|staff|substitutions
 *  - /api/gamedays/{id}/lineups|stats|batting-stats
 *  - /api/games/{id}/batting-stats
 *  - /api/games/{id}/scoreboard          Aufstellung eines nicht freigegebenen Spieltags nur für
 *                                        Admins und Scorer, vergangene Spieltage für alle
 * Alles andere liefert allen Angemeldeten dasselbe oder ist admin-only (403 für Spieler).
 * Kommt ein weiterer Endpunkt dazu, der CurrentUser auswertet: hier eintragen.
 *
 * Die drei Einsatz-Zahlen sind seit der Aufstellungs-Freigabe rollenabhängig: ein Trainer sieht
 * dort auch die noch nicht freigegebenen Spieltage, ein Spieler nicht. Geteilt gecacht liefe
 * genau das wieder auf den Schirm, was die Freigabe zumacht — deshalb stehen sie hier und nicht
 * mehr beim Lesestoff. `batting-stats` und `awards` bleiben dort: die hängen an gespielten
 * Spielen, nicht an der Planung.
 *
 * Die Freigabe-Endpunkte der Liste oben liegen bewusst unter `NetworkFirst`, nicht unter
 * `NetworkOnly`: der Cache ist dort nur Rückfall, wenn das Netz fehlt, und `clearApiCache`
 * (unten) läuft bei jedem An- und Abmelden, ein Vorgänger-Konto kommt also nicht durch.
 * Insbesondere `/scoreboard` auf `NetworkOnly` zu stellen nähme dem Live-Scoring den
 * Offline-Rückfall — der Scoring-Pfad wird hier nicht strenger gemacht.
 *
 * Zusätzlich leert der Client den Cache bei jedem An- und Abmelden (clearApiCache).
 */
export const API_CACHE_NAME = 'api-cache'

type Anfrage = { url: URL; request: { method: string } }

/*
 * Workbox serialisiert diese Funktionen als Text in sw.js: sie dürfen nichts aus ihrer
 * Umgebung benutzen (keine Konstanten, keine Hilfsfunktionen) — dort gäbe es sie nicht, und
 * jede Anfrage liefe in einen ReferenceError. Deshalb steht die Liste IN der Funktion.
 */
export function istRollenabhaengig({ url, request }: Anfrage): boolean {
  const rollenabhaengig = [
    /^\/api\/me$/,
    /^\/api\/players\/\d+\/usage$/,
    /^\/api\/players\/\d+\/training-months$/,
    /^\/api\/trainings$/,
    /^\/api\/seasons\/\d+\/stats$/,
    /^\/api\/years\/\d+\/stats$/,
    /^\/api\/stats\/all-time\/games$/,
  ]
  return request.method === 'GET' && rollenabhaengig.some(r => r.test(url.pathname))
}

function istApiGet({ url, request }: Anfrage): boolean {
  return url.pathname.startsWith('/api/') && request.method === 'GET'
}

/*
 * Lesestoff, der sich selten ändert und für alle gleich aussieht: Statistik, Saisons, Jahre,
 * Spieltage, Awards. Diese Antworten dürfen SOFORT aus dem Cache kommen und im
 * Hintergrund erneuert werden — das ist der ganze Unterschied zwischen „die Seite ist da"
 * und „die Seite lädt". NetworkFirst wartet dagegen immer erst aufs Netz; der Cache rettet
 * dort nur den Ausfall, nicht die Wartezeit.
 *
 * Nicht dabei: alles Rollenabhängige (steht weiter oben) und alles, was man gerade selbst
 * ändert — ein Lineup, ein Spielstand, eine Umfrage, ein Play und seine Kategorien (der
 * Playmaker bearbeitet beides selbst; wer speichert und danach die Fassung von vorher sieht,
 * hält die Änderung für verloren). Dort wäre eine Sekunde alter Stand eine falsche Auskunft,
 * keine schnelle. Plays und Kategorien nicht hier einreihen: sie fallen auf NetworkFirst.
 * Das Offline-Versprechen des Playmakers hängt am freien Feld, das gar kein /api ruft.
 */
function istLangsamerLesestoff({ url, request }: Anfrage): boolean {
  const lesestoff = [
    /^\/api\/stats\//,
    /^\/api\/years\/\d+\//,
    /^\/api\/seasons$/,
    /^\/api\/seasons\/years$/,
    /^\/api\/seasons\/\d+\/(batting-stats|stats|awards)$/,
    /^\/api\/gamedays\/all$/,
    /^\/api\/drills$/,
  ]
  return request.method === 'GET' && lesestoff.some(r => r.test(url.pathname))
}

/** Reihenfolge zählt: workbox nimmt die erste passende Regel. Die NetworkOnly-Regel muss vor der allgemeinen stehen. */
export const API_RUNTIME_CACHING = [
  {
    urlPattern: istRollenabhaengig,
    handler: 'NetworkOnly' as const,
  },
  {
    urlPattern: istLangsamerLesestoff,
    handler: 'StaleWhileRevalidate' as const,
    options: {
      cacheName: API_CACHE_NAME,
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    urlPattern: istApiGet,
    handler: 'NetworkFirst' as const,
    options: {
      cacheName: API_CACHE_NAME,
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
]

/** Wirft der Browser (ältere Browser, private Fenster), bleibt es still: der Cache ist Komfort, kein Vertrag. */
export async function clearApiCache(): Promise<void> {
  try {
    // Typ von Hand: tsconfig.node (liest diese Datei für die vite.config) kennt keine DOM-Typen.
    await (globalThis as { caches?: { delete(name: string): Promise<boolean> } }).caches?.delete(API_CACHE_NAME)
  } catch {
    /* kein Cache-Zugriff */
  }
}
