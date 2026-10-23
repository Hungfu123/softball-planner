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
 *  - /api/me                       Identität, Rolle, Scorer-Recht
 *  - /api/players/{id}/usage       Trainingszahlen nur für Admins (sonst null)
 *  - /api/trainings                Teilnehmerzahl nur für Admins
 * Alles andere liefert allen Angemeldeten dasselbe oder ist admin-only (403 für Spieler).
 * Kommt ein weiterer Endpunkt dazu, der CurrentUser auswertet: hier eintragen.
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
  const rollenabhaengig = [/^\/api\/me$/, /^\/api\/players\/\d+\/usage$/, /^\/api\/trainings$/]
  return request.method === 'GET' && rollenabhaengig.some(r => r.test(url.pathname))
}

function istApiGet({ url, request }: Anfrage): boolean {
  return url.pathname.startsWith('/api/') && request.method === 'GET'
}

/** Reihenfolge zählt: workbox nimmt die erste passende Regel. Die NetworkOnly-Regel muss vor der allgemeinen stehen. */
export const API_RUNTIME_CACHING = [
  {
    urlPattern: istRollenabhaengig,
    handler: 'NetworkOnly' as const,
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
