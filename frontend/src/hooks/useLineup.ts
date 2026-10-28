import { useState, useCallback, useRef } from 'react'
import type { Player, LocalLineupEntry, LocalSubstitution, LineupEntryResponse, SubstitutionResponse, LineupSuggestionEntry, LineupSetEntryResponse, LineupSetStaffEntryResponse } from '@/types'
import * as api from '@/api/client'

let emptySlotSeq = 0
function makeEmptySlot(position: string | null): LocalLineupEntry {
  emptySlotSeq -= 1
  return {
    player: { id: emptySlotSeq, name: '— frei —' } as Player,
    position,
    dhBatterId: null,
    dhBatterName: null,
    isEmptySlot: true,
  }
}

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

    // Restore from cache if available (applySet writes other games' drafts here eagerly).
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
      const posA = next[ia].position
      const posB = next[ib].position
      next[ia] = { ...next[ia], position: posB, dhBatterId: null, dhBatterName: null }
      next[ib] = { ...next[ib], position: posA, dhBatterId: null, dhBatterName: null }
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
    if (entries.some(e => e.isEmptySlot)) {
      throw new Error('Lineup hat freie Slots — bitte füllen oder entfernen')
    }
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

  // Current draft entries for any game (active = live state, others = cache).
  // undefined = game was never loaded/modified (leave its DB state untouched).
  const draftEntriesFor = (gameId: number): LocalLineupEntry[] | undefined =>
    gameId === activeIdRef.current ? entriesRef.current : cache.current.get(gameId)?.entries

  const entriesDiffer = (ents: LocalLineupEntry[], saved: LineupEntryResponse[]): boolean => {
    if (ents.length !== saved.length) return true
    return ents.some((e, i) => {
      const s = saved[i]
      if (!s || e.player.id !== s.player.id || e.position !== s.position) return true
      return e.dhBatterId !== (s.dhBatterPlayer?.id ?? null)
    })
  }

  const subsDiffer = (subs: LocalSubstitution[], saved: SubstitutionResponse[]): boolean => {
    if (subs.length !== saved.length) return true
    return subs.some((sub, i) => {
      const s = saved[i]
      if (!s) return true
      return sub.playerOut.id !== s.playerOut.id
        || sub.playerIn.id !== s.playerIn.id
        || sub.inning !== s.inning
    })
  }

  // True if any of the given games has unsaved lineup- OR substitution-changes
  // (active or cached). Subs zählen mit, sonst bleibt der Speichern-Button aus,
  // wenn im anderen Tab nur eine Auswechslung entfernt wurde.
  const hasUnsavedWork = useCallback((gameIds: number[]): boolean => {
    const activeId = activeIdRef.current
    return gameIds.some(gid => {
      if (gid === activeId) {
        return entriesDiffer(entriesRef.current, savedRef.current)
          || subsDiffer(subsRef.current, savedSubsRef.current)
      }
      const c = cache.current.get(gid)
      return c
        ? entriesDiffer(c.entries, c.savedEntries) || subsDiffer(c.substitutions, c.savedSubstitutions)
        : false
    })
  }, [])

  // Persist EVERY game's current draft (lineup + substitutions) across all tabs.
  // Drives the "Lineup speichern" button (whole gameday) and "Als Set speichern".
  // Games with an empty slot (absent player) are skipped — their gameNumber is
  // returned so the caller can prompt the user to fill them. Untouched games are
  // left as-is.
  const saveAllGames = useCallback(async (games: { id: number; gameNumber: number }[]): Promise<number[]> => {
    const activeId = activeIdRef.current
    const skipped: number[] = []
    setSaving(true)
    try {
      for (const g of games) {
        const ents = draftEntriesFor(g.id)
        if (!ents) continue // never touched -> leave DB as is
        if (ents.some(e => e.isEmptySlot)) { skipped.push(g.gameNumber); continue }

        const payload = ents.map((e, i) => ({
          playerId: e.player.id,
          position: e.position ?? null,
          battingOrder: i + 1,
          dhBatterPlayerId: e.dhBatterId,
        }))
        const subs = g.id === activeId ? subsRef.current : (cache.current.get(g.id)?.substitutions ?? [])
        const subsPayload = subs.map(s => ({
          playerOutId: s.playerOut.id,
          playerInId: s.playerIn.id,
          inning: s.inning,
        }))
        // Fehler dem Spiel zuordnen — sonst sieht der User eine Meldung zu einem
        // Lineup, das gerade nicht im offenen Tab steht, und versteht sie nicht.
        let saved: LineupEntryResponse[]
        let savedSubs: SubstitutionResponse[]
        try {
          saved = await api.setLineup(g.id, payload)
          savedSubs = await api.setSubstitutions(g.id, subsPayload)
        } catch (e: unknown) {
          throw new Error(`Spiel ${g.gameNumber}: ${(e as Error).message}`)
        }
        cache.current.set(g.id, {
          entries: ents,
          savedEntries: saved,
          substitutions: subs,
          savedSubstitutions: savedSubs,
        })
        if (g.id === activeId) {
          setSavedEntries(saved)
          setSavedSubstitutions(savedSubs)
        }
      }
    } finally {
      setSaving(false)
    }
    return skipped
  }, [])

  const hasEmptySlots = entries.some(e => e.isEmptySlot)

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

  // Build one game's draft from set entries; absent players -> empty placeholder slot.
  const buildGameDraft = (
    setItems: LineupSetEntryResponse[],
    availableById: Map<number, Player>,
  ): LocalLineupEntry[] => {
    return [...setItems]
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map(e => {
        const player = availableById.get(e.player.id)
        if (!player) {
          return makeEmptySlot(e.position)   // field player absent -> empty slot, DH dropped with it
        }
        const dhPresent = e.dhBatterPlayer != null && availableById.has(e.dhBatterPlayer.id)
        return {
          player,
          position: e.position,
          dhBatterId: dhPresent ? e.dhBatterPlayer!.id : null,
          dhBatterName: dhPresent ? e.dhBatterPlayer!.name : null,
        }
      })
      .slice(0, 10)
  }

  // Apply a whole-gameday set in ONE action across ALL games:
  //  - games whose lineup is COMPLETE (no absent player) are persisted to the DB
  //    immediately — no extra "Lineup speichern" click needed.
  //  - games with an empty slot (a set player is absent) are left as an UNSAVED
  //    draft so the user fills the gap, then saves that game manually.
  // Returns the gameNumbers that were left unsaved (had gaps) plus coaches from
  // poisoned legacy sets that were skipped because they bat in the set's own lineup.
  const applySet = useCallback(async (
    setItems: LineupSetEntryResponse[],
    staffItems: LineupSetStaffEntryResponse[],
    games: { id: number; gameNumber: number }[],
  ): Promise<{
    skipped: number[]
    skippedCoaches: { gameNumber: number; playerName: string }[]
  }> => {
    // Spieler-Map direkt aus den Set-Daten (Field-Player + DH-Batter) — jeder
    // Set-Spieler ist damit auflösbar; die verfügbaren Spieler wurden vom Planner
    // vorher passend gesetzt.
    const availableById = new Map<number, Player>()
    for (const e of setItems) {
      availableById.set(e.player.id, e.player)
      if (e.dhBatterPlayer) availableById.set(e.dhBatterPlayer.id, e.dhBatterPlayer)
    }
    const staffByGameNumber = new Map<number, { playerId: number; role: string; playerName: string }[]>()
    for (const s of staffItems) {
      const arr = staffByGameNumber.get(s.gameNumber) ?? []
      arr.push({ playerId: s.player.id, role: s.role, playerName: s.player.name })
      staffByGameNumber.set(s.gameNumber, arr)
    }
    const byGameNumber = new Map<number, LineupSetEntryResponse[]>()
    for (const e of setItems) {
      const arr = byGameNumber.get(e.gameNumber) ?? []
      arr.push(e)
      byGameNumber.set(e.gameNumber, arr)
    }
    const activeId = activeIdRef.current
    const skipped: number[] = []
    const skippedCoaches: { gameNumber: number; playerName: string }[] = []

    const baselineFor = async (gameId: number): Promise<GameLineupState> => {
      const cached = cache.current.get(gameId)
      if (cached) return cached
      const [data, subsData] = await Promise.all([api.getLineup(gameId), api.getSubstitutions(gameId)])
      return {
        entries: [],
        savedEntries: data,
        substitutions: subsData.map(s => ({ playerOut: s.playerOut, playerIn: s.playerIn, inning: s.inning })),
        savedSubstitutions: subsData,
      }
    }

    await Promise.all(games.map(async g => {
      if (!byGameNumber.has(g.gameNumber)) return // game not in set -> leave untouched
      const draft = buildGameDraft(byGameNumber.get(g.gameNumber) ?? [], availableById)

      if (draft.some(e => e.isEmptySlot)) {
        // Has a gap (absent player) — cannot persist; leave as an unsaved draft.
        // Coaches trotzdem leeren, sonst bleiben alte Base-Coaches inkonsistent
        // stehen ("Set anwenden" überschreibt Coaches immer, auch bei Skip-Spielen).
        skipped.push(g.gameNumber)
        await api.setStaff(g.id, [])
        const base = await baselineFor(g.id)
        if (g.id === activeId) {
          setEntries(draft)
        } else {
          cache.current.set(g.id, { ...base, entries: draft })
        }
        return
      }

      // Complete lineup — persist. Reihenfolge: Coaches leeren → Lineup → Set-Coaches.
      await api.setStaff(g.id, [])
      const payload = draft.map((e, i) => ({
        playerId: e.player.id,
        position: e.position ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: e.dhBatterId,
      }))
      let saved: LineupEntryResponse[]
      try {
        saved = await api.setLineup(g.id, payload)
      } catch (e: unknown) {
        throw new Error(`Spiel ${g.gameNumber}: ${(e as Error).message}`)
      }
      const setCoaches = staffByGameNumber.get(g.gameNumber) ?? []
      // Vergiftete Alt-Sets: Ein Coach, der im Set-Lineup selbst schlägt (normaler
      // Schläger oder DH-Batter), würde vom Backend mit 400 abgelehnt ("ist bereits
      // im Lineup"). Solche Konflikt-Coaches überspringen statt den ganzen Apply
      // abzubrechen — der Coach-Slot bleibt dann frei.
      const battingIds = new Set<number>()
      for (const e of draft) {
        if (e.dhBatterId != null) battingIds.add(e.dhBatterId)
        else battingIds.add(e.player.id)
      }
      const safeCoaches = setCoaches.filter(c => !battingIds.has(c.playerId))
      for (const c of setCoaches) {
        if (battingIds.has(c.playerId)) skippedCoaches.push({ gameNumber: g.gameNumber, playerName: c.playerName })
      }
      if (safeCoaches.length > 0) {
        try {
          // Nur die API-Felder schicken — playerName ist rein für die Rückmeldung.
          await api.setStaff(g.id, safeCoaches.map(c => ({ playerId: c.playerId, role: c.role })))
        } catch (e: unknown) {
          throw new Error(`Spiel ${g.gameNumber}: ${(e as Error).message}`)
        }
      }
      const base = await baselineFor(g.id)
      cache.current.set(g.id, {
        entries: draft,
        savedEntries: saved,
        substitutions: base.substitutions,
        savedSubstitutions: base.savedSubstitutions,
      })
      if (g.id === activeId) {
        setEntries(draft)
        setSavedEntries(saved)
      }
    }))

    return { skipped, skippedCoaches }
  }, [])

  const fillEmptySlot = useCallback((slotId: number, player: Player) => {
    setEntries(prev => prev.map(e =>
      e.player.id === slotId
        ? { player, position: e.position, dhBatterId: null, dhBatterName: null }
        : e
    ))
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
    setSubstitutions(prev => prev.filter(s =>
      availableIds.has(s.playerOut.id) && availableIds.has(s.playerIn.id)
    ))
  }, [])

  const activeGameId = activeIdRef.current

  return {
    entries, substitutions, saving, hasChanges, hasEmptySlots, activeGameId,
    load, addPlayer, removePlayer, setPosition, setDhBatter,
    moveUp, moveDown, reorder, replacePlayer, swapEntries, save, importEntries, clearAll, removeUnavailable,
    applySuggestion, applySet, fillEmptySlot, saveAllGames, hasUnsavedWork, invalidateCache, addSubstitution, removeSubstitution, revert,
  }
}
