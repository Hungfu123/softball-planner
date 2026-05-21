import { describe, it, expect } from 'vitest'
import { getDisplayName } from './pdfExport'

describe('getDisplayName', () => {
  it('returns full name when single word', () => {
    expect(getDisplayName('Cher')).toBe('Cher')
  })

  it('returns last name for two-part name', () => {
    expect(getDisplayName('Max Muster')).toBe('Muster')
  })

  it('returns last name for multi-part name', () => {
    expect(getDisplayName('Hans Peter von Müller')).toBe('Müller')
  })

  it('returns initial + last name when last name longer than 12 chars', () => {
    expect(getDisplayName('Max Mustermannlanger')).toBe('M. Mustermannl…')
  })

  it('returns last name unchanged when 11 chars (within ≤12 threshold)', () => {
    expect(getDisplayName('Max Zwölfzeichn')).toBe('Zwölfzeichn')
  })

  it('returns last name unchanged when exactly 12 chars (inclusive threshold)', () => {
    expect(getDisplayName('Max Zwölfzeichen')).toBe('Zwölfzeichen')
  })

  it('switches to Initial + LastName at 13 chars (above threshold)', () => {
    expect(getDisplayName('Max Dreizehnzeich')).toBe('M. Dreizehnzei…')
  })

  it('truncates very long single name with ellipsis', () => {
    expect(getDisplayName('Sehrlangereinwortnamehier')).toBe('Sehrlangereinw…')
  })

  it('handles empty string', () => {
    expect(getDisplayName('')).toBe('')
  })

  it('handles extra whitespace', () => {
    expect(getDisplayName('  Max   Muster  ')).toBe('Muster')
  })

  it('uses initial of first word when last name exceeds threshold', () => {
    expect(getDisplayName('Theodor Reichenbach-Schwarzheim')).toBe('T. Reichenbach…')
  })
})
