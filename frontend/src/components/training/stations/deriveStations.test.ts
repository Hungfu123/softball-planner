import { describe, it, expect } from 'vitest'
import { deriveStations } from './deriveStations'
import type { TrainingPlanSectionResponse } from '@/types'

function section(partial: Partial<TrainingPlanSectionResponse>): TrainingPlanSectionResponse {
  return {
    drillId: null, sectionType: null, title: null, durationMinutes: null,
    rounds: null, adaptationNotes: null, rotationPlan: null, setupNotes: null,
    tips: null, groupSetup: null, userNotes: null, parallelGroup: null,
    playersPerGroup: null, ...partial,
  }
}

describe('deriveStations', () => {
  it('returns only sections with a stationType, numbered in order', () => {
    const stations = deriveStations([
      section({ title: 'Warmup' }),
      section({ title: 'Live', stationType: 'LIVE' }),
      section({ title: 'Tee', stationType: 'TEE' }),
    ])
    expect(stations).toHaveLength(2)
    expect(stations[0]).toMatchObject({ rotation: 1, label: 'Live', type: 'LIVE' })
    expect(stations[1]).toMatchObject({ rotation: 2, label: 'Tee', type: 'TEE' })
  })

  it('carries level, parallelGroup and choiceGroup through', () => {
    const stations = deriveStations([
      section({ title: 'A', stationType: 'HUETCHEN', stationLevel: 'ADVANCED', parallelGroup: 2, stationChoiceGroup: 1 }),
    ])
    expect(stations[0]).toMatchObject({ level: 'ADVANCED', parallelGroup: 2, choiceGroup: 1 })
  })

  it('falls back to a generic label when title is missing', () => {
    const stations = deriveStations([section({ title: null, stationType: 'BUNT' })])
    expect(stations[0].label).toBe('Station')
  })

  it('returns empty array when no section is a station', () => {
    expect(deriveStations([section({ title: 'x' })])).toEqual([])
  })
})
