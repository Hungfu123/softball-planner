import { useCallback, useEffect, useState } from 'react'
import { applyGameDayPollVotes, fetchGameDayPollVotes } from '@/api/client'
import type { GameDayVotePreview } from '@/types'

/** Lädt die WhatsApp-Stimmen-Vorschau eines Spieltags und übernimmt das Delta erst auf Bestätigung. */
export function useGameDayPollSync(gameDayId: number) {
  const [preview, setPreview] = useState<GameDayVotePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPreview(await fetchGameDayPollVotes(gameDayId))
    } catch (e: unknown) {
      setError((e as Error).message)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [gameDayId])

  useEffect(() => { load() }, [load])

  const apply = useCallback(async () => {
    if (!preview) return
    setApplying(true)
    try {
      await applyGameDayPollVotes(
        gameDayId,
        preview.toAdd.map(p => p.id),
        preview.toRemove.map(p => p.playerId),
      )
    } finally {
      setApplying(false)
    }
  }, [gameDayId, preview])

  return { preview, loading, applying, error, reload: load, apply }
}
