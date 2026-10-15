import { describe, it, expect } from 'vitest'
import { trainingYearStart } from './trainingYear'

describe('trainingYearStart', () => {
  it('nimmt den 1. November desselben Jahres, sobald November erreicht ist', () => {
    expect(trainingYearStart('2026-11-01')).toBe('2026-11-01')
    expect(trainingYearStart('2026-11-20')).toBe('2026-11-01')
    expect(trainingYearStart('2026-12-24')).toBe('2026-11-01')
  })

  it('greift vor November auf das Vorjahr zurück', () => {
    expect(trainingYearStart('2026-10-31')).toBe('2025-11-01')
    expect(trainingYearStart('2027-01-10')).toBe('2026-11-01')
    expect(trainingYearStart('2027-02-14')).toBe('2026-11-01')
    expect(trainingYearStart('2027-10-31')).toBe('2026-11-01')
  })

  it('zieht das Fenster über die Saison auf statt es mitzuschieben', () => {
    // Februar-Turnier und Oktober-Spieltag desselben Trainingsjahres teilen den Anfang —
    // deshalb waechst das Fenster, statt wie ein rollendes Fenster hinten abzuschneiden.
    expect(trainingYearStart('2027-02-14')).toBe(trainingYearStart('2027-10-03'))
  })
})
