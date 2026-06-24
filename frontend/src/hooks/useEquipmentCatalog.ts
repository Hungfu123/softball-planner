import { useState, useCallback, useEffect } from 'react'
import type { EquipmentItem, EquipmentInput } from '@/types'
import * as api from '@/api/client'

export function useEquipmentCatalog() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.getEquipmentCatalog()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const add = useCallback(async (input: EquipmentInput) => {
    const created = await api.createEquipmentItem(input)
    setItems(prev => [...prev, created])
    return created
  }, [])

  const edit = useCallback(async (itemId: number, input: EquipmentInput) => {
    const updated = await api.updateEquipment(itemId, input)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updated } : i))
  }, [])

  const remove = useCallback(async (itemId: number) => {
    await api.deleteEquipment(itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  return { items, loading, add, edit, remove, reload }
}
