import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

/*
 * `virtual:pwa-register/react` gibt es nur im Vite-Build, nicht in Vitest. Der Mock liefert
 * deshalb selbst, was der echte Haken liefert — und erlaubt uns, den Fall "neue Fassung da"
 * zu stellen, den man sonst nur mit einem echten Deploy herbeiführt.
 */
const h = vi.hoisted(() => ({
  neueFassungDa: false,
  updateServiceWorker: vi.fn(),
  registriert: null as ((url: string, r: unknown) => void) | null,
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (optionen: { onRegisteredSW?: (url: string, r: unknown) => void }) => {
    h.registriert = optionen.onRegisteredSW ?? null
    return { needRefresh: [h.neueFassungDa, vi.fn()], updateServiceWorker: h.updateServiceWorker }
  },
}))

import { UpdateWaechter } from './UpdateWaechter'

/** Stellt die Seite auf sichtbar/verborgen und löst das Ereignis aus, an dem der Wächter hängt. */
function wechsleSichtbarkeit(sichtbar: boolean) {
  Object.defineProperty(document, 'visibilityState', { value: sichtbar ? 'visible' : 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

function aufPfad(pfad: string) {
  window.history.pushState({}, '', pfad)
}

describe('UpdateWaechter', () => {
  beforeEach(() => {
    h.neueFassungDa = false
    h.updateServiceWorker.mockReset()
    h.registriert = null
    aufPfad('/')
  })

  it('lädt nicht neu, solange keine neue Fassung da ist', () => {
    render(<UpdateWaechter />)
    wechsleSichtbarkeit(true)
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('lädt neu, wenn die App mit neuer Fassung in den Vordergrund kommt', () => {
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    wechsleSichtbarkeit(true)
    // true heißt: Service Worker übernimmt und die Seite lädt neu.
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('lädt nicht neu, während ein Spiel mitgeschrieben wird', () => {
    h.neueFassungDa = true
    aufPfad('/gameday/4/scoring/0')
    render(<UpdateWaechter />)
    wechsleSichtbarkeit(true)
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('lädt nicht neu, wenn die App in den Hintergrund geht', () => {
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    wechsleSichtbarkeit(false)
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('hört auf zu horchen, wenn er verschwindet', () => {
    h.neueFassungDa = true
    const { unmount } = render(<UpdateWaechter />)
    unmount()
    wechsleSichtbarkeit(true)
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('fragt in Abständen von selbst nach — eine stehende App navigiert nicht', () => {
    vi.useFakeTimers()
    try {
      render(<UpdateWaechter />)
      const update = vi.fn()
      h.registriert?.('/sw.js', { update })
      expect(update).not.toHaveBeenCalled()
      vi.advanceTimersByTime(60 * 60 * 1000)
      expect(update).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
