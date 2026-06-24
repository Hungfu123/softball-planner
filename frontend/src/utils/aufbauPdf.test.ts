import { describe, it, expect } from 'vitest'
import { formatItemLine, partitionByLocation, generateAufbauPdf } from './aufbauPdf'
import type { EquipmentItem } from '@/types'

const mk = (p: Partial<EquipmentItem>): EquipmentItem =>
  ({ id: 1, name: 'X', quantity: 1, storageLocation: null, notes: null, ...p })

describe('formatItemLine', () => {
  it('ohne Menge bei 1', () => expect(formatItemLine(mk({ name: 'Bases', quantity: 1 }))).toBe('Bases'))
  it('mit ×N bei >1', () => expect(formatItemLine(mk({ name: 'Bänke', quantity: 5 }))).toBe('Bänke ×5'))
})

describe('partitionByLocation', () => {
  it('trennt Lageplan-Orte von anderen, null→Ohne Ort', () => {
    const items = [
      mk({ id: 1, name: 'Backstop', storageLocation: 'Garage' }),
      mk({ id: 2, name: 'Bier', storageLocation: 'bei Hung' }),
      mk({ id: 3, name: 'Wasser', storageLocation: null }),
    ]
    const { mapGroups, otherGroups } = partitionByLocation(items)
    expect(mapGroups.map(g => g.name)).toEqual(['Garage'])
    expect(otherGroups.map(g => g.name).sort()).toEqual(['Ohne Ort', 'bei Hung'].sort())
  })

  it('gruppiert mehrere Items je Ort', () => {
    const { mapGroups } = partitionByLocation([
      mk({ id: 1, name: 'A', storageLocation: 'Halle' }),
      mk({ id: 2, name: 'B', storageLocation: 'Halle' }),
    ])
    expect(mapGroups).toHaveLength(1)
    expect(mapGroups[0].items.map(i => i.name)).toEqual(['A', 'B'])
  })
})

describe('generateAufbauPdf', () => {
  it('läuft ohne Exception', () => {
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    try {
      expect(() => generateAufbauPdf([
        mk({ id: 1, name: 'Backstop', quantity: 1, storageLocation: 'Garage' }),
        mk({ id: 2, name: 'Bänke', quantity: 5, storageLocation: 'Garage', notes: 'klappbar' }),
        mk({ id: 3, name: 'Bier', quantity: 2, storageLocation: 'bei Hung' }),
        mk({ id: 4, name: 'Wasser', storageLocation: null }),
      ])).not.toThrow()
    } finally {
      HTMLAnchorElement.prototype.click = orig
    }
  })
})
