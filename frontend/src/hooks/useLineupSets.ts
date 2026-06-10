import { useState, useCallback, useEffect } from 'react'
import type { LineupSetResponse } from '@/types'
import * as api from '@/api/client'

export function useLineupSets(gameDayId: number | null) {
  const [sets, setSets] = useState<LineupSetResponse[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (gameDayId == null) return
    setLoading(true)
    try {
      setSets(await api.getLineupSets(gameDayId))
    } finally {
      setLoading(false)
    }
  }, [gameDayId])

  useEffect(() => { void reload() }, [reload])

  const create = useCallback(async (name: string) => {
    if (gameDayId == null) return
    const created = await api.createLineupSet(gameDayId, name)
    setSets(prev => [...prev, created])
    return created
  }, [gameDayId])

  const rename = useCallback(async (setId: number, name: string) => {
    const updated = await api.renameLineupSet(setId, name)
    setSets(prev => prev.map(s => s.id === setId ? updated : s))
  }, [])

  const remove = useCallback(async (setId: number) => {
    await api.deleteLineupSet(setId)
    setSets(prev => prev.filter(s => s.id !== setId))
  }, [])

  return { sets, loading, reload, create, rename, remove }
}
