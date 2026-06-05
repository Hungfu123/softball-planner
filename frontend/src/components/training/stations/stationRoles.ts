import type { StationType } from '@/types'
import type { Station } from './deriveStations'

export type SlotRole = 'active' | 'passive' | 'single'
export interface PlayerSlot { number: number; role: SlotRole; roleLabel: string }
export interface StationWithSlots extends Station { slots: PlayerSlot[] }
export interface Assignment { stations: StationWithSlots[]; outfield: number[] }

const ROLE_LABELS: Record<StationType, { active: string; passive: string }> = {
  LIVE: { active: 'schlägt', passive: 'tosst' },
  TEE: { active: 'schlägt', passive: 'Hilfe' },
  BUNT: { active: 'buntet', passive: 'wirft' },
  KORKEN: { active: 'schlägt', passive: 'tosst' },
  HUETCHEN: { active: 'schlägt', passive: 'tosst' },
  OTHER: { active: 'schlägt', passive: 'tosst' },
}

const isSingle = (s: Station): boolean => s.choiceGroup != null

export function assignPlayers(stations: Station[], playerCount = 0): Assignment {
  let n = 1
  const withSlots: StationWithSlots[] = stations.map(s => {
    if (isSingle(s)) {
      const slot: PlayerSlot = { number: n, role: 'single', roleLabel: '' }
      n += 1
      return { ...s, slots: [slot] }
    }
    const labels = ROLE_LABELS[s.type]
    const slots: PlayerSlot[] = [
      { number: n, role: 'active', roleLabel: labels.active },
      { number: n + 1, role: 'passive', roleLabel: labels.passive },
    ]
    n += 2
    return { ...s, slots }
  })
  const outfield: number[] = []
  for (let p = n; p <= playerCount; p += 1) outfield.push(p)
  return { stations: withSlots, outfield }
}
