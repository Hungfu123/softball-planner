import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

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
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Laesst die Tafel ablaufen, nach der erst gewechselt wird. */
  function tafelAbwarten() {
    act(() => { vi.advanceTimersByTime(1000) })
  }

  it('lädt nicht neu, solange keine neue Fassung da ist', () => {
    render(<UpdateWaechter />)
    wechsleSichtbarkeit(true)
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('lädt neu, wenn die App mit neuer Fassung in den Vordergrund kommt', () => {
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    act(() => { wechsleSichtbarkeit(true) })
    tafelAbwarten()
    // true heißt: Service Worker übernimmt und die Seite lädt neu.
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('zeigt erst die Tafel und wechselt dann — nicht umgekehrt', () => {
    // Ohne die Tafel springt die Seite unerklärt, wenn jemand gerade hinsieht.
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => { wechsleSichtbarkeit(true) })
    expect(screen.getByRole('status')).toHaveTextContent('Neue Version wird geladen')
    expect(h.updateServiceWorker).not.toHaveBeenCalled()

    tafelAbwarten()
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('wechselt nur einmal, auch wenn die App mehrfach nach vorn kommt', () => {
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    act(() => { wechsleSichtbarkeit(true) })
    act(() => { wechsleSichtbarkeit(true) })
    tafelAbwarten()
    expect(h.updateServiceWorker).toHaveBeenCalledTimes(1)
  })

  it('lädt nicht neu, während ein Spiel mitgeschrieben wird', () => {
    h.neueFassungDa = true
    aufPfad('/gameday/4/scoring/0')
    render(<UpdateWaechter />)
    act(() => { wechsleSichtbarkeit(true) })
    tafelAbwarten()
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
    // Und auch keine Tafel: dort soll gar nichts passieren.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('lädt nicht neu, wenn die App in den Hintergrund geht', () => {
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    act(() => { wechsleSichtbarkeit(false) })
    tafelAbwarten()
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('hört auf zu horchen, wenn er verschwindet', () => {
    h.neueFassungDa = true
    const { unmount } = render(<UpdateWaechter />)
    unmount()
    act(() => { wechsleSichtbarkeit(true) })
    tafelAbwarten()
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('fragt in Abständen von selbst nach — eine stehende App navigiert nicht', () => {
    render(<UpdateWaechter />)
    const update = vi.fn()
    h.registriert?.('/sw.js', { update })
    expect(update).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(60 * 60 * 1000) })
    expect(update).toHaveBeenCalledTimes(1)
  })
})
