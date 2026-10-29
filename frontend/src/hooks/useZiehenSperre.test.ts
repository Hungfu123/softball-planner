import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useZiehenSperre, ZIEHEN_ATTRIBUT } from './useZiehenSperre'

/** Ein Router, der nur das kann, was die Sperre von ihm braucht. */
function router() {
  let hoerer: ((z: { location: { pathname: string } }) => void) | null = null
  return {
    subscribe(h: (z: { location: { pathname: string } }) => void) {
      hoerer = h
      return () => { hoerer = null }
    },
    gehe(pathname: string) {
      hoerer?.({ location: { pathname } })
    },
    get laeuftNoch() {
      return hoerer !== null
    },
  }
}

function gesperrt() {
  return document.documentElement.hasAttribute(ZIEHEN_ATTRIBUT)
}

function stehtAuf(pfad: string) {
  window.history.replaceState({}, '', pfad)
}

afterEach(() => {
  document.documentElement.removeAttribute(ZIEHEN_ATTRIBUT)
  stehtAuf('/')
})

describe('useZiehenSperre', () => {
  it('lässt das Ziehen auf gewöhnlichen Seiten offen', () => {
    const r = router()
    renderHook(() => useZiehenSperre(r))
    expect(gesperrt()).toBe(false)

    r.gehe('/spielbetrieb')
    expect(gesperrt()).toBe(false)
  })

  it('sperrt es auf den Scoring-Seiten', () => {
    const r = router()
    renderHook(() => useZiehenSperre(r))

    r.gehe('/gameday/12/scoring/1')
    expect(gesperrt()).toBe(true)

    r.gehe('/spielbogen/7')
    expect(gesperrt()).toBe(true)
  })

  it('gibt es beim Verlassen der Scoring-Seite wieder frei', () => {
    const r = router()
    renderHook(() => useZiehenSperre(r))

    r.gehe('/spielbogen/7')
    expect(gesperrt()).toBe(true)

    r.gehe('/spielbogen')
    expect(gesperrt()).toBe(false)
  })

  it('sperrt auch, wenn die App direkt auf einer Scoring-Seite startet', () => {
    // Wer dort startet, navigiert nie — der Router meldet sich also nie.
    stehtAuf('/gameday/12/scoring/2')
    const r = router()
    renderHook(() => useZiehenSperre(r))
    expect(gesperrt()).toBe(true)
  })

  it('hört beim Abbau wieder auf zuzuhören', () => {
    const r = router()
    const { unmount } = renderHook(() => useZiehenSperre(r))
    expect(r.laeuftNoch).toBe(true)

    unmount()
    expect(r.laeuftNoch).toBe(false)
  })
})
