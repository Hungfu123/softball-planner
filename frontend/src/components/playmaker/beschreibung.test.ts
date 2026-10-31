import { describe, expect, it } from 'vitest'
import { beschreibung } from './beschreibung'
import type { Play, PlayStep } from './board/types'

const stand = (ordinal: number, outs: number, runner: number): PlayStep => ({
  ordinal,
  durationMs: 1200,
  note: null,
  outs,
  markers: {
    defenders: [],
    runners: Array.from({ length: runner }, (_, i) => ({
      id: `r${i}`,
      x: 100,
      y: 100,
      status: 'ACTIVE' as const,
    })),
    ball: { state: 'AT_BAT', holder: null, x: 155, y: 218, trajectory: 'GROUND' },
  },
})

const play = (steps: PlayStep[]): Play => ({
  id: 1,
  title: 'Test',
  categoryId: 1,
  gameState: 'ANY',
  gameStateNote: null,
  counterpartPlayId: null,
  steps,
})

describe('beschreibung', () => {
  it('schreibt die Ausgangslage aus dem ersten Stand', () => {
    expect(beschreibung(play([stand(1, 1, 2), stand(2, 1, 2)]))).toBe('2 Runner · 1 Out · 2 Stände')
  })

  it('sagt „1 Stand", nicht „1 Stände"', () => {
    // Die Standard-Aufstellung hat genau einen — und stand als „1 Stände" in der Liste.
    expect(beschreibung(play([stand(1, 0, 0)]))).toBe('Keine Runner · 0 Outs · 1 Stand')
  })

  it('kommt ohne Staende aus', () => {
    expect(beschreibung(play([]))).toBe('0 Stände')
  })
})
