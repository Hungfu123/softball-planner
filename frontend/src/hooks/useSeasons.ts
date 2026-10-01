import { useState, useEffect, useCallback } from 'react'
import type { Season, YearCopyResponse } from '@/types'
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

  /** "Jahr übernehmen": Ligen des Vorlagen-Jahres ins Ziel-Jahr anlegen — lädt danach alle Saisons neu. */
  const copyYear = async (templateYear: number, targetYear: number, copyTeams: boolean): Promise<YearCopyResponse> => {
    const result = await api.copySeasonYear(templateYear, targetYear, copyTeams)
    await load()
    return result
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

  return { seasons, loading, create, copyYear, update, remove, reload: load }
}
