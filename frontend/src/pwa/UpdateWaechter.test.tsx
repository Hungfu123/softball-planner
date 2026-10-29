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
import { AUFBAU_FENSTER_MS, HINWEIS_MS, TAFEL_GEDULD_MS } from './appUpdate'

/** Stellt die Seite auf sichtbar/verborgen und löst das Ereignis aus, an dem der Wächter hängt. */
function wechsleSichtbarkeit(sichtbar: boolean) {
  Object.defineProperty(document, 'visibilityState', { value: sichtbar ? 'visible' : 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

function aufPfad(pfad: string) {
  window.history.pushState({}, '', pfad)
}

/**
 * Laesst den Zweig beim Aufbau verstreichen (er haengt an einem Timeout 0), damit ein Test
 * den Weg ueber den Vordergrund fuer sich pruefen kann.
 */
function aufbauAbwarten() {
  act(() => { vi.advanceTimersByTime(0) })
}

/** Als waere in dieser Tab-Sitzung schon einmal beim Aufbau geladen worden. */
function schonBeimAufbauGeladen() {
  sessionStorage.setItem('update-beim-aufbau-geladen', '1')
}

describe('UpdateWaechter', () => {
  beforeEach(() => {
    h.neueFassungDa = false
    h.updateServiceWorker.mockReset()
    h.registriert = null
    aufPfad('/')
    sessionStorage.clear()
    // jsdom startet sichtbar; der Zweig beim Aufbau haengt daran, also ausdruecklich stellen.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    // Die Seite gilt als gerade aufgebaut. In jsdom laeuft performance.now() seit dem Aufbau
    // der Testumgebung weiter — ungestellt haenge der Zweig an der Laufzeit der Suite.
    vi.spyOn(performance, 'now').mockReturnValue(0)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /** Als laege der Aufbau der Seite schon lange zurueck. */
  function laengstAufgebaut() {
    vi.spyOn(performance, 'now').mockReturnValue(AUFBAU_FENSTER_MS + 1)
  }

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
    schonBeimAufbauGeladen()
    render(<UpdateWaechter />)
    act(() => { wechsleSichtbarkeit(true) })
    tafelAbwarten()
    // true heißt: Service Worker übernimmt und die Seite lädt neu.
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('zeigt erst die Tafel und wechselt dann — nicht umgekehrt', () => {
    // Ohne die Tafel springt die Seite unerklärt, wenn jemand gerade hinsieht.
    h.neueFassungDa = true
    schonBeimAufbauGeladen()
    render(<UpdateWaechter />)
    aufbauAbwarten()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => { wechsleSichtbarkeit(true) })
    expect(screen.getByRole('status')).toHaveTextContent('Neue Version wird geladen')
    expect(h.updateServiceWorker).not.toHaveBeenCalled()

    tafelAbwarten()
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('wechselt nur einmal, auch wenn die App mehrfach nach vorn kommt', () => {
    h.neueFassungDa = true
    schonBeimAufbauGeladen()
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
    // Schon beim Aufbau im Hintergrund: sonst greift der Aufbau-Zweig vorher.
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    render(<UpdateWaechter />)
    aufbauAbwarten()
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

  /*
   * Der Zweig beim Aufbau. Er ersetzt etwas, das unter `autoUpdate` von selbst geschah: dort
   * uebernahm der neue Service Worker ungefragt, und das zweite Neuladen zeigte die neue
   * Fassung. Mit `prompt` wartet er — ohne diesen Zweig brächte ein Neuladen von Hand für
   * immer dieselbe alte Seite, und in der installierten App ist das Ziehen der einzige
   * Handgriff, den es gibt.
   */
  it('lädt schon beim Aufbau neu, wenn eine neue Fassung wartet', () => {
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    aufbauAbwarten()
    expect(screen.getByRole('status')).toHaveTextContent('Neue Version wird geladen')
    tafelAbwarten()
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('nimmt die Bremse wieder heraus, sobald nichts mehr ansteht', () => {
    // Sonst hielte sie die ganze Tab-Sitzung: wer morgens aktualisiert hat, bekaeme
    // nachmittags beim Ziehen wieder nichts.
    schonBeimAufbauGeladen()
    h.neueFassungDa = false
    render(<UpdateWaechter />)
    expect(sessionStorage.getItem('update-beim-aufbau-geladen')).toBeNull()
  })

  it('nimmt die Tafel zurück, wenn der Wechsel ausbleibt', () => {
    // `updateServiceWorker(true)` laedt erst, wenn der neue Service Worker uebernimmt.
    // Tut er das nie, stuende sonst ein bildschirmfuellender Vorhang ohne Ausweg.
    h.neueFassungDa = true
    render(<UpdateWaechter />)
    aufbauAbwarten()
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(HINWEIS_MS + TAFEL_GEDULD_MS + 1) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('tut das höchstens einmal je Tab-Sitzung', () => {
    // Käme die neue Fassung nicht an, fände die neu gebaute Seite dieselbe wartende wieder
    // vor — ohne Bremse liefe das im Kreis.
    h.neueFassungDa = true
    const { unmount } = render(<UpdateWaechter />)
    aufbauAbwarten()
    tafelAbwarten()
    expect(h.updateServiceWorker).toHaveBeenCalledTimes(1)

    unmount()
    h.updateServiceWorker.mockReset()
    render(<UpdateWaechter />)
    aufbauAbwarten()
    tafelAbwarten()
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('lädt beim Aufbau nicht neu, während ein Spiel mitgeschrieben wird', () => {
    h.neueFassungDa = true
    aufPfad('/spielbogen/9')
    render(<UpdateWaechter />)
    aufbauAbwarten()
    tafelAbwarten()
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
    // Und die Bremse bleibt ungenutzt: der nächste Aufbau darf es wieder versuchen.
    expect(sessionStorage.getItem('update-beim-aufbau-geladen')).toBeNull()
  })

  it('lädt nicht beim Aufbau neu, wenn der schon lange zurückliegt', () => {
    // Die stündliche Nachfrage findet irgendwann etwas. Dann gilt wieder die vorsichtige
    // Regel: erst beim nächsten Wechsel in den Vordergrund — sonst spränge die Seite
    // jemandem weg, der gerade ein Formular ausfüllt.
    h.neueFassungDa = true
    laengstAufgebaut()
    render(<UpdateWaechter />)
    aufbauAbwarten()
    tafelAbwarten()
    expect(h.updateServiceWorker).not.toHaveBeenCalled()

    act(() => { wechsleSichtbarkeit(true) })
    tafelAbwarten()
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('lädt beim Aufbau nicht neu, wenn die Seite im Hintergrund liegt', () => {
    h.neueFassungDa = true
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    render(<UpdateWaechter />)
    aufbauAbwarten()
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
