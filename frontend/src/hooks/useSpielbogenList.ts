import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { SpielbogenResponse } from '@/types'

export function useSpielbogenList(filter?: { seasonId?: number }) {
  const [items, setItems] = useState<SpielbogenResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listSpielbogen(filter)
      setItems(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filter?.seasonId])

  useEffect(() => {
    reload()
  }, [reload])

  const remove = useCallback(async (id: number) => {
    await api.deleteSpielbogen(id)
    await reload()
  }, [reload])

  return { items, loading, error, reload, remove }
}
