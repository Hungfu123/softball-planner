import { useState, useCallback } from 'react'
import type { GameStaffResponse } from '@/types'
import * as api from '@/api/client'

export function useStaff() {
  const [staff, setStaff] = useState<GameStaffResponse[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async (gameId: number) => {
    setLoaded(false)
    setStaff(await api.getStaff(gameId))
    setLoaded(true)
  }, [])

  const save = useCallback(async (
    gameId: number,
    entries: { playerId: number; role: string }[],
  ) => {
    const saved = await api.setStaff(gameId, entries)
    setStaff(saved)
    return saved
  }, [])

  return { staff, loaded, load, save }
}
