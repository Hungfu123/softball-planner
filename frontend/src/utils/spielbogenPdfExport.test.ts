import { describe, it, expect } from 'vitest'
import { formatStartTime } from './spielbogenPdfExport'

describe('formatStartTime', () => {
  it('formatiert eine gesetzte Startzeit als HH:MM', () => {
    // 14:05 UTC an einem beliebigen Tag — Ergebnis haengt von der Test-Timezone ab (Europe/Berlin
    // in CI), daher hier ueber new Date(...).toLocaleTimeString gegengerechnet statt hart codiert.
    const iso = '2026-08-10T14:05:00Z'
    expect(formatStartTime(iso)).toBe(
      new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    )
  })

  it('bleibt leer ohne gestartete Uhr (null)', () => {
    expect(formatStartTime(null)).toBe('')
  })

  it('bleibt leer ohne gestartete Uhr (undefined)', () => {
    expect(formatStartTime(undefined)).toBe('')
  })

  it('bleibt leer bei einem kaputten Zeitstempel statt zu crashen', () => {
    expect(formatStartTime('nicht-valide')).toBe('')
  })
})
