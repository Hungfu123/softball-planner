import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/plays'
import type { Play, PlayCategory } from '@/components/playmaker/board/types'

export function usePlays() {
  const [plays, setPlays] = useState<Play[]>([])
  const [categories, setCategories] = useState<PlayCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, c] = await Promise.all([api.getPlays(), api.getPlayCategories()])
      setPlays(p)
      setCategories(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plays konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const duplicate = async (id: number) => {
    const kopie = await api.duplicatePlay(id)
    setPlays(prev => [kopie, ...prev])
    return kopie
  }

  const remove = async (id: number) => {
    await api.deletePlay(id)
    // Auch die Verweise im Zustand loesen, damit kein Play auf ein geloeschtes Gegenstueck zeigt.
    setPlays(prev =>
      prev
        .filter(p => p.id !== id)
        .map(p => (p.counterpartPlayId === id ? { ...p, counterpartPlayId: null } : p)),
    )
  }

  const addCategory = async (name: string) => {
    const kategorie = await api.createPlayCategory(name)
    setCategories(prev => [...prev, kategorie].sort((a, b) => a.sortOrder - b.sortOrder))
    return kategorie
  }

  return { plays, categories, loading, error, reload: load, duplicate, remove, addCategory }
}
