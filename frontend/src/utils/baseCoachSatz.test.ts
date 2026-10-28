import { describe, expect, it } from 'vitest'
import { baseCoachSatz } from './baseCoachSatz'

describe('baseCoachSatz', () => {
  it('nennt beide Schlagplätze, wenn keine Base benannt ist', () => {
    expect(baseCoachSatz({ firstBase: null, thirdBase: null, startSlots: [9, 10] }))
      .toBe('Coaches: zuletzt aus · #9 #10')
  })

  it('nennt den Namen und die Regel, wenn nur 1B benannt ist', () => {
    expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: null, startSlots: [10] }))
      .toBe('1B Jan · 3B zuletzt aus · #10')
  })

  it('nennt den Namen und die Regel, wenn nur 3B benannt ist', () => {
    expect(baseCoachSatz({ firstBase: null, thirdBase: 'Mike', startSlots: [10] }))
      .toBe('3B Mike · 1B zuletzt aus · #10')
  })

  it('nennt nur die Namen, wenn beide benannt sind', () => {
    expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: 'Mike', startSlots: [] }))
      .toBe('1B Jan · 3B Mike')
  })

  it('schweigt, wenn nichts da ist', () => {
    expect(baseCoachSatz({ firstBase: null, thirdBase: null, startSlots: [] })).toBeNull()
    expect(baseCoachSatz(undefined)).toBeNull()
  })

  it('bleibt in einer Zeile', () => {
    const satz = baseCoachSatz({ firstBase: null, thirdBase: null, startSlots: [9, 10] })!
    expect(satz.length).toBeLessThanOrEqual(30)
  })
})
