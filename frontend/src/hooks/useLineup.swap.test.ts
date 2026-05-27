import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLineup } from './useLineup'
import type { Player } from '@/types'

const mkPlayer = (id: number, name: string): Player => ({
  id,
  name,
  regular: false,
  defaultBattingOrder: null,
})

describe('useLineup — swap operations', () => {
  it('replacePlayer keeps position + dh annotation, swaps only the person', () => {
    const { result } = renderHook(() => useLineup())
    const alice = mkPlayer(1, 'Alice')
    const bob = mkPlayer(2, 'Bob')      // DH-Batter
    const dave = mkPlayer(4, 'Dave')    // pool replacement

    act(() => {
      result.current.addPlayer(alice)
    })
    act(() => {
      result.current.setPosition(1, 'SS')
      result.current.setDhBatter(1, bob)
    })
    expect(result.current.entries[0].position).toBe('SS')
    expect(result.current.entries[0].dhBatterId).toBe(2)

    act(() => {
      result.current.replacePlayer(1, dave)
    })

    const e = result.current.entries[0]
    expect(e.player.id).toBe(4)
    expect(e.position).toBe('SS')
    expect(e.dhBatterId).toBe(2)
  })

  it('replacePlayer clears DH annotation if new player was a DH-batter elsewhere', () => {
    const { result } = renderHook(() => useLineup())
    const alice = mkPlayer(1, 'Alice')
    const bob = mkPlayer(2, 'Bob')
    const charlie = mkPlayer(3, 'Charlie')

    act(() => {
      result.current.addPlayer(alice)
      result.current.addPlayer(bob)
    })
    act(() => {
      result.current.setPosition(1, 'SS')
      result.current.setPosition(2, '2B')
      result.current.setDhBatter(1, charlie)
    })

    act(() => {
      result.current.replacePlayer(2, charlie)
    })
    expect(result.current.entries[1].player.id).toBe(3)
    expect(result.current.entries[0].dhBatterId).toBeNull()
  })

  it('swapEntries tauscht nur Positionen, BattingOrder bleibt (Commit 94321c6)', () => {
    const { result } = renderHook(() => useLineup())
    const a = mkPlayer(1, 'A')
    const b = mkPlayer(2, 'B')
    const c = mkPlayer(3, 'C')
    const d = mkPlayer(4, 'D')

    act(() => {
      result.current.addPlayer(a)
      result.current.addPlayer(b)
      result.current.addPlayer(c)
      result.current.addPlayer(d)
    })
    act(() => {
      result.current.setPosition(1, 'SS')
      result.current.setPosition(2, '2B')
      result.current.setPosition(3, '1B')
      result.current.setPosition(4, 'CF')
    })

    act(() => {
      result.current.swapEntries(1, 4)
    })

    // BattingOrder/Player-Reihenfolge bleibt (1,2,3,4) — nur Positionen werden getauscht
    const ids = result.current.entries.map(e => e.player.id)
    expect(ids).toEqual([1, 2, 3, 4])
    // Player 1 (vorher SS) hat jetzt Position von Player 4 (CF)
    expect(result.current.entries[0].position).toBe('CF')
    // Player 4 (vorher CF) hat jetzt Position von Player 1 (SS)
    expect(result.current.entries[3].position).toBe('SS')
    // Mittlere unverändert
    expect(result.current.entries[1].position).toBe('2B')
    expect(result.current.entries[2].position).toBe('1B')
  })

  it('swapEntries with unknown id is a no-op', () => {
    const { result } = renderHook(() => useLineup())
    const a = mkPlayer(1, 'A')
    const b = mkPlayer(2, 'B')
    act(() => {
      result.current.addPlayer(a)
      result.current.addPlayer(b)
    })

    act(() => {
      result.current.swapEntries(1, 999)
    })
    expect(result.current.entries.map(e => e.player.id)).toEqual([1, 2])
  })

  it('replacePlayer with unknown row id is a no-op', () => {
    const { result } = renderHook(() => useLineup())
    const a = mkPlayer(1, 'A')
    const x = mkPlayer(99, 'X')
    act(() => { result.current.addPlayer(a) })
    act(() => { result.current.replacePlayer(999, x) })
    expect(result.current.entries[0].player.id).toBe(1)
  })
})
