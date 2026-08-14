import { describe, it, expect } from 'vitest'
import {
  INITIAL_STATE,
  addStrike,
  addFoul,
  addBall,
  addOut,
  advanceHalfInning,
  addRun,
  battingTeam,
  type CounterState,
} from './counterRules'

function state(patch: Partial<CounterState> = {}): CounterState {
  return { ...INITIAL_STATE, ...patch }
}

describe('INITIAL_STATE', () => {
  it('startet bei 0 Zählern, Inning 1, oben', () => {
    expect(INITIAL_STATE).toEqual({
      balls: 0, strikes: 0, outs: 0, inning: 1, half: 'top', home: 0, away: 0,
    })
  })
})

describe('addStrike', () => {
  it('zählt von 0 auf 1', () => {
    expect(addStrike(state()).strikes).toBe(1)
  })

  it('zählt von 1 auf 2', () => {
    expect(addStrike(state({ strikes: 1 })).strikes).toBe(2)
  })

  it('macht beim dritten Strike einen Out und setzt den Count zurück', () => {
    const r = addStrike(state({ strikes: 2, balls: 3 }))
    expect(r.outs).toBe(1)
    expect(r.strikes).toBe(0)
    expect(r.balls).toBe(0)
  })

  it('wechselt das Halbinning, wenn der dritte Strike der dritte Out ist', () => {
    const r = addStrike(state({ strikes: 2, outs: 2 }))
    expect(r.outs).toBe(0)
    expect(r.half).toBe('bottom')
  })
})

describe('addFoul', () => {
  it('zählt von 0 auf 1', () => {
    expect(addFoul(state()).strikes).toBe(1)
  })

  it('zählt von 1 auf 2', () => {
    expect(addFoul(state({ strikes: 1 })).strikes).toBe(2)
  })

  it('lässt den Zustand bei 2 Strikes unverändert', () => {
    const before = state({ strikes: 2, balls: 1, outs: 1 })
    expect(addFoul(before)).toEqual(before)
  })
})

describe('addBall', () => {
  it('zählt von 0 auf 1', () => {
    expect(addBall(state()).balls).toBe(1)
  })

  it('zählt von 2 auf 3', () => {
    expect(addBall(state({ balls: 2 })).balls).toBe(3)
  })

  it('setzt beim vierten Ball den Count zurück, ohne Out', () => {
    const r = addBall(state({ balls: 3, strikes: 2, outs: 1 }))
    expect(r.balls).toBe(0)
    expect(r.strikes).toBe(0)
    expect(r.outs).toBe(1)
  })
})

describe('addOut', () => {
  it('zählt von 0 auf 1 und setzt den Count zurück', () => {
    const r = addOut(state({ balls: 2, strikes: 1 }))
    expect(r.outs).toBe(1)
    expect(r.balls).toBe(0)
    expect(r.strikes).toBe(0)
  })

  it('zählt von 1 auf 2', () => {
    expect(addOut(state({ outs: 1 })).outs).toBe(2)
  })

  it('wechselt beim dritten Out das Halbinning und setzt alles zurück', () => {
    const r = addOut(state({ outs: 2, balls: 3, strikes: 2 }))
    expect(r).toMatchObject({ outs: 0, balls: 0, strikes: 0, half: 'bottom', inning: 1 })
  })
})

describe('advanceHalfInning', () => {
  it('geht von oben nach unten, ohne das Inning zu erhöhen', () => {
    const r = advanceHalfInning(state({ inning: 4, half: 'top' }))
    expect(r.half).toBe('bottom')
    expect(r.inning).toBe(4)
  })

  it('geht von unten nach oben und erhöht das Inning', () => {
    const r = advanceHalfInning(state({ inning: 4, half: 'bottom' }))
    expect(r.half).toBe('top')
    expect(r.inning).toBe(5)
  })

  it('setzt Balls, Strikes und Outs zurück, auch ohne dritten Out', () => {
    const r = advanceHalfInning(state({ balls: 2, strikes: 1, outs: 1 }))
    expect(r).toMatchObject({ balls: 0, strikes: 0, outs: 0 })
  })

  it('lässt den Score unangetastet', () => {
    const r = advanceHalfInning(state({ home: 7, away: 5 }))
    expect(r.home).toBe(7)
    expect(r.away).toBe(5)
  })
})

describe('addRun', () => {
  it('erhöht Heim', () => {
    const r = addRun(state({ home: 7, away: 5 }), 'home')
    expect(r.home).toBe(8)
    expect(r.away).toBe(5)
  })

  it('erhöht Gast', () => {
    const r = addRun(state({ home: 7, away: 5 }), 'away')
    expect(r.away).toBe(6)
    expect(r.home).toBe(7)
  })
})

describe('battingTeam', () => {
  it('oben schlägt Gast', () => {
    expect(battingTeam(state({ half: 'top' }))).toBe('away')
  })

  it('unten schlägt Heim', () => {
    expect(battingTeam(state({ half: 'bottom' }))).toBe('home')
  })
})
