import { useState, useCallback, useRef } from 'react'
import type { TrainingResponse, TrainingStatsResponse, TrainingPeriodResponse } from '@/types'
import * as api from '@/api/client'

export function useTraining() {
  const [trainings, setTrainings] = useState<TrainingResponse[]>([])
  const [attendance, setAttendance] = useState<Map<number, Map<number, boolean>>>(new Map())
  const [stats, setStats] = useState<TrainingStatsResponse[]>([])
  const [periods, setPeriods] = useState<TrainingPeriodResponse[]>([])
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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
      const [trainingsData, statsData] = await Promise.all([
        api.getTrainings(pid),
        api.getTrainingStats(pid),
      ])

      const sorted = trainingsData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      setTrainings(sorted)
      setStats(statsData)

      const attendanceMap = new Map<number, Map<number, boolean>>()
      await Promise.all(
        sorted.map(async (t) => {
          const entries = await api.getAttendance(t.id)
          const playerMap = new Map<number, boolean>()
          entries.forEach((e) => playerMap.set(e.player.id, e.present))
          attendanceMap.set(t.id, playerMap)
        })
      )
      setAttendance(attendanceMap)
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [])

  const selectPeriod = useCallback(async (periodId: number | null) => {
    setActivePeriodId(periodId)
    await loadAll(periodId)
  }, [loadAll])

  const toggleAttendance = async (trainingId: number, playerId: number) => {
    const trainingMap = attendance.get(trainingId) ?? new Map<number, boolean>()
    const current = trainingMap.get(playerId) ?? false
    const newVal = !current

    // Save previous state for rollback
    const prevAttendance = attendance
    const prevTrainings = trainings

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

    // Build full entries for PUT
    const entries = Array.from(newTrainingMap.entries()).map(([pid, present]) => ({
      playerId: pid,
      present,
    }))

    try {
      await api.setAttendance(trainingId, entries)
    } catch (err) {
      // Rollback on failure
      setAttendance(prevAttendance)
      setTrainings(prevTrainings)
      throw err
    }
  }

  const createTraining = async (data: { date: string; time?: string; location?: string; type?: string }) => {
    await api.createTraining(data)
    await loadAll(activePeriodId)
  }

  const createBulk = async (data: { weekdays: number[]; startDate: string; endDate: string; time?: string; location?: string; periodName?: string }) => {
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
    await loadAll(activePeriodId)
  }

  const cancelTraining = async (id: number) => {
    await api.updateTraining(id, { cancelled: true })
    await loadAll(activePeriodId)
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
    importCsv,
  }
}
