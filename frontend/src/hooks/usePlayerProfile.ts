import { useCallback, useEffect, useState } from 'react'
import * as api from '@/api/client'
import type { Player, PlayerBattingStatsResponse, PlayerFormPoint, PlayerUsage, PositionSlot, SeasonPlayerStats } from '@/types'

/** Zeitraum der Seite: alles, ein Kalenderjahr oder eine einzelne Saison. */
export type ProfileScope =
  | { kind: 'all' }
  | { kind: 'year'; year: number }
  | { kind: 'season'; seasonId: number; name: string; year: number | null }

/** Alles, was ein Zeitraum-Wechsel verschiebt. */
interface ScopedStats {
  /** Alle Spieler, nicht nur dieser: der Teamvergleich braucht das Feld dahinter. */
  battingField: PlayerBattingStatsResponse[]
  gameStats: SeasonPlayerStats | null
  usage: PlayerUsage | null
}

/**
 * Daten der Spielerprofil-Seite: Stammdaten, Form-Kurve und die Zahlen drumherum.
 *
 * Die Form-Kurve trägt Jahr, Saison und Gegner je Punkt — der Zeitraum schneidet sie
 * ohne zweiten Request zu. Teamvergleich, gespielte Positionen und Einsatz kommen
 * dagegen fertig gerechnet aus dem Backend und werden beim Wechsel nachgeladen;
 * Stammdaten und Zeitreihe bleiben stehen.
 */
export function usePlayerProfile(playerId: number, scope: ProfileScope) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [timeline, setTimeline] = useState<PlayerFormPoint[]>([])
  const [allTime, setAllTime] = useState<ScopedStats>({ battingField: [], gameStats: null, usage: null })
  const [scoped, setScoped] = useState<ScopedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scopeLoading, setScopeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, points, allTimeGames, allTimeBattingStats, playerUsage] = await Promise.all([
        api.getPlayer(playerId),
        api.getPlayerBattingTimeline(playerId),
        api.getAllTimeStats(),
        api.getAllTimeBattingStats(),
        api.getPlayerUsage(playerId),
      ])
      setPlayer(p)
      setTimeline(points)
      setAllTime({
        battingField: allTimeBattingStats,
        gameStats: allTimeGames.find(s => s.playerId === playerId) ?? null,
        usage: playerUsage,
      })
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => { load() }, [load])

  // Der Scope steckt in zwei Zahlen — als Primitive in der Dependency-Liste, sonst
  // lädt jedes Rendern neu (ein Objekt ist nie gleich dem vorigen).
  const scopeYear = scope.kind === 'year' ? scope.year : null
  const scopeSeasonId = scope.kind === 'season' ? scope.seasonId : null

  useEffect(() => {
    if (scopeYear == null && scopeSeasonId == null) {
      setScoped(null)
      return
    }
    let cancelled = false
    setScopeLoading(true)
    const requests = scopeSeasonId != null
      ? [
          api.getSeasonBattingStats(scopeSeasonId),
          api.getSeasonStats(scopeSeasonId),
          api.getPlayerUsage(playerId, { seasonId: scopeSeasonId }),
        ] as const
      : [
          api.getYearBattingStats(scopeYear as number),
          api.getYearStats(scopeYear as number),
          api.getPlayerUsage(playerId, { year: scopeYear as number }),
        ] as const

    Promise.all(requests)
      .then(([battingField, games, usage]) => {
        if (cancelled) return
        setScoped({ battingField, gameStats: games.find(s => s.playerId === playerId) ?? null, usage })
      })
      // Ein kaputter Zeitraum darf das Profil nicht leeren — dann bleiben die Zahlen
      // des Gesamtzeitraums stehen.
      .catch(() => { if (!cancelled) setScoped(null) })
      .finally(() => { if (!cancelled) setScopeLoading(false) })
    return () => { cancelled = true }
  }, [playerId, scopeYear, scopeSeasonId])

  const savePositions = async (slots: {
    primary: PositionSlot | null
    secondary: PositionSlot | null
    tertiary: PositionSlot | null
  }) => {
    const updated = await api.updatePlayerPositions(playerId, slots)
    setPlayer(updated)
    return updated
  }

  const rename = async (name: string) => {
    const updated = await api.updatePlayer(playerId, { name })
    setPlayer(updated)
    return updated
  }

  const setArchived = async (archived: boolean) => {
    const updated = archived ? await api.archivePlayer(playerId) : await api.unarchivePlayer(playerId)
    setPlayer(updated)
    return updated
  }

  const setRegular = async (regular: boolean) => {
    const updated = await api.updatePlayer(playerId, { regular })
    setPlayer(updated)
    return updated
  }

  const stats = scoped ?? allTime

  return {
    player,
    timeline,
    gameStats: stats.gameStats,
    battingField: stats.battingField,
    usage: stats.usage,
    loading,
    scopeLoading,
    error,
    reload: load,
    savePositions,
    rename,
    setArchived,
    setRegular,
  }
}
