import { describe, it, expect } from 'vitest'
import { parseStatsView, sichtbareStatsView } from './statsView'

describe('parseStatsView', () => {
  it('liest „games"', () => {
    expect(parseStatsView('games')).toBe('games')
  })

  it('deutet alles andere als Schlagen', () => {
    for (const roh of [null, '', 'batting', 'Games', 'unsinn']) {
      expect(parseStatsView(roh)).toBe('batting')
    }
  })
})

describe('sichtbareStatsView', () => {
  it('lässt dem Trainer beide Ansichten', () => {
    expect(sichtbareStatsView('games', true)).toBe('games')
    expect(sichtbareStatsView('batting', true)).toBe('batting')
  })

  /*
   * Die Einsatz-Tabelle stellt den ganzen Kader nebeneinander. Fuer Spieler faellt sie auf
   * Schlagen zurueck — auch wenn die URL ausdruecklich danach fragt, sonst waere der fehlende
   * Reiter eine Attrappe.
   */
  it('schickt den Spieler auch bei ?view=games auf Schlagen', () => {
    expect(sichtbareStatsView('games', false)).toBe('batting')
  })

  it('lässt dem Spieler Schlagen', () => {
    expect(sichtbareStatsView('batting', false)).toBe('batting')
    expect(sichtbareStatsView(null, false)).toBe('batting')
  })
})
