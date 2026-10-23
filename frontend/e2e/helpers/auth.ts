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
