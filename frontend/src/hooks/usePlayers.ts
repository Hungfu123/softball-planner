import { useState, useEffect, useCallback } from 'react'
import type { Player } from '@/types'
import * as api from '@/api/client'

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getPlayers()
      setPlayers(data.sort((a, b) => a.name.localeCompare(b.name)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (name: string) => {
    const p = await api.createPlayer(name)
    setPlayers(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))
    return p
  }

  const update = async (id: number, data: { name?: string; regular?: boolean }) => {
    const p = await api.updatePlayer(id, data)
    setPlayers(prev => prev.map(x => x.id === id ? p : x).sort((a, b) => a.name.localeCompare(b.name)))
    return p
  }

  const remove = async (id: number) => {
    await api.deletePlayer(id)
    setPlayers(prev => prev.filter(x => x.id !== id))
  }

  return { players, loading, create, update, remove, reload: load }
}
