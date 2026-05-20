import { useState, useCallback, useRef } from 'react'
import type { Player, LocalLineupEntry, LocalSubstitution, LineupEntryResponse, SubstitutionResponse, LineupSuggestionEntry } from '@/types'
import * as api from '@/api/client'

interface GameLineupState {
  entries: LocalLineupEntry[]
  savedEntries: LineupEntryResponse[]
  substitutions: LocalSubstitution[]
  savedSubstitutions: SubstitutionResponse[]
}

export function useLineup() {
  const [entries, setEntries] = useState<LocalLineupEntry[]>([])
  const [savedEntries, setSavedEntries] = useState<LineupEntryResponse[]>([])
  const [substitutions, setSubstitutions] = useState<LocalSubstitution[]>([])
  const [savedSubstitutions, setSavedSubstitutions] = useState<SubstitutionResponse[]>([])
  const [saving, setSaving] = useState(false)

  // Refs for caching: track current values without stale closures
  const entriesRef = useRef(entries)
  const savedRef = useRef(savedEntries)
  const subsRef = useRef(substitutions)
  const savedSubsRef = useRef(savedSubstitutions)
  const activeIdRef = useRef<number | null>(null)
  const cache = useRef<Map<number, GameLineupState>>(new Map())

  // Keep refs in sync
  entriesRef.current = entries
  savedRef.current = savedEntries
  subsRef.current = substitutions
  savedSubsRef.current = savedSubstitutions

  const load = useCallback(async (gameId: number) => {
    // Save current game state to cache before switching
    const prevId = activeIdRef.current
    if (prevId !== null && prevId !== gameId) {
      cache.current.set(prevId, {
        entries: [...entriesRef.current],
        savedEntries: [...savedRef.current],
        substitutions: [...subsRef.current],
        savedSubstitutions: [...savedSubsRef.current],
      })
    }
    activeIdRef.current = gameId

    // Restore from cache if available
    const cached = cache.current.get(gameId)
    if (cached) {
      setEntries(cached.entries)
      setSavedEntries(cached.savedEntries)
      setSubstitutions(cached.substitutions)
      setSavedSubstitutions(cached.savedSubstitutions)
      return
    }

    // Load from backend
    const [data, subsData] = await Promise.all([
      api.getLineup(gameId),
      api.getSubstitutions(gameId),
    ])
    setSavedEntries(data)
    setEntries(data.map(e => ({
      player: e.player,
      position: e.position,
      dhBatterId: e.dhBatterPlayer?.id ?? null,
      dhBatterName: e.dhBatterPlayer?.name ?? null,
    })))
    setSavedSubstitutions(subsData)
    setSubstitutions(subsData.map(s => ({
      playerOut: s.playerOut,
      playerIn: s.playerIn,
      inning: s.inning,
    })))
  }, [])

  const addPlayer = useCallback((player: Player) => {
    setEntries(prev => {
      if (prev.length >= 10) return prev
      if (prev.some(e => e.player.id === player.id)) return prev
      const newEntry = { player, position: null, dhBatterId: null, dhBatterName: null }
      if (player.defaultBattingOrder) {
        // Insert at the first position where existing entry has higher
        // defaultBattingOrder (oder kein order). Stable relative-Order
        // unabhängig in welcher Reihenfolge man Spieler hinzufügt.
        let insertAt = prev.length
        for (let i = 0; i < prev.length; i++) {
          const order = prev[i].player.defaultBattingOrder
          if (order == null || order > player.defaultBattingOrder) {
            insertAt = i
            break
          }
        }
        return [...prev.slice(0, insertAt), newEntry, ...prev.slice(insertAt)]
      }
      return [...prev, newEntry]
    })
  }, [])

  const removePlayer = useCallback((playerId: number) => {
    setEntries(prev => prev
      .filter(e => e.player.id !== playerId)
      .map(e => e.dhBatterId === playerId ? { ...e, dhBatterId: null, dhBatterName: null } : e)
    )
    // Also remove substitutions involving this player
    setSubstitutions(prev => prev.filter(s => s.playerOut.id !== playerId))
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

  const replacePlayer = useCallback((rowPlayerId: number, newPlayer: Player) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.player.id === rowPlayerId)
      if (idx < 0) return prev
      const cleared = prev.map(e =>
        e.dhBatterId === newPlayer.id ? { ...e, dhBatterId: null, dhBatterName: null } : e
      )
      const updated = [...cleared]
      updated[idx] = { ...updated[idx], player: newPlayer }
      return updated
    })
  }, [])

  const swapEntries = useCallback((idA: number, idB: number) => {
    setEntries(prev => {
      const ia = prev.findIndex(e => e.player.id === idA)
      const ib = prev.findIndex(e => e.player.id === idB)
      if (ia < 0 || ib < 0 || ia === ib) return prev
      const next = [...prev]
      ;[next[ia], next[ib]] = [next[ib], next[ia]]
      return next
    })
  }, [])

  const addSubstitution = useCallback((playerOut: Player, playerIn: Player, inning: number) => {
    setSubstitutions(prev => [...prev, { playerOut, playerIn, inning }])
  }, [])

  const removeSubstitution = useCallback((index: number) => {
    setSubstitutions(prev => prev.filter((_, i) => i !== index))
  }, [])

  const save = useCallback(async (gameId: number) => {
    const toSave = entries
      .map((e, i) => ({
        playerId: e.player.id,
        position: e.position ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: e.dhBatterId,
      }))

    const subsToSave = substitutions.map(s => ({
      playerOutId: s.playerOut.id,
      playerInId: s.playerIn.id,
      inning: s.inning,
    }))

    setSaving(true)
    try {
      // Sequential: lineup first, then substitutions (validation depends on lineup)
      const saved = await api.setLineup(gameId, toSave)
      const savedSubs = await api.setSubstitutions(gameId, subsToSave)
      setSavedEntries(saved)
      setSavedSubstitutions(savedSubs)
      // Update cache after save
      cache.current.set(gameId, {
        entries,
        savedEntries: saved,
        substitutions,
        savedSubstitutions: savedSubs,
      })
      return true
    } finally {
      setSaving(false)
    }
  }, [entries, substitutions])

  const hasChanges = (() => {
    if (entries.length !== savedEntries.length) return true
    const lineupChanged = entries.some((e, i) => {
      const s = savedEntries[i]
      if (!s || e.player.id !== s.player.id || e.position !== s.position) return true
      const savedDh = s.dhBatterPlayer?.id ?? null
      return e.dhBatterId !== savedDh
    })
    if (lineupChanged) return true

    if (substitutions.length !== savedSubstitutions.length) return true
    return substitutions.some((sub, i) => {
      const saved = savedSubstitutions[i]
      if (!saved) return true
      return sub.playerOut.id !== saved.playerOut.id
        || sub.playerIn.id !== saved.playerIn.id
        || sub.inning !== saved.inning
    })
  })()

  const importEntries = useCallback((newEntries: LocalLineupEntry[]) => {
    setEntries(newEntries.slice(0, 10))
  }, [])

  const clearAll = useCallback(() => {
    setEntries([])
    setSubstitutions([])
  }, [])

  const revert = useCallback(() => {
    setEntries(savedEntries.map(e => ({
      player: e.player,
      position: e.position,
      dhBatterId: e.dhBatterPlayer?.id ?? null,
      dhBatterName: e.dhBatterPlayer?.name ?? null,
    })))
    setSubstitutions(savedSubstitutions.map(s => ({
      playerOut: s.playerOut,
      playerIn: s.playerIn,
      inning: s.inning,
    })))
  }, [savedEntries, savedSubstitutions])

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
    setSubstitutions(prev => prev.filter(s =>
      availableIds.has(s.playerOut.id) && availableIds.has(s.playerIn.id)
    ))
  }, [])

  const activeGameId = activeIdRef.current

  return {
    entries, substitutions, saving, hasChanges, activeGameId,
    load, addPlayer, removePlayer, setPosition, setDhBatter,
    moveUp, moveDown, reorder, replacePlayer, swapEntries, save, importEntries, clearAll, removeUnavailable,
    applySuggestion, invalidateCache, addSubstitution, removeSubstitution, revert,
  }
}
