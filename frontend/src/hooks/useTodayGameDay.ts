import { useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { GameDayResponse } from '@/types'

export interface TodayGameDay {
  gameDay: GameDayResponse
  seasonId: number
  seasonName: string
}

/**
 * Findet den GameDay der auf heute fällt (falls einer existiert).
 * Scannt alle Saisons durch — bei wenigen Saisons (~3/Jahr) kein Problem.
 */
export function useTodayGameDay(): TodayGameDay | null {
  const [result, setResult] = useState<TodayGameDay | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    let cancelled = false

    ;(async () => {
      try {
        const seasons = await api.getSeasons()
        for (const season of seasons) {
          const gds = await api.getGameDays(season.id)
          const todayGd = gds.find(gd => gd.date === today)
          if (todayGd) {
            if (!cancelled) setResult({ gameDay: todayGd, seasonId: season.id, seasonName: season.name })
            return
          }
        }
        if (!cancelled) setResult(null)
      } catch {
        // Silent — Banner ist nice-to-have, kein Fehler-Blocker
      }
    })()

    return () => { cancelled = true }
  }, [])

  return result
}
