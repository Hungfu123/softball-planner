import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getPlayers, setAuth, clearAuth, UNAUTHORIZED_EVENT } from './client'

let ereignisse = 0
const zaehlen = () => {
  ereignisse++
}

beforeEach(() => {
  localStorage.clear()
  ereignisse = 0
  window.addEventListener(UNAUTHORIZED_EVENT, zaehlen)
})

afterEach(() => {
  window.removeEventListener(UNAUTHORIZED_EVENT, zaehlen)
  vi.unstubAllGlobals()
})

describe('setAuth', () => {
  it('legt Benutzername und Passwort als Basic-Zugangsdaten ab', () => {
    setAuth('maria', 'geheim')
    expect(localStorage.getItem('auth')).toBe(btoa('maria:geheim'))
  })
})

describe('request: 401', () => {
  it('räumt die Zugangsdaten auf und meldet es per Ereignis, ohne neu zu laden', async () => {
    setAuth('hung', 'alt')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => null }))

    await expect(getPlayers()).rejects.toThrow()

    expect(localStorage.getItem('auth')).toBeNull()
    expect(ereignisse).toBe(1)
  })

  it('lässt Zugangsdaten und Ereignis bei anderen Fehlern in Ruhe', async () => {
    setAuth('hung', 'geheim')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null }))

    await expect(getPlayers()).rejects.toThrow('Fehler 500')

    expect(localStorage.getItem('auth')).not.toBeNull()
    expect(ereignisse).toBe(0)
  })

  it('meldet ohne gespeicherte Zugangsdaten nichts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => null }))

    await expect(getPlayers()).rejects.toThrow()

    expect(ereignisse).toBe(0)
  })

  it('räumt eine Anmeldung nicht weg, die inzwischen neu erfolgt ist', async () => {
    setAuth('hung', 'alt')
    let antworten!: (r: unknown) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(res => (antworten = res))))

    const anfrage = getPlayers()
    clearAuth()
    setAuth('hung', 'neu')
    antworten({ ok: false, status: 401, json: async () => null })
    await expect(anfrage).rejects.toThrow()

    expect(localStorage.getItem('auth')).toBe(btoa('hung:neu'))
    expect(ereignisse).toBe(0)
  })
})
