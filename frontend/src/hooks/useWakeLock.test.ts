import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWakeLock } from './useWakeLock'

interface FakeSentinel {
  released: boolean
  release: ReturnType<typeof vi.fn>
  addEventListener: (typ: string, hoerer: () => void) => void
  /** Simuliert, dass das System den Lock freigibt — z.B. beim Wechsel in den Hintergrund. */
  vomSystemFreigeben: () => void
}

function fakeSentinel(): FakeSentinel {
  const hoerer: Array<() => void> = []
  const s: FakeSentinel = {
    released: false,
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: (typ, h) => {
      if (typ === 'release') hoerer.push(h)
    },
    vomSystemFreigeben: () => {
      s.released = true
      hoerer.forEach(h => h())
    },
  }
  return s
}

function stubWakeLock(request: ReturnType<typeof vi.fn>) {
  Object.defineProperty(globalThis.navigator, 'wakeLock', {
    value: { request },
    configurable: true,
  })
}

function entferneWakeLock() {
  Reflect.deleteProperty(globalThis.navigator, 'wakeLock')
}

beforeEach(() => {
  entferneWakeLock()
})

afterEach(() => {
  entferneWakeLock()
  vi.restoreAllMocks()
})

describe('useWakeLock', () => {
  it('fordert den Wake Lock beim Mounten an', async () => {
    const request = vi.fn().mockResolvedValue(fakeSentinel())
    stubWakeLock(request)

    await act(async () => {
      renderHook(() => useWakeLock())
    })

    expect(request).toHaveBeenCalledWith('screen')
  })

  it('gibt den Wake Lock beim Unmounten wieder frei', async () => {
    const sentinel = fakeSentinel()
    stubWakeLock(vi.fn().mockResolvedValue(sentinel))

    let unmount = () => {}
    await act(async () => {
      unmount = renderHook(() => useWakeLock()).unmount
    })
    await act(async () => {
      unmount()
    })

    expect(sentinel.release).toHaveBeenCalled()
  })

  it('fordert nichts an, solange er nicht aktiv ist', async () => {
    const request = vi.fn().mockResolvedValue(fakeSentinel())
    stubWakeLock(request)

    await act(async () => {
      renderHook(() => useWakeLock(false))
    })

    expect(request).not.toHaveBeenCalled()
  })

  it('kommt ohne die API aus, ohne zu werfen', async () => {
    // navigator.wakeLock fehlt (iOS-Safari, ältere Browser, unsicherer Kontext)
    await expect(
      act(async () => {
        renderHook(() => useWakeLock())
      }),
    ).resolves.not.toThrow()
  })

  it('schluckt eine abgelehnte Anfrage', async () => {
    // Das System verweigert den Lock z.B. bei niedrigem Akkustand.
    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    stubWakeLock(request)

    await expect(
      act(async () => {
        renderHook(() => useWakeLock())
      }),
    ).resolves.not.toThrow()
    expect(request).toHaveBeenCalled()
  })

  it('fordert nach der Rückkehr in den Vordergrund erneut an', async () => {
    // Beim Tab-Wechsel gibt das System den Lock frei — sonst bliebe er für den Rest
    // des Spiels weg, und genau dann schläft das Display wieder ein.
    const ersterLock = fakeSentinel()
    const request = vi.fn().mockResolvedValue(ersterLock)
    stubWakeLock(request)

    await act(async () => {
      renderHook(() => useWakeLock())
    })
    expect(request).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await act(async () => {
      ersterLock.vomSystemFreigeben()
      document.dispatchEvent(new Event('visibilitychange'))
    })

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(request).toHaveBeenCalledTimes(2)
  })
})
