import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { MeResponse } from '@/types'

const h = vi.hoisted(() => ({ me: null as MeResponse | null }))
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ me: h.me }) }))

import { useRolle } from './useRolle'

const SUPERADMIN: MeResponse = {
  username: 'hung', role: 'SUPERADMIN', playerId: 4, playerName: 'Hung',
  mayScore: false, passwordChanged: true,
}

function an() {
  localStorage.setItem('spielermodus', '1')
}

describe('useRolle im Spielermodus', () => {
  beforeEach(() => {
    localStorage.clear()
    h.me = SUPERADMIN
  })

  it('zeigt ohne Modus die echte Rolle', () => {
    const { result } = renderHook(() => useRolle())
    expect(result.current.istSuperadmin).toBe(true)
    expect(result.current.istAdmin).toBe(true)
    expect(result.current.spielermodus).toBe(false)
  })

  it('nimmt im Modus alle Trainerrechte aus der Oberfläche', () => {
    an()
    const { result } = renderHook(() => useRolle())
    expect(result.current.istSuperadmin).toBe(false)
    expect(result.current.istAdmin).toBe(false)
    expect(result.current.istBestaetigtAdmin).toBe(false)
    expect(result.current.spielermodus).toBe(true)
  })

  it('bleibt auch dann Spieler, wenn /api/me nicht beantwortet ist', () => {
    // Der Unbekannt-Fall ist sonst grosszuegig (ein Admin soll bei einem Netzhaenger nicht
    // seine App verlieren). Wer den Modus ausdruecklich gewaehlt hat, will ihn aber behalten.
    an()
    h.me = null
    const { result } = renderHook(() => useRolle())
    expect(result.current.istAdmin).toBe(false)
    expect(result.current.istSuperadmin).toBe(false)
  })

  it('lässt nur einen echten Superadmin umschalten', () => {
    const { result } = renderHook(() => useRolle())
    expect(result.current.darfSichtWechseln).toBe(true)

    h.me = { ...SUPERADMIN, role: 'ADMIN' }
    expect(renderHook(() => useRolle()).result.current.darfSichtWechseln).toBe(false)

    h.me = { ...SUPERADMIN, role: 'PLAYER' }
    expect(renderHook(() => useRolle()).result.current.darfSichtWechseln).toBe(false)
  })

  it('erlaubt das Zurückschalten auch aus dem Modus heraus', () => {
    // darfSichtWechseln liest die ECHTE Rolle — sonst käme niemand zurück.
    an()
    const { result } = renderHook(() => useRolle())
    expect(result.current.istAdmin).toBe(false)
    expect(result.current.darfSichtWechseln).toBe(true)
  })

  it('folgt im Modus dem Scorer-Recht des Kontos', () => {
    an()
    h.me = { ...SUPERADMIN, mayScore: false }
    expect(renderHook(() => useRolle()).result.current.darfScoren).toBe(false)

    h.me = { ...SUPERADMIN, mayScore: true }
    expect(renderHook(() => useRolle()).result.current.darfScoren).toBe(true)
  })
})
