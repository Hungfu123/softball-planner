import { useEffect, useRef, useState } from 'react'
import type { PlayerBattingStatsResponse } from '@/types'
import * as api from '@/api/client'

export interface OpponentBattingState {
  stats: PlayerBattingStatsResponse[]
  loading: boolean
  failed: boolean
}

/**
 * Schlag-Splits gegen einen Gegner — einmal pro Gegner geladen und gecacht
 * (kleine Payload). Wird in GameDayPlanner EINMAL verwendet (PlayerPool wird
 * zweimal gerendert: mobil + desktop) und per Props durchgereicht, damit der
 * Gegner-Wechsel nur einen Request auslöst.
 *
 * Der Cache lebt im useRef — er stirbt mit dem Unmount, d.h. nach einem
 * Scoring-Besuch auf /scoring werden die Splits frisch geladen.
 */
export function useOpponentBattingStats(opponentTeamName: string | null | undefined): OpponentBattingState {
  const [stats, setStats] = useState<PlayerBattingStatsResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const cacheRef = useRef<Map<string, PlayerBattingStatsResponse[]>>(new Map())

  useEffect(() => {
    if (!opponentTeamName) {
      setStats([])
      setLoading(false)
      setFailed(false)
      return
    }
    const cached = cacheRef.current.get(opponentTeamName)
    if (cached) {
      setStats(cached)
      setLoading(false)
      setFailed(false)
      return
    }
    // Cancel-Flag: wenn der Gegner wechselt, während der Request läuft, darf
    // die alte Antwort nicht mehr landen (Stale-Response-Race).
    let cancelled = false
    setLoading(true)
    setFailed(false)
    api.getOpponentBattingStats(opponentTeamName)
      .then(data => {
        cacheRef.current.set(opponentTeamName, data)
        if (!cancelled) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats([])
          setLoading(false)
          setFailed(true)
        }
      })
    return () => { cancelled = true }
  }, [opponentTeamName])

  return { stats, loading, failed }
}
