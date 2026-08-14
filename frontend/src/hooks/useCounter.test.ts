import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { useCounter, COUNTER_STORAGE_KEY, MAX_HISTORY } from './useCounter'
import { INITIAL_STATE } from '@/utils/counterRules'

beforeEach(() => {
  localStorage.clear()
})

describe('useCounter', () => {
  it('startet im Anfangszustand', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.state).toEqual(INITIAL_STATE)
    expect(result.current.canUndo).toBe(false)
  })

  it('schreibt jede Aktion nach localStorage', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.strike())

    const stored = JSON.parse(localStorage.getItem(COUNTER_STORAGE_KEY)!)
    expect(stored.current.strikes).toBe(1)
  })

  it('liest den Stand beim Neuaufbau wieder ein', () => {
    const first = renderHook(() => useCounter())
    act(() => first.result.current.ball())
    act(() => first.result.current.runHome())
    first.unmount()

    const { result } = renderHook(() => useCounter())
    expect(result.current.state.balls).toBe(1)
    expect(result.current.state.home).toBe(1)
  })

  it('macht die letzte Aktion rückgängig', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.strike())
    act(() => result.current.strike())
    expect(result.current.state.strikes).toBe(2)

    act(() => result.current.undo())
    expect(result.current.state.strikes).toBe(1)
  })

  it('geht per Undo-Kette bis zum Spielanfang zurück', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.strike())
    act(() => result.current.ball())
    act(() => result.current.out())
    act(() => result.current.runAway())
    act(() => result.current.halfInning())

    for (let i = 0; i < 5; i++) act(() => result.current.undo())

    expect(result.current.state).toEqual(INITIAL_STATE)
    expect(result.current.canUndo).toBe(false)
  })

  it('macht auch einen wirkungslosen Foul-Tipp rückgängig', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.strike())
    act(() => result.current.strike())
    act(() => result.current.foul())
    expect(result.current.state.strikes).toBe(2)

    act(() => result.current.undo())
    expect(result.current.state.strikes).toBe(2)
    act(() => result.current.undo())
    expect(result.current.state.strikes).toBe(1)
  })

  it('ignoriert Undo bei leerer History', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.undo())
    expect(result.current.state).toEqual(INITIAL_STATE)
  })

  it('setzt Stand und History zurück', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.strike())
    act(() => result.current.runHome())
    act(() => result.current.reset())

    expect(result.current.state).toEqual(INITIAL_STATE)
    expect(result.current.canUndo).toBe(false)
  })

  it('fällt bei kaputtem JSON auf den Anfangszustand zurück', () => {
    localStorage.setItem(COUNTER_STORAGE_KEY, '{nicht mal JSON')
    const { result } = renderHook(() => useCounter())
    expect(result.current.state).toEqual(INITIAL_STATE)
  })

  it('fällt bei fremdem Inhalt auf den Anfangszustand zurück', () => {
    localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify({ current: { foo: 1 }, history: 'nope' }))
    const { result } = renderHook(() => useCounter())
    expect(result.current.state).toEqual(INITIAL_STATE)
    expect(result.current.canUndo).toBe(false)
  })

  it('deckelt die History und wirft den ältesten Snapshot raus', () => {
    const overflow = MAX_HISTORY + 5
    const { result } = renderHook(() => useCounter())
    for (let i = 0; i < overflow; i++) act(() => result.current.runHome())

    const stored = JSON.parse(localStorage.getItem(COUNTER_STORAGE_KEY)!)
    expect(stored.history).toHaveLength(MAX_HISTORY)
    expect(stored.current.home).toBe(overflow)
  })

  it('persistiert einmal pro Aktion auch unter StrictMode', () => {
    const { result } = renderHook(() => useCounter(), {
      wrapper: StrictMode,
    })
    act(() => result.current.strike())

    const stored = JSON.parse(localStorage.getItem(COUNTER_STORAGE_KEY)!)
    // Unter StrictMode werden Updater doppelt aufgerufen. Ohne useEffect
    // würde history zwei INITIAL_STATE-Einträge haben. Mit useEffect
    // persistiert der Effekt nur einmal, daher ist history.length === 1.
    expect(stored.history).toHaveLength(1)
    expect(stored.current.strikes).toBe(1)
  })
})
