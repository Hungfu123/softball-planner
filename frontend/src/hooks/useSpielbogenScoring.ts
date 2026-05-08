import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type {
  BogenSheetResponse,
  SpielbogenRecordAtBatRequest,
  SpielbogenRecordStealingRequest,
  SpielbogenRecordSubstitutionRequest,
  SpielbogenRecordPositionSwapRequest,
  BogenSide,
  CreateSpielbogenRequest,
  UpdateSlotRequest,
  SpielbogenResponse,
  SpielbogenSlotResponse,
} from '@/types'

export function useSpielbogenScoring(bogenId: number | null) {
  const [sheet, setSheet] = useState<BogenSheetResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (bogenId == null) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSpielbogenSheet(bogenId)
      setSheet(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [bogenId])

  useEffect(() => { reload() }, [reload])

  const recordAtBat = useCallback(async (req: SpielbogenRecordAtBatRequest) => {
    if (bogenId == null) return
    await api.recordSpielbogenAtBat(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const recordStealing = useCallback(async (req: SpielbogenRecordStealingRequest) => {
    if (bogenId == null) return
    await api.recordSpielbogenStealing(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const recordSubstitution = useCallback(async (req: SpielbogenRecordSubstitutionRequest) => {
    if (bogenId == null) return
    await api.recordSpielbogenSubstitution(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const recordPositionSwap = useCallback(async (req: SpielbogenRecordPositionSwapRequest) => {
    if (bogenId == null) return
    await api.recordSpielbogenPositionSwap(bogenId, req)
    await reload()
  }, [bogenId, reload])

  const undoLast = useCallback(async (side: BogenSide) => {
    if (bogenId == null) return
    await api.undoLastSpielbogenAtBat(bogenId, side)
    await reload()
  }, [bogenId, reload])

  const undoLastStealing = useCallback(async (side: BogenSide) => {
    if (bogenId == null) return
    await api.deleteLastSpielbogenStealing(bogenId, side)
    await reload()
  }, [bogenId, reload])

  const switchSide = useCallback(async () => {
    if (bogenId == null) return
    await api.switchSpielbogenSide(bogenId)
    await reload()
  }, [bogenId, reload])

  const resetScoring = useCallback(async () => {
    if (bogenId == null) return
    await api.resetSpielbogenScoring(bogenId)
    await reload()
  }, [bogenId, reload])

  const correctLastAtBat = useCallback(async (
    side: BogenSide,
    payload: Parameters<typeof api.correctLastSpielbogenAtBat>[2]
  ) => {
    if (bogenId == null) return
    await api.correctLastSpielbogenAtBat(bogenId, side, payload)
    await reload()
  }, [bogenId, reload])

  const setCurrentSide = useCallback(async (side: BogenSide) => {
    if (bogenId == null) return
    await api.setSpielbogenCurrentSide(bogenId, side)
    await reload()
  }, [bogenId, reload])

  const updateMeta = useCallback(async (req: Partial<CreateSpielbogenRequest>): Promise<SpielbogenResponse> => {
    if (bogenId == null) throw new Error('bogenId is required')
    const result = await api.updateSpielbogen(bogenId, req)
    await reload()
    return result
  }, [bogenId, reload])

  const updateSlot = useCallback(async (slotId: number, req: UpdateSlotRequest): Promise<SpielbogenSlotResponse> => {
    if (bogenId == null) throw new Error('bogenId is required')
    const result = await api.updateSpielbogenSlot(bogenId, slotId, req)
    await reload()
    return result
  }, [bogenId, reload])

  return { sheet, loading, error, reload, recordAtBat, recordStealing, recordSubstitution, recordPositionSwap, undoLast, undoLastStealing, switchSide, resetScoring, correctLastAtBat, setCurrentSide, updateMeta, updateSlot }
}
