import { useState, useCallback, useRef } from 'react'
import type { Player, LocalLineupEntry, LineupEntryResponse, LineupSuggestionEntry } from '@/types'
import * as api from '@/api/client'

interface GameLineupState {
  entries: LocalLineupEntry[]
  savedEntries: LineupEntryResponse[]
}

export function useLineup() {
  const [entries, setEntries] = useState<LocalLineupEntry[]>([])
  const [savedEntries, setSavedEntries] = useState<LineupEntryResponse[]>([])
  const [saving, setSaving] = useState(false)

  // Refs for caching: track current values without stale closures
  const entriesRef = useRef(entries)
  const savedRef = useRef(savedEntries)
  const activeIdRef = useRef<number | null>(null)
  const cache = useRef<Map<number, GameLineupState>>(new Map())

  // Keep refs in sync
  entriesRef.current = entries
  savedRef.current = savedEntries

  const load = useCallback(async (gameId: number) => {
    // Save current game state to cache before switching
    const prevId = activeIdRef.current
    if (prevId !== null && prevId !== gameId) {
      cache.current.set(prevId, {
        entries: [...entriesRef.current],
        savedEntries: [...savedRef.current],
      })
    }
    activeIdRef.current = gameId

    // Restore from cache if available
    const cached = cache.current.get(gameId)
    if (cached) {
      setEntries(cached.entries)
      setSavedEntries(cached.savedEntries)
      return
    }

    // Load from backend
    const data = await api.getLineup(gameId)
    setSavedEntries(data)
    setEntries(data.map(e => ({
      player: e.player,
      position: e.position,
      dhBatterId: e.dhBatterPlayer?.id ?? null,
      dhBatterName: e.dhBatterPlayer?.name ?? null,
    })))
  }, [])

  const addPlayer = useCallback((player: Player) => {
    setEntries(prev => {
      if (prev.length >= 10) return prev
      if (prev.some(e => e.player.id === player.id)) return prev
      return [...prev, { player, position: null, dhBatterId: null, dhBatterName: null }]
    })
  }, [])

  const removePlayer = useCallback((playerId: number) => {
    setEntries(prev => prev
      .filter(e => e.player.id !== playerId)
      .map(e => e.dhBatterId === playerId ? { ...e, dhBatterId: null, dhBatterName: null } : e)
    )
  }, [])

  const setPosition = useCallback((playerId: number, position: string) => {
    setEntries(prev => prev.map(e =>
      e.player.id === playerId
        ? { ...e, position: position || null, dhBatterId: null, dhBatterName: null }
        : e
    ))
  }, [])

  const setDhBatter = useCallback((fieldPlayerId: number, batter: Player | null) => {
    setEntries(prev => prev.map(e =>
      e.player.id === fieldPlayerId
        ? { ...e, dhBatterId: batter?.id ?? null, dhBatterName: batter?.name ?? null }
        : e
    ))
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return
    setEntries(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setEntries(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const reorder = useCallback((oldIndex: number, newIndex: number) => {
    setEntries(prev => {
      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      return next
    })
  }, [])

  const save = useCallback(async (gameId: number) => {
    const toSave = entries
      .map((e, i) => ({
        playerId: e.player.id,
        position: e.position ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: e.dhBatterId,
      }))

    setSaving(true)
    try {
      const saved = await api.setLineup(gameId, toSave)
      setSavedEntries(saved)
      // Update cache after save
      cache.current.set(gameId, { entries, savedEntries: saved })
      return true
    } finally {
      setSaving(false)
    }
  }, [entries])

  const hasChanges = (() => {
    if (entries.length !== savedEntries.length) return true
    return entries.some((e, i) => {
      const s = savedEntries[i]
      if (!s || e.player.id !== s.player.id || e.position !== s.position) return true
      const savedDh = s.dhBatterPlayer?.id ?? null
      return e.dhBatterId !== savedDh
    })
  })()

  const importEntries = useCallback((newEntries: LocalLineupEntry[]) => {
    setEntries(newEntries.slice(0, 10))
  }, [])

  const clearAll = useCallback(() => {
    setEntries([])
  }, [])

  const applySuggestion = useCallback((suggestions: LineupSuggestionEntry[], availablePlayers: Player[]) => {
    const playerMap = new Map(availablePlayers.map(p => [p.id, p]))
    // Build full lineup from suggestion, keeping DH info from existing entries
    setEntries(prev => {
      const prevMap = new Map(prev.map(e => [e.player.id, e]))
      const result: LocalLineupEntry[] = []

      for (const s of suggestions) {
        const player = playerMap.get(s.playerId) ?? prevMap.get(s.playerId)?.player
        if (!player) continue
        const existing = prevMap.get(s.playerId)
        result.push({
          player,
          position: s.position,
          dhBatterId: existing?.dhBatterId ?? null,
          dhBatterName: existing?.dhBatterName ?? null,
        })
      }

      return result.slice(0, 10)
    })
  }, [])

  const invalidateCache = useCallback(() => {
    cache.current.clear()
  }, [])

  const removeUnavailable = useCallback((availableIds: Set<number>) => {
    setEntries(prev => prev
      .filter(e => availableIds.has(e.player.id))
      .map(e => e.dhBatterId && !availableIds.has(e.dhBatterId)
        ? { ...e, dhBatterId: null, dhBatterName: null }
        : e
      )
    )
  }, [])

  const activeGameId = activeIdRef.current

  return {
    entries, saving, hasChanges, activeGameId,
    load, addPlayer, removePlayer, setPosition, setDhBatter,
    moveUp, moveDown, reorder, save, importEntries, clearAll, removeUnavailable,
    applySuggestion, invalidateCache,
  }
}
