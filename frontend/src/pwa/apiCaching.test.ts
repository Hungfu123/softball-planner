import { describe, it, expect, vi, afterEach } from 'vitest'
import { API_RUNTIME_CACHING, API_CACHE_NAME, clearApiCache, istRollenabhaengig } from './apiCaching'

const get = (p: string) => ({ url: new URL(p, 'http://x'), request: { method: 'GET' } })
const erste = (a: { url: URL; request: { method: string } }) =>
  API_RUNTIME_CACHING.find(r => r.urlPattern(a))

describe('Service-Worker-Regeln für /api', () => {
  it('die NetworkOnly-Regel steht vor der allgemeinen NetworkFirst-Regel', () => {
    expect(API_RUNTIME_CACHING[0].handler).toBe('NetworkOnly')
    expect(API_RUNTIME_CACHING[1].handler).toBe('NetworkFirst')
  })

  it.each(['/api/me', '/api/players/7/usage', '/api/trainings'])('%s kommt nie aus dem Cache', p => {
    expect(erste(get(p))?.handler).toBe('NetworkOnly')
  })

  it('mit Query-String gilt dasselbe (der Pfad zählt)', () => {
    expect(erste(get('/api/players/7/usage?year=2026'))?.handler).toBe('NetworkOnly')
    expect(erste(get('/api/trainings?periodId=3'))?.handler).toBe('NetworkOnly')
  })

  it.each(['/api/players', '/api/seasons', '/api/gamedays/4', '/api/trainings/stats', '/api/players/7/form'])(
    '%s bleibt NetworkFirst',
    p => {
      expect(erste(get(p))?.handler).toBe('NetworkFirst')
    },
  )

  it('Schreibzugriffe und Fremdpfade fasst keine Regel an', () => {
    expect(erste({ url: new URL('/api/me', 'http://x'), request: { method: 'POST' } })).toBeUndefined()
    expect(erste(get('/index.html'))).toBeUndefined()
    expect(istRollenabhaengig({ url: new URL('/api/me', 'http://x'), request: { method: 'PUT' } })).toBe(false)
  })
})

describe('Serialisierung in sw.js', () => {
  // Workbox schreibt urlPattern-Funktionen als Text in sw.js. Was sie aus ihrer Umgebung
  // benutzen, gibt es dort nicht: sie müssen als nackter Text lauffähig sein.
  it.each(API_RUNTIME_CACHING.map((r, i) => [i, r] as const))('Regel %i läuft ohne ihre Umgebung', (_i, regel) => {
    const nackt = new Function(`return (${regel.urlPattern.toString()})`)() as typeof regel.urlPattern
    expect(() => nackt(get('/api/me'))).not.toThrow()
    expect(nackt(get('/api/me'))).toBe(regel.urlPattern(get('/api/me')))
    expect(nackt(get('/api/seasons'))).toBe(regel.urlPattern(get('/api/seasons')))
  })
})

describe('clearApiCache', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('löscht den api-cache', async () => {
    const del = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { delete: del })
    await clearApiCache()
    expect(del).toHaveBeenCalledWith(API_CACHE_NAME)
  })

  it('verträgt Browser ohne Cache-API und solche, die werfen', async () => {
    vi.stubGlobal('caches', undefined)
    await expect(clearApiCache()).resolves.toBeUndefined()
    vi.stubGlobal('caches', { delete: () => { throw new Error('gesperrt') } })
    await expect(clearApiCache()).resolves.toBeUndefined()
    vi.stubGlobal('caches', { delete: () => Promise.reject(new Error('gesperrt')) })
    await expect(clearApiCache()).resolves.toBeUndefined()
  })
})
