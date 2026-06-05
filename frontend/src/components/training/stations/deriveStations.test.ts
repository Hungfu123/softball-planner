import { describe, it, expect } from 'vitest'
import { resolveStations, toDiagramStations, DEFAULT_STATIONS } from './deriveStations'
import type { TrainingStation } from '@/types'

describe('resolveStations', () => {
  it('falls back to the default set when none stored (Live first, with positions)', () => {
    const stations = resolveStations(null)
    expect(stations.map(s => s.type)).toEqual(['LIVE', 'TEE', 'BUNT', 'KORKEN', 'HUETCHEN', 'TEE'])
    expect(stations[0]).toMatchObject({ rotation: 1, label: 'Live', x: 0.95, y: 0.05 })
    // Wahl-Paar Hütchen + Tee(Besen), ohne Level
    expect(stations[4]).toMatchObject({ type: 'HUETCHEN', choiceGroup: 1, level: null })
    expect(stations[5]).toMatchObject({ label: 'Tee (Besen)', choiceGroup: 1, level: null })
  })

  it('uses the stored set when present', () => {
    const stored: TrainingStation[] = [{ type: 'KORKEN' }, { type: 'HUETCHEN' }]
    expect(resolveStations(stored).map(s => s.type)).toEqual(['KORKEN', 'HUETCHEN'])
  })

  it('treats an empty list as "use default"', () => {
    expect(resolveStations([]).map(s => s.type)).toEqual(DEFAULT_STATIONS.map(s => s.type))
  })
})

describe('toDiagramStations', () => {
  it('numbers stations and carries label/level/choiceGroup through', () => {
    const result = toDiagramStations([
      { type: 'HUETCHEN', label: 'Footwork', level: 'ADVANCED', choiceGroup: 1 },
      { type: 'TEE', level: 'BEGINNER', choiceGroup: 1 },
    ])
    expect(result[0]).toMatchObject({ rotation: 1, label: 'Footwork', type: 'HUETCHEN', level: 'ADVANCED', choiceGroup: 1 })
    expect(result[1]).toMatchObject({ rotation: 2, type: 'TEE', level: 'BEGINNER', choiceGroup: 1 })
  })

  it('falls back to the type meta label when no custom label', () => {
    expect(toDiagramStations([{ type: 'BUNT' }])[0].label).toBe('Bunt')
  })
})
