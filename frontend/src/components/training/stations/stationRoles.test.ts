import { describe, it, expect } from 'vitest'
import { assignPlayers } from './stationRoles'
import { resolveStations } from './deriveStations'

describe('assignPlayers', () => {
  it('numbers default stations: odd=active, even=passive, singles for choiceGroup', () => {
    const { stations, outfield } = assignPlayers(resolveStations(null), 13)
    expect(stations[0].slots).toEqual([
      { number: 1, role: 'active', roleLabel: 'schlägt' },
      { number: 2, role: 'passive', roleLabel: 'tosst' },
    ])
    expect(stations[2].slots).toEqual([
      { number: 5, role: 'active', roleLabel: 'buntet' },
      { number: 6, role: 'passive', roleLabel: 'wirft' },
    ])
    expect(stations[4].slots).toEqual([{ number: 9, role: 'single', roleLabel: '' }])
    expect(stations[5].slots).toEqual([{ number: 10, role: 'single', roleLabel: '' }])
    expect(outfield).toEqual([11, 12, 13])
  })

  it('returns no outfield when playerCount not given', () => {
    expect(assignPlayers(resolveStations(null)).outfield).toEqual([])
  })

  it('returns no outfield when playerCount <= assigned slots', () => {
    expect(assignPlayers(resolveStations(null), 4).outfield).toEqual([])
  })
})
