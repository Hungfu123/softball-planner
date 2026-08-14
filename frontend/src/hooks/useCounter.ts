import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  INITIAL_STATE,
  MAX_BALLS,
  MAX_OUTS,
  MAX_STRIKES,
  addBall,
  addFoul,
  addOut,
  addRun,
  addStrike,
  advanceHalfInning,
  type CounterState,
} from '@/utils/counterRules'

export const COUNTER_STORAGE_KEY = 'counter'

/**
 * Notbremse gegen unbegrenztes Wachstum. Ein Snapshot ist ~60 Byte, ein volles
 * Spiel bleibt weit darunter — der Cap greift praktisch nie.
 */
export const MAX_HISTORY = 1000

interface Stored {
  current: CounterState
  /** Zustand jeweils VOR einer Aktion, ältester zuerst. */
  history: CounterState[]
}

const EMPTY: Stored = { current: INITIAL_STATE, history: [] }

function isNonNegativeInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0
}

/**
 * Prüft nicht nur die Feldtypen, sondern auch den Wertebereich — ein von Hand
 * editierter Eintrag (z.B. `{outs: 7}`) soll denselben Fallback auf den
 * Startzustand auslösen wie kaputtes JSON, statt still falsch gerendert zu werden.
 */
function isCounterState(value: unknown): value is CounterState {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    isNonNegativeInt(s.balls) && s.balls <= MAX_BALLS - 1 &&
    isNonNegativeInt(s.strikes) && s.strikes <= MAX_STRIKES - 1 &&
    isNonNegativeInt(s.outs) && s.outs <= MAX_OUTS - 1 &&
    isNonNegativeInt(s.inning) && s.inning >= 1 &&
    (s.half === 'top' || s.half === 'bottom') &&
    isNonNegativeInt(s.home) &&
    isNonNegativeInt(s.away)
  )
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(COUNTER_STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY
    const { current, history } = parsed as Record<string, unknown>
    if (!isCounterState(current)) return EMPTY
    return {
      current,
      history: Array.isArray(history) ? history.filter(isCounterState).slice(-MAX_HISTORY) : [],
    }
  } catch {
    return EMPTY
  }
}

function save(stored: Stored) {
  try {
    localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Private Mode oder volles Kontingent — der Zähler läuft im Speicher weiter.
  }
}

/**
 * Zustand des Umpire-Counters mit localStorage-Persistenz.
 *
 * Undo ist ein Snapshot-Pop, kein Rückrechnen: vor jeder Aktion wird der alte
 * Zustand auf den Stack gelegt. Damit kann keine Umkehrlogik von der
 * Vorwärtslogik abweichen.
 */
export function useCounter() {
  const [stored, setStored] = useState<Stored>(load)

  const apply = useCallback((transition: (s: CounterState) => CounterState) => {
    setStored(prev => {
      const next: Stored = {
        current: transition(prev.current),
        history: [...prev.history, prev.current].slice(-MAX_HISTORY),
      }
      return next
    })
  }, [])

  const undo = useCallback(() => {
    setStored(prev => {
      if (prev.history.length === 0) return prev
      const next: Stored = {
        current: prev.history[prev.history.length - 1],
        history: prev.history.slice(0, -1),
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setStored(EMPTY)
  }, [])

  /**
   * Persistente Seiteneffekte müssen aus den State-Updatern heraus in einen
   * Effekt: React ruft Updater im Dev unter StrictMode doppelt auf. Eine
   * localStorage-Persistenz in den Updatern würde also jede Aktion zweimal
   * schreiben. Der Effekt sorgt dafür, dass nur einmal pro tatsächlicher
   * Zustandsänderung persistiert wird.
   */
  useEffect(() => {
    save(stored)
  }, [stored])

  const actions = useMemo(
    () => ({
      strike: () => apply(addStrike),
      ball: () => apply(addBall),
      foul: () => apply(addFoul),
      out: () => apply(addOut),
      halfInning: () => apply(advanceHalfInning),
      runHome: () => apply(s => addRun(s, 'home')),
      runAway: () => apply(s => addRun(s, 'away')),
    }),
    [apply],
  )

  return {
    state: stored.current,
    canUndo: stored.history.length > 0,
    ...actions,
    undo,
    reset,
  }
}
