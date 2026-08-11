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

  const recordAutomaticOut = useCallback(async () => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    await api.recordAutomaticOut(gameId)
    await reload()
  }, [gameId, reload])

  // Uhr-Aktionen: Backend ist die einzige Quelle für elapsedSeconds — nach jeder
  // Aktion reload(), damit das Scoreboard (und damit scoreboard.clock) den frischen
  // Serverzustand trägt statt dass die UI ihn aus der Antwort selbst ableitet.
  const startClock = useCallback(async (limitMinutes: number | null) => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    const state = await api.startClock(gameId, limitMinutes)
    await reload()
    return state
  }, [gameId, reload])

  const pauseClock = useCallback(async () => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    const state = await api.pauseClock(gameId)
    await reload()
    return state
  }, [gameId, reload])

  const resumeClock = useCallback(async () => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    const state = await api.resumeClock(gameId)
    await reload()
    return state
  }, [gameId, reload])

  const resetClock = useCallback(async () => {
    if (gameId == null) throw new Error('Kein Spiel aktiv')
    const state = await api.resetClock(gameId)
    await reload()
    return state
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
    recordAutomaticOut,
    deleteStealingEvent,
    startClock,
    pauseClock,
    resumeClock,
    resetClock,
  }
}
