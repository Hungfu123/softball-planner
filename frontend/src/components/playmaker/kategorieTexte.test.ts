import { describe, expect, it } from 'vitest'
import { kategorieSatz, kategorieStufe } from './kategorieTexte'

describe('kategorieStufe', () => {
  it('folgt der Sortierung, die der Trainer setzt', () => {
    expect(kategorieStufe(10)).toBe(1)
    expect(kategorieStufe(40)).toBe(2)
    expect(kategorieStufe(80)).toBe(3)
  })
})

describe('kategorieSatz', () => {
  it('hat für jede bekannte Kategorie einen Satz und sonst einen allgemeinen', () => {
    expect(kategorieSatz('Rundown')).toMatch(/Bases/)
    expect(kategorieSatz('Was Neues')).toMatch(/Wer wo steht/)
  })
})
