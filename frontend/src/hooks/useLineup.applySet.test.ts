import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLineup } from './useLineup'
import type { LineupSetEntryResponse, Player } from '@/types'

vi.mock('@/api/client', () => ({
  getLineup: vi.fn(),
  getSubstitutions: vi.fn(),
  setLineup: vi.fn(),
  setSubstitutions: vi.fn(),
  setStaff: vi.fn(),
}))

import * as api from '@/api/client'

const khang: Player = { id: 1, name: 'Khang', regular: true, defaultBattingOrder: null }
const anne: Player = { id: 2, name: 'Anne', regular: true, defaultBattingOrder: null }

const setEntry = (gameNumber: number, player: Player, position: string, battingOrder: number): LineupSetEntryResponse =>
  ({ gameNumber, player, position, battingOrder, dhBatterPlayer: null }) as LineupSetEntryResponse

describe('useLineup.applySet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getLineup).mockResolvedValue([])
    vi.mocked(api.getSubstitutions).mockResolvedValue([])
    vi.mocked(api.setLineup).mockResolvedValue([])
    vi.mocked(api.setStaff).mockResolvedValue([])
  })

  it('überspringt Coaches, die im Set-Lineup selbst schlagen (vergiftete Alt-Sets)', async () => {
    const { result } = renderHook(() => useLineup())
    // Khang schlägt in Spiel 1, nicht in Spiel 2. Als Coach im Set:
    // Spiel 1 = Konflikt (schlägt + coacht) → überspringen,
    // Spiel 2 = legal → übernehmen.
    const entries = [setEntry(1, khang, 'CF', 1), setEntry(2, anne, 'SS', 1)]
    const staffItems = [
      { gameNumber: 1, player: khang, role: 'BASE_COACH_1ST' },
      { gameNumber: 2, player: khang, role: 'BASE_COACH_3RD' },
    ]

    let res: Awaited<ReturnType<typeof result.current.applySet>> | undefined
    await act(async () => {
      res = await result.current.applySet(entries, staffItems, [
        { id: 11, gameNumber: 1 },
        { id: 12, gameNumber: 2 },
      ])
    })

    expect(res?.skippedCoaches).toEqual([{ gameNumber: 1, playerName: 'Khang' }])
    // Spiel 2: Khang wird als Coach übernommen (cleaner API-Payload ohne playerName) …
    expect(api.setStaff).toHaveBeenCalledWith(12, [{ playerId: 1, role: 'BASE_COACH_3RD' }])
    // … Spiel 1 bekommt die Konflikt-Coach-Zuweisung nicht (nur das vorherige Leeren).
    const coachRestoreCalls = vi.mocked(api.setStaff).mock.calls.filter(c => (c[1] as unknown[]).length > 0)
    expect(coachRestoreCalls).toEqual([[12, [{ playerId: 1, role: 'BASE_COACH_3RD' }]]])
  })

  it('überspringt DH-Batter als Coach, übernimmt den DH-Host', async () => {
    const { result } = renderHook(() => useLineup())
    const dhBatter: Player = { id: 3, name: 'Tom', regular: true, defaultBattingOrder: null }
    // Anne ist DH-Host (schlägt nicht) → darf Coach sein; Tom schlägt als DH → nicht.
    const entries: LineupSetEntryResponse[] = [
      { id: 101, gameNumber: 1, player: anne, position: 'SS', battingOrder: 1, dhBatterPlayer: dhBatter },
    ]
    const staffItems = [
      { gameNumber: 1, player: anne, role: 'BASE_COACH_1ST' },
      { gameNumber: 1, player: dhBatter, role: 'BASE_COACH_3RD' },
    ]

    let res: Awaited<ReturnType<typeof result.current.applySet>> | undefined
    await act(async () => {
      res = await result.current.applySet(entries, staffItems, [{ id: 11, gameNumber: 1 }])
    })

    expect(res?.skippedCoaches).toEqual([{ gameNumber: 1, playerName: 'Tom' }])
    expect(api.setStaff).toHaveBeenCalledWith(11, [{ playerId: 2, role: 'BASE_COACH_1ST' }])
  })
})
