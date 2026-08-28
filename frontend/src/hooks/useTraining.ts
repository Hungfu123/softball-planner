import { useState, useCallback, useRef, useEffect } from 'react'
import type { TrainingResponse, TrainingStatsResponse, TrainingPeriodResponse } from '@/types'
import * as api from '@/api/client'

export function useTraining() {
  const [trainings, setTrainings] = useState<TrainingResponse[]>([])
  const [attendance, setAttendance] = useState<Map<number, Map<number, boolean>>>(new Map())
  const [stats, setStats] = useState<TrainingStatsResponse[]>([])
  const [periods, setPeriods] = useState<TrainingPeriodResponse[]>([])
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Debounce: pending attendance saves per trainingId
  const pendingFlush = useRef(new Map<number, { timer: ReturnType<typeof setTimeout>; entries: { playerId: number; present: boolean }[] }>())

  const loadPeriods = useCallback(async () => {
    const data = await api.getTrainingPeriods()
    setPeriods(data)
    return data
  }, [])

  const initialLoadDone = useRef(false)

  const loadAll = useCallback(async (periodId?: number | null) => {
    if (!initialLoadDone.current) setLoading(true)
    try {
      const pid = periodId ?? undefined
      const [trainingsData, statsData, allAttendanceData] = await Promise.all([
        api.getTrainings(pid),
        api.getTrainingStats(pid),
        api.getAllAttendance(pid),
      ])

      const sorted = trainingsData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      setTrainings(sorted)
      setStats(statsData)

      const attendanceMap = new Map<number, Map<number, boolean>>()
      for (const [trainingId, entries] of Object.entries(allAttendanceData)) {
        const playerMap = new Map<number, boolean>()
        entries.forEach((e) => playerMap.set(e.player.id, e.present))
        attendanceMap.set(Number(trainingId), playerMap)
      }
      setAttendance(attendanceMap)
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [])

  // Find the period that contains today's date
  const findCurrentPeriod = useCallback((allPeriods: TrainingPeriodResponse[]) => {
    const today = new Date().toISOString().slice(0, 10)
    return allPeriods.find(p => p.startDate <= today && today <= p.endDate) ?? null
  }, [])

  // Initial load: alle Trainings (period-übergreifend), damit Picker auch
  // vergangene Termine zeigt
  const didInitialLoad = useRef(false)
  useEffect(() => {
    if (didInitialLoad.current) return
    didInitialLoad.current = true
    ;(async () => {
      const allPeriods = await loadPeriods()
      const current = findCurrentPeriod(allPeriods)
      if (current) setActivePeriodId(current.id)
      await loadAll()
    })()
  }, [loadPeriods, loadAll, findCurrentPeriod])

  const selectPeriod = useCallback(async (periodId: number | null) => {
    setActivePeriodId(periodId)
    await loadAll(periodId)
  }, [loadAll])

  const flushAttendance = useCallback((trainingId: number, entries: { playerId: number; present: boolean }[]) => {
    api.setAttendance(trainingId, entries).catch(() => {
      // On failure, reload to get correct state
      loadAll(activePeriodId)
    })
  }, [loadAll, activePeriodId])

  const flushAllPending = useCallback(() => {
    pendingFlush.current.forEach(({ timer, entries }, trainingId) => {
      clearTimeout(timer)
      api.setAttendance(trainingId, entries).catch(() => {})
    })
    pendingFlush.current.clear()
  }, [])

  // Flush on unmount
  useEffect(() => flushAllPending, [flushAllPending])

  const toggleAttendance = (trainingId: number, playerId: number) => {
    const trainingMap = attendance.get(trainingId) ?? new Map<number, boolean>()
    const current = trainingMap.get(playerId) ?? false
    const newVal = !current

    // Optimistic update
    const newTrainingMap = new Map(trainingMap)
    newTrainingMap.set(playerId, newVal)
    const newAttendance = new Map(attendance)
    newAttendance.set(trainingId, newTrainingMap)
    setAttendance(newAttendance)

    // Update attendee count optimistically
    setTrainings(prev =>
      prev.map(t =>
        t.id === trainingId
          ? { ...t, attendeeCount: t.attendeeCount + (newVal ? 1 : -1) }
          : t
      )
    )

    // Build full entries for debounced PUT
    const entries = Array.from(newTrainingMap.entries()).map(([pid, present]) => ({
      playerId: pid,
      present,
    }))

    // Cancel previous timer for this training
    const existing = pendingFlush.current.get(trainingId)
    if (existing) clearTimeout(existing.timer)

    // Debounce: send after 500ms of no more clicks
    const timer = setTimeout(() => {
      pendingFlush.current.delete(trainingId)
      flushAttendance(trainingId, entries)
    }, 500)
    pendingFlush.current.set(trainingId, { timer, entries })
  }

  const createTraining = async (data: { date: string; time?: string; location?: string; type?: string }) => {
    const created = await api.createTraining(data)
    setTrainings(prev => [...prev, created].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    // Stats + attendance need refresh since auto-fill may have added regular players
    const pid = activePeriodId ?? undefined
    api.getTrainingStats(pid).then(setStats)
    api.getAttendance(created.id).then(entries => {
      const playerMap = new Map<number, boolean>()
      entries.forEach(e => playerMap.set(e.player.id, e.present))
      setAttendance(prev => new Map(prev).set(created.id, playerMap))
    })
  }

  const createBulk = async (data: { weekdays: number[]; startDate: string; endDate: string; time?: string; weekdayTimes: Record<number, string>; location?: string; periodName?: string; cycleWeeks?: number; activeWeeksInCycle?: number[] }) => {
    await api.createBulkTrainings(data)
    // Reload periods since a new one may have been created
    const newPeriods = await loadPeriods()
    // If a period was just created, auto-select it
    if (data.periodName && newPeriods.length > 0) {
      const created = newPeriods.find(p => p.name === data.periodName)
      if (created) {
        setActivePeriodId(created.id)
        await loadAll(created.id)
        return
      }
    }
    await loadAll(activePeriodId)
  }

  const deleteTraining = async (id: number) => {
    await api.deleteTraining(id)
    setTrainings(prev => prev.filter(t => t.id !== id))
    setAttendance(prev => { const m = new Map(prev); m.delete(id); return m })
    api.getTrainingStats(activePeriodId ?? undefined).then(setStats)
  }

  const cancelTraining = async (id: number) => {
    const updated = await api.updateTraining(id, { cancelled: true })
    setTrainings(prev => prev.map(t => t.id === id ? updated : t))
    api.getTrainingStats(activePeriodId ?? undefined).then(setStats)
  }

  const updatePeriod = async (
    periodId: number,
    data: { name: string; startDate: string; endDate: string; weekdays: number[]; time?: string | null; weekdayTimes: Record<number, string>; location?: string | null; cycleWeeks?: number; activeWeeksInCycle?: number[] },
  ) => {
    await api.updateTrainingPeriod(periodId, data)
    await loadPeriods()
    await loadAll(activePeriodId)
  }

  const deletePeriod = async (periodId: number) => {
    await api.deleteTrainingPeriod(periodId)
    await loadPeriods()
    if (activePeriodId === periodId) {
      setActivePeriodId(null)
      await loadAll(null)
    } else {
      await loadAll(activePeriodId)
    }
  }

  const importCsv = async (csv: string, periodName?: string) => {
    const result = await api.importTrainingCsv(csv, periodName)
    const newPeriods = await loadPeriods()
    if (periodName && newPeriods.length > 0) {
      const created = newPeriods.find(p => p.name === periodName)
      if (created) {
        setActivePeriodId(created.id)
        await loadAll(created.id)
        return result
      }
    }
    await loadAll(activePeriodId)
    return result
  }

  return {
    trainings,
    attendance,
    stats,
    periods,
    activePeriodId,
    loading,
    loadAll,
    loadPeriods,
    selectPeriod,
    toggleAttendance,
    createTraining,
    createBulk,
    deleteTraining,
    cancelTraining,
    updatePeriod,
    deletePeriod,
    importCsv,
  }
}
