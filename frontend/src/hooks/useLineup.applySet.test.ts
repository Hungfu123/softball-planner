import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLineup } from './useLineup'
import type { LineupSetEntryResponse, LineupSetGameRotationResponse, Player } from '@/types'

vi.mock('@/api/client', () => ({
  getLineup: vi.fn(),
  getSubstitutions: vi.fn(),
  setLineup: vi.fn(),
  setSubstitutions: vi.fn(),
  setStaff: vi.fn(),
  setCoachRotation: vi.fn(),
}))

import * as api from '@/api/client'

const khang: Player = { id: 1, name: 'Khang', regular: true, defaultBattingOrder: null }
const anne: Player = { id: 2, name: 'Anne', regular: true, defaultBattingOrder: null }

const setEntry = (gameNumber: number, player: Player, position: string, battingOrder: number): LineupSetEntryResponse =>
  ({ gameNumber, player, position, battingOrder, dhBatterPlayer: null }) as LineupSetEntryResponse

const rotation = (gameNumber: number, first: string | null, third: string | null): LineupSetGameRotationResponse =>
  ({
    gameNumber,
    firstBaseCoachRotation: first,
    firstBaseCoachRotationReversed: false,
    thirdBaseCoachRotation: third,
    thirdBaseCoachRotationReversed: false,
  }) as LineupSetGameRotationResponse

describe('useLineup.applySet — Coach-Rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getLineup).mockResolvedValue([])
    vi.mocked(api.getSubstitutions).mockResolvedValue([])
    vi.mocked(api.setLineup).mockResolvedValue([])
    vi.mocked(api.setStaff).mockResolvedValue([])
    vi.mocked(api.setCoachRotation).mockResolvedValue({} as never)
  })

  it('setzt die Rotation aus dem Set je Spiel', async () => {
    const { result } = renderHook(() => useLineup())
    const entries = [setEntry(1, khang, 'CF', 1), setEntry(2, anne, 'SS', 1)]

    await act(async () => {
      await result.current.applySet(entries, [], [
        { id: 11, gameNumber: 1 },
        { id: 12, gameNumber: 2 },
      ], [rotation(1, 'POS_3_8', null), rotation(2, null, 'POS_5_10')])
    })

    expect(api.setCoachRotation).toHaveBeenCalledWith(11, 'POS_3_8', null, false, false)
    expect(api.setCoachRotation).toHaveBeenCalledWith(12, null, 'POS_5_10', false, false)
  })

  it('leert die Rotation bei Alt-Sets ohne Rotation-Daten', async () => {
    const { result } = renderHook(() => useLineup())
    const entries = [setEntry(1, khang, 'CF', 1)]

    await act(async () => {
      await result.current.applySet(entries, [], [{ id: 11, gameNumber: 1 }])
    })

    expect(api.setCoachRotation).toHaveBeenCalledWith(11, null, null, false, false)
  })

  it('übernimmt das reversed-Flag', async () => {
    const { result } = renderHook(() => useLineup())
    const entries = [setEntry(1, khang, 'CF', 1)]
    const reversed: LineupSetGameRotationResponse = {
      ...rotation(1, 'POS_1_6', null),
      firstBaseCoachRotationReversed: true,
    }

    await act(async () => {
      await result.current.applySet(entries, [], [{ id: 11, gameNumber: 1 }], [reversed])
    })

    expect(api.setCoachRotation).toHaveBeenCalledWith(11, 'POS_1_6', null, true, false)
  })
})
