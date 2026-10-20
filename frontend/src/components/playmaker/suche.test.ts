import { describe, expect, test } from 'vitest'
import { normalisiere, trefferIn } from './suche'
import { DEFAULT_DEFENSE, POSITIONS } from './board/geometry'
import type { Play, PlayStep } from './board/types'

function stand(ordinal: number, note: string | null): PlayStep {
  return {
    ordinal,
    durationMs: 1200,
    note,
    outs: 0,
    markers: {
      defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
      runners: [],
      ball: { state: 'AT_BAT', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' },
    },
  }
}

const play = (over: Partial<Play> = {}): Play => ({
  id: 1,
  title: 'Überwurf an der 1 — wer sichert ab',
  categoryId: 7,
  gameState: 'ANY',
  gameStateNote: null,
  counterpartPlayId: null,
  steps: [stand(1, 'Der SS hat den Grounder.'), stand(2, 'RF sichert im Foul-Gebiet ab.')],
  ...over,
})

describe('normalisiere', () => {
  test('macht Umlaute und ss in beide Richtungen vergleichbar', () => {
    // Wer "ueberwurf" tippt, meint "Überwurf" — und umgekehrt.
    expect(normalisiere('Überwurf')).toBe(normalisiere('ueberwurf'))
    expect(normalisiere('Überwurf')).toBe(normalisiere('überwurf'))
    expect(normalisiere('Fuß')).toBe(normalisiere('fuss'))
  })
})

describe('trefferIn', () => {
  test('findet im Titel und nennt ihn als Fundstelle', () => {
    expect(trefferIn(play(), 'sichert')).toEqual({ feld: 'titel', text: 'Überwurf an der 1 — wer sichert ab' })
  })

  test('findet in der Notiz eines spaeten Standes', () => {
    const t = trefferIn(play(), 'foul-gebiet')
    expect(t).toEqual({ feld: 'notiz', text: 'RF sichert im Foul-Gebiet ab.' })
  })

  test('findet ueber den Kategorienamen', () => {
    expect(trefferIn(play(), 'coverage', 'Base-Coverage')?.feld).toBe('kategorie')
  })

  test('findet in der Begruendung der Spiellage', () => {
    const p = play({ gameState: 'CLOSE_LATE', gameStateNote: 'Knapp: der Run darf nicht fallen.' })
    expect(trefferIn(p, 'run darf nicht')?.feld).toBe('lage')
  })

  test('der Titel schlaegt die Notiz', () => {
    // "sichert" steht in beidem. Gezeigt wird das Staerkere.
    expect(trefferIn(play(), 'sichert')?.feld).toBe('titel')
  })

  test('leere Eingabe ist kein Treffer, sondern gar keine Suche', () => {
    expect(trefferIn(play(), '   ')).toBeNull()
  })

  test('was nicht vorkommt, kommt nicht vor', () => {
    expect(trefferIn(play(), 'squeeze')).toBeNull()
  })
})
