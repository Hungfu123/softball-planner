import { useCallback, useEffect, useState } from 'react'
import type {
  AtBatResponse,
  StealingEventResponse,
  ScoreboardResponse,
  RecordAtBatRequest,
  RecordStealingEventRequest,
  UndoResult,
} from '@/types'
import * as api from '@/api/client'

export function useScoring(gameId: number | null) {
  const [atBats, setAtBats] = useState<AtBatResponse[]>([])
  const [stealingEvents, setStealingEvents] = useState<StealingEventResponse[]>([])
  const [scoreboard, setScoreboard] = useState<ScoreboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (gameId == null) return
    setLoading(true)
    setError(null)
    try {
      const [ab, st, sb] = await Promise.all([
        api.getAtBats(gameId),
        api.getStealingEvents(gameId),
        api.getScoreboard(gameId),
      ])
      setAtBats(ab)
      setStealingEvents(st)
      setScoreboard(sb)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    if (gameId == null) return
    reload()
  }, [gameId, reload])

  const recordAtBat = useCallback(async (req: RecordAtBatRequest) => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    const created = await api.recordAtBat(gameId, req)
    // Reload scoreboard + atbats (kompakt, kein optimistic V1)
    await reload()
    return created
  }, [gameId, reload])

  const undo = useCallback(async (): Promise<UndoResult> => {
    if (gameId == null) return { type: 'NONE', removedId: null }
    const result = await api.undoLastAction(gameId)
    await reload()
    return result
  }, [gameId, reload])

  const recordStealingEvent = useCallback(async (req: RecordStealingEventRequest) => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    const created = await api.recordStealingEvent(gameId, req)
    await reload()
    return created
  }, [gameId, reload])

  const deleteStealingEvent = useCallback(async (eventId: number) => {
    if (gameId == null) return
    await api.deleteStealingEvent(gameId, eventId)
    await reload()
  }, [gameId, reload])

  return {
    atBats,
    stealingEvents,
    scoreboard,
    loading,
    error,
    reload,
    recordAtBat,
    undo,
    recordStealingEvent,
    deleteStealingEvent,
  }
}
