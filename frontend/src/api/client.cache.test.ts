import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setAuth, clearAuth } from './client'

describe('API-Cache beim An- und Abmelden', () => {
  const del = vi.fn().mockResolvedValue(true)
  beforeEach(() => {
    localStorage.clear()
    del.mockClear()
    vi.stubGlobal('caches', { delete: del })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('Anmelden leert den api-cache', () => {
    setAuth('mike', 'geheim')
    expect(del).toHaveBeenCalledWith('api-cache')
  })

  it('Abmelden (auch durch ein 401) leert den api-cache', () => {
    setAuth('mike', 'geheim')
    del.mockClear()
    clearAuth()
    expect(del).toHaveBeenCalledWith('api-cache')
  })
})
