import { useState, useEffect, useCallback } from 'react'
import type { Season } from '@/types'
import * as api from '@/api/client'

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSeasons(await api.getSeasons())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (name: string, year: number) => {
    const s = await api.createSeason(name, year)
    setSeasons(prev => [...prev, s])
    return s
  }

  const update = async (id: number, name: string, year: number) => {
    const s = await api.updateSeason(id, name, year)
    setSeasons(prev => prev.map(x => x.id === id ? s : x))
    return s
  }

  const remove = async (id: number) => {
    await api.deleteSeason(id)
    setSeasons(prev => prev.filter(x => x.id !== id))
  }

  return { seasons, loading, create, update, remove, reload: load }
}
