import type { BrowserContext } from '@playwright/test'

const CREDENTIALS = 'hung:Deadsox123!'

/**
 * Seed localStorage so requests authenticated.
 * Must be called BEFORE first page.goto().
 */
export async function seedAuth(context: BrowserContext): Promise<void> {
  const b64 = Buffer.from(CREDENTIALS).toString('base64')
  await context.addInitScript((auth) => {
    window.localStorage.setItem('auth', auth)
  }, b64)
}

export function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(CREDENTIALS).toString('base64')
}

/**
 * Stellt das Dashboard auf eine Saison, die wirklich einen Spieltag hat.
 *
 * Ohne das zeigt `/` in einer frischen Datenbank nur den Leerzustand — und die
 * Hero-Karte, das groesste Element der Startseite, wird von keiner Pruefung je
 * gerendert. Genau so ist sie im Dunkeln unsichtbar geworden, ohne dass eine
 * Messung anschlug. Findet sich keine solche Saison, bleibt alles wie es war.
 */
export async function seedDashboardSaison(context: BrowserContext): Promise<number | null> {
  const kopf = { Authorization: basicAuthHeader() }
  const api = context.request
  const seasons = await (await api.get('http://localhost:8080/api/seasons', { headers: kopf })).json()
  for (const s of seasons) {
    const gd = await (await api.get(`http://localhost:8080/api/seasons/${s.id}/gamedays`, { headers: kopf })).json()
    if (Array.isArray(gd) && gd.length > 0) {
      await context.addInitScript(id => {
        window.localStorage.setItem('dashboard-season-id', String(id))
      }, s.id)
      return s.id
    }
  }
  return null
}
