/**
 * Regel-Logik des Umpire-Counters — pure Funktionen, kein React, kein Storage.
 * Jede Funktion nimmt einen Zustand und gibt einen neuen zurück; nichts wird mutiert.
 * Undo im Hook arbeitet mit Snapshots, es gibt hier bewusst keine Umkehrfunktionen.
 */

export type Half = 'top' | 'bottom'

export interface CounterState {
  balls: number
  strikes: number
  outs: number
  inning: number
  half: Half
  home: number
  away: number
}

const MAX_BALLS = 4
const MAX_STRIKES = 3
const MAX_OUTS = 3

export const INITIAL_STATE: CounterState = {
  balls: 0,
  strikes: 0,
  outs: 0,
  inning: 1,
  half: 'top',
  home: 0,
  away: 0,
}

function clearCount(s: CounterState): CounterState {
  return { ...s, balls: 0, strikes: 0 }
}

/** Halbinning-Wechsel: alles auf 0, Seite kippt. Das Inning steigt nur von unten nach oben. */
export function advanceHalfInning(s: CounterState): CounterState {
  const toTop = s.half === 'bottom'
  return {
    ...s,
    balls: 0,
    strikes: 0,
    outs: 0,
    half: toTop ? 'top' : 'bottom',
    inning: toTop ? s.inning + 1 : s.inning,
  }
}

/** Der dritte Out wechselt sofort das Halbinning — die Tafel steht nie auf 3 Outs. */
export function addOut(s: CounterState): CounterState {
  if (s.outs + 1 >= MAX_OUTS) return advanceHalfInning(s)
  return clearCount({ ...s, outs: s.outs + 1 })
}

export function addStrike(s: CounterState): CounterState {
  if (s.strikes + 1 >= MAX_STRIKES) return addOut(s)
  return { ...s, strikes: s.strikes + 1 }
}

/** Foul zählt als Strike, aber nie zum dritten — bei 2 Strikes passiert nichts. */
export function addFoul(s: CounterState): CounterState {
  if (s.strikes >= MAX_STRIKES - 1) return s
  return { ...s, strikes: s.strikes + 1 }
}

/** Der vierte Ball ist ein Walk: Count zurück, kein Out. */
export function addBall(s: CounterState): CounterState {
  if (s.balls + 1 >= MAX_BALLS) return clearCount(s)
  return { ...s, balls: s.balls + 1 }
}

export function addRun(s: CounterState, team: 'home' | 'away'): CounterState {
  return team === 'home' ? { ...s, home: s.home + 1 } : { ...s, away: s.away + 1 }
}

/** Oben schlägt der Gast, unten das Heimteam. */
export function battingTeam(s: CounterState): 'home' | 'away' {
  return s.half === 'top' ? 'away' : 'home'
}
