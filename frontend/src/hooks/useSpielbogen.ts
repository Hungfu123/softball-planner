import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { SpielbogenResponse, SpielbogenLineupResponse, SetLineupRequest, UpdateSlotRequest } from '@/types'

export function useSpielbogen(id: number | null) {
  const [bogen, setBogen] = useState<SpielbogenResponse | null>(null)
  const [lineup, setLineup] = useState<SpielbogenLineupResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (id == null) return
    setLoading(true)
    setError(null)
    try {
      const [b, lu] = await Promise.all([api.getSpielbogen(id), api.getSpielbogenLineup(id)])
      setBogen(b)
      setLineup(lu)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const setLineupForSide = useCallback(async (req: SetLineupRequest) => {
    if (id == null) return
    await api.setSpielbogenLineup(id, req)
    await reload()
  }, [id, reload])

  const updateSlot = useCallback(async (slotId: number, req: UpdateSlotRequest) => {
    if (id == null) return
    await api.updateSpielbogenSlot(id, slotId, req)
    await reload()
  }, [id, reload])

  const start = useCallback(async () => {
    if (id == null) return
    await api.startSpielbogen(id)
    await reload()
  }, [id, reload])

  const end = useCallback(async (homeRuns?: number, awayRuns?: number) => {
    if (id == null) return
    await api.endSpielbogen(id, { homeRuns, awayRuns })
    await reload()
  }, [id, reload])

  const reopen = useCallback(async () => {
    if (id == null) return
    await api.reopenSpielbogen(id)
    await reload()
  }, [id, reload])

  return { bogen, lineup, loading, error, reload, setLineupForSide, updateSlot, start, end, reopen }
}
