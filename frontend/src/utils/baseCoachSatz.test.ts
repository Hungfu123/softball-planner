import { describe, expect, it } from 'vitest'
import { baseCoachSatz } from './baseCoachSatz'

describe('baseCoachSatz', () => {
  it('nennt beide Startcoaches, wenn keine Base benannt ist', () => {
    expect(baseCoachSatz({ firstBase: null, thirdBase: null, startCoaches: ['Anne', 'Martin'] }))
      .toBe('Coaches: Anne, Martin, dann letzte Outs')
  })

  it('nennt den Namen und die Regel, wenn nur 1B benannt ist', () => {
    expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: null, startCoaches: ['Martin'] }))
      .toBe('1B Jan · 3B Martin, dann letzte Outs')
  })

  it('nennt den Namen und die Regel, wenn nur 3B benannt ist', () => {
    expect(baseCoachSatz({ firstBase: null, thirdBase: 'Mike', startCoaches: ['Martin'] }))
      .toBe('3B Mike · 1B Martin, dann letzte Outs')
  })

  it('nennt nur die Namen, wenn beide benannt sind', () => {
    expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: 'Mike', startCoaches: [] }))
      .toBe('1B Jan · 3B Mike')
  })

  it('nennt nur den Namen, wenn die Aufstellung leer ist', () => {
    expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: null, startCoaches: [] })).toBe('1B Jan')
    expect(baseCoachSatz({ firstBase: null, thirdBase: 'Mike', startCoaches: [] })).toBe('3B Mike')
  })

  it('schweigt, wenn nichts da ist', () => {
    expect(baseCoachSatz({ firstBase: null, thirdBase: null, startCoaches: [] })).toBeNull()
    expect(baseCoachSatz(undefined)).toBeNull()
  })

  it('sagt immer, dass die Nennung nur der Anfang ist', () => {
    // Der eigentliche Zweck des Satzes: ohne diesen Zusatz lasen ihn Leute als
    // „die beiden coachen das ganze Spiel".
    for (const a of [
      { firstBase: null, thirdBase: null, startCoaches: ['Anne', 'Martin'] },
      { firstBase: 'Jan', thirdBase: null, startCoaches: ['Martin'] },
      { firstBase: null, thirdBase: 'Mike', startCoaches: ['Martin'] },
    ]) {
      expect(baseCoachSatz(a)).toContain('dann letzte Outs')
    }
  })

  it('bleibt in einer Zeile', () => {
    // Gemessen, nicht geschätzt: der PDF-Block ist 100 mm breit, Helvetica 7 pt
    // trägt dort rund 80 Zeichen. 60 ist der Abstand, den wir davon halten.
    const satz = baseCoachSatz({
      firstBase: null, thirdBase: null, startCoaches: ['Konstantin', 'Madita'],
    })!
    expect(satz.length).toBeLessThanOrEqual(60)
  })
})
