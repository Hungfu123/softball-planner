import { useState, useCallback, useEffect, useRef } from 'react'
import type { TrainingResponse, TrainingPeriodResponse, TrainingPlanResponse, DrillResponse, GeneratePlanRequest, TrainingPlanContentResponse } from '@/types'
import * as api from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'

export function useTrainingPlan() {
  const [trainings, setTrainings] = useState<TrainingResponse[]>([])
  const [periods, setPeriods] = useState<TrainingPeriodResponse[]>([])
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null)
  const [plans, setPlans] = useState<Map<number, TrainingPlanResponse>>(new Map())
  const [drills, setDrills] = useState<DrillResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const toast = useToastContext()
  const initialLoadDone = useRef(false)

  const findCurrentPeriod = useCallback((periods: TrainingPeriodResponse[]): number | null => {
    const today = new Date().toISOString().split('T')[0]
    const current = periods.find(p => p.startDate <= today && p.endDate >= today)
    return current?.id ?? (periods.length > 0 ? periods[0].id : null)
  }, [])

  const loadTrainings = useCallback(async (periodId?: number | null) => {
    const data = await api.getTrainings(periodId ?? undefined)
    const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setTrainings(sorted)
    return sorted
  }, [])

  const loadPlansForTrainings = useCallback(async (trainingList: TrainingResponse[]) => {
    if (trainingList.length === 0) { setPlans(new Map()); return }
    try {
      const ids = trainingList.map(t => t.id)
      const result = await api.getTrainingPlansByTrainingIds(ids)
      const planMap = new Map<number, TrainingPlanResponse>()
      for (const [key, plan] of Object.entries(result)) {
        planMap.set(Number(key), plan)
      }
      setPlans(planMap)
    } catch {
      setPlans(new Map())
    }
  }, [])

  const loadAll = useCallback(async (periodId?: number | null) => {
    if (!initialLoadDone.current) setLoading(true)
    try {
      const trainingList = await loadTrainings(periodId)
      await loadPlansForTrainings(trainingList)
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [loadTrainings, loadPlansForTrainings])

  useEffect(() => {
    async function init() {
      try {
        const [periodsData, drillsData] = await Promise.all([
          api.getTrainingPeriods(),
          api.getDrills(),
        ])
        setPeriods(periodsData)
        setDrills(drillsData)
        const currentPeriodId = findCurrentPeriod(periodsData)
        setActivePeriodId(currentPeriodId)
        await loadAll(currentPeriodId)
      } catch {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectPeriod = useCallback(async (periodId: number | null) => {
    setActivePeriodId(periodId)
    await loadAll(periodId)
  }, [loadAll])

  const generate = useCallback(async (data: GeneratePlanRequest) => {
    setGenerating(true)
    try {
      const plan = await api.generateTrainingPlan(data)
      setPlans(prev => {
        const next = new Map(prev)
        next.set(data.trainingId, plan)
        return next
      })
      toast.show('Trainingsplan erstellt')
      return plan
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler beim Generieren'
      toast.show(msg, 'error')
      throw e
    } finally {
      setGenerating(false)
    }
  }, [toast])

  const update = useCallback(async (planId: number, trainingId: number, content: TrainingPlanContentResponse) => {
    try {
      const updated = await api.updateTrainingPlan(planId, content)
      setPlans(prev => {
        const next = new Map(prev)
        next.set(trainingId, updated)
        return next
      })
      toast.show('Plan gespeichert')
      return updated
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler beim Speichern'
      toast.show(msg, 'error')
      throw e
    }
  }, [toast])

  const deletePlan = useCallback(async (planId: number, trainingId: number) => {
    try {
      await api.deleteTrainingPlan(planId)
      setPlans(prev => {
        const next = new Map(prev)
        next.delete(trainingId)
        return next
      })
      toast.show('Plan gelöscht')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler beim Löschen'
      toast.show(msg, 'error')
    }
  }, [toast])

  return {
    trainings, periods, activePeriodId, plans, drills,
    loading, generating,
    selectPeriod, generate, update, deletePlan,
  }
}
