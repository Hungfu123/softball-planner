import { useState, useEffect, useCallback } from 'react'
import type { GameDayResponse, GameDayPlayerStats } from '@/types'
import * as api from '@/api/client'

export function useGameDay(id: number | null) {
  const [gameDay, setGameDay] = useState<GameDayResponse | null>(null)
  const [stats, setStats] = useState<GameDayPlayerStats[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [gd, st] = await Promise.all([
        api.getGameDay(id),
        api.getGameDayStats(id),
      ])
      setGameDay(gd)
      setStats(st)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const refreshStats = useCallback(async () => {
    if (!id) return
    setStats(await api.getGameDayStats(id))
  }, [id])

  const setAvailablePlayers = async (playerIds: number[]) => {
    if (!id) return
    const gd = await api.setAvailablePlayers(id, playerIds)
    setGameDay(gd)
  }

  return { gameDay, setGameDay, stats, loading, refreshStats, setAvailablePlayers, reload: load }
}
