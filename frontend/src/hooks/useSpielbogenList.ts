import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { SpielbogenResponse } from '@/types'

export function useSpielbogenList(filter?: { seasonId?: number }) {
  const [items, setItems] = useState<SpielbogenResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seasonId = filter?.seasonId

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listSpielbogen(seasonId != null ? { seasonId } : undefined)
      setItems(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    reload()
  }, [reload])

  const remove = useCallback(async (id: number) => {
    await api.deleteSpielbogen(id)
    await reload()
  }, [reload])

  return { items, loading, error, reload, remove }
}
