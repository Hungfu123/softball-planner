import { useState, useCallback, useEffect } from 'react'
import type { EquipmentItem, EquipmentInput } from '@/types'
import * as api from '@/api/client'

export function useEquipment(gameDayId: number | null) {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (gameDayId == null) return
    setLoading(true)
    try { setItems(await api.getEquipment(gameDayId)) } finally { setLoading(false) }
  }, [gameDayId])

  useEffect(() => { void reload() }, [reload])

  // Optimistic toggle: sofort umschalten, bei Fehler zurückrollen.
  const toggle = useCallback(async (itemId: number, used: boolean) => {
    if (gameDayId == null) return
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, used } : i))
    try {
      await api.toggleEquipment(gameDayId, itemId, used)
    } catch (e) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, used: !used } : i))
      throw e
    }
  }, [gameDayId])

  const add = useCallback(async (input: EquipmentInput) => {
    if (gameDayId == null) return
    const created = await api.createEquipment(gameDayId, input)
    setItems(prev => [...prev, created])
    return created
  }, [gameDayId])

  const edit = useCallback(async (itemId: number, input: EquipmentInput) => {
    const updated = await api.updateEquipment(itemId, input)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updated } : i))
  }, [])

  const remove = useCallback(async (itemId: number) => {
    await api.deleteEquipment(itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  const carryOver = useCallback(async () => {
    if (gameDayId == null) return
    setItems(await api.carryOverEquipment(gameDayId))
  }, [gameDayId])

  return { items, loading, toggle, add, edit, remove, carryOver, reload }
}
