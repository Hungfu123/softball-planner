import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLineup } from './useLineup'
import type { Player } from '@/types'

vi.mock('@/api/client', () => ({
  getLineup: vi.fn(),
  getSubstitutions: vi.fn(),
  setLineup: vi.fn(),
  setSubstitutions: vi.fn(),
  setStaff: vi.fn(),
}))

import * as api from '@/api/client'

const anne: Player = { id: 1, name: 'Anne', regular: false, defaultBattingOrder: null }
const yuki: Player = { id: 2, name: 'Yuki', regular: false, defaultBattingOrder: null }

describe('useLineup — Auswechslungen zählen als ungespeicherte Arbeit', () => {
  beforeEach(() => {
    vi.mocked(api.getLineup).mockResolvedValue([
      { id: 10, player: anne, position: 'SS', battingOrder: 1, dhBatterPlayer: null },
    ])
    vi.mocked(api.getSubstitutions).mockResolvedValue([
      { id: 5, playerOut: anne, playerIn: yuki, inning: 3 },
    ])
  })

  it('hasUnsavedWork wird true, wenn eine gespeicherte Auswechslung entfernt wird', async () => {
    const { result } = renderHook(() => useLineup())

    await act(async () => {
      await result.current.load(7)
    })
    expect(result.current.hasUnsavedWork([7])).toBe(false)

    act(() => {
      result.current.removeSubstitution(0)
    })
    expect(result.current.substitutions).toHaveLength(0)
    expect(result.current.hasUnsavedWork([7])).toBe(true)
    expect(result.current.hasChanges).toBe(true)
  })
})
