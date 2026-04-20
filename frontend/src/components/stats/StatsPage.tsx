import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import type { PlayerBattingStatsResponse, Season, SeasonPlayerStats } from '@/types'
import { BattingStatsTable } from './BattingStatsTable'
import { GamesStatsTable } from './GamesStatsTable'
import { StatsGlossarySheet } from './StatsGlossarySheet'

type ScopeKind = 'season' | 'year' | 'allTime' | 'game'
type ViewKind = 'batting' | 'games'

export function StatsPage() {
  const [params, setParams] = useSearchParams()

  const scopeKind = (params.get('scope') as ScopeKind) || 'season'
  const view = (params.get('view') as ViewKind) || 'batting'
  const seasonIdParam = params.get('seasonId')
  const yearParam = params.get('year')
  const gameIdParam = params.get('gameId')
  const selectedGameId = gameIdParam ? Number(gameIdParam) : null

  const [seasons, setSeasons] = useState<Season[]>([])
  const [years, setYears] = useState<number[]>([])
  const [seasonsForYear, setSeasonsForYear] = useState<Season[]>([])
  const [battingStats, setBattingStats] = useState<PlayerBattingStatsResponse[]>([])
  const [gamesStats, setGamesStats] = useState<SeasonPlayerStats[]>([])
  const [loading, setLoading] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)

  // Initial loads
  useEffect(() => {
    api.getSeasons().then(setSeasons).catch(() => setSeasons([]))
    api.getDistinctYears().then(setYears).catch(() => setYears([]))
  }, [])

  // Default selections if missing
  const selectedSeasonId = useMemo(() => {
    if (seasonIdParam) return Number(seasonIdParam)
    return seasons[0]?.id ?? null
  }, [seasonIdParam, seasons])

  const selectedYear = useMemo(() => {
    if (yearParam) return Number(yearParam)
    return years[0] ?? new Date().getFullYear()
  }, [yearParam, years])

  // Update search params
  const setScope = (kind: ScopeKind) => {
    const next = new URLSearchParams(params)
    next.set('scope', kind)
    if (kind === 'season' && selectedSeasonId != null) next.set('seasonId', String(selectedSeasonId))
    if (kind === 'year') next.set('year', String(selectedYear))
    setParams(next, { replace: true })
  }
  const setView = (v: ViewKind) => {
    const next = new URLSearchParams(params)
    next.set('view', v)
    setParams(next, { replace: true })
  }
  const setSeasonId = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('seasonId', String(id))
    setParams(next, { replace: true })
  }
  const setYear = (y: number) => {
    const next = new URLSearchParams(params)
    next.set('year', String(y))
    setParams(next, { replace: true })
  }

  // Load stats when scope changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const battingP = (): Promise<PlayerBattingStatsResponse[]> => {
      if (scopeKind === 'game' && selectedGameId != null) return api.getGameBattingStats(selectedGameId)
      if (scopeKind === 'season' && selectedSeasonId != null) return api.getSeasonBattingStats(selectedSeasonId)
      if (scopeKind === 'year') return api.getYearBattingStats(selectedYear)
      if (scopeKind === 'allTime') return api.getAllTimeBattingStats()
      return Promise.resolve([])
    }
    const gamesP = (): Promise<SeasonPlayerStats[]> => {
      if (scopeKind === 'game') return Promise.resolve([]) // Einsätze pro einzelnem Spiel = nicht sinnvoll
      if (scopeKind === 'season' && selectedSeasonId != null) return api.getSeasonStats(selectedSeasonId)
      if (scopeKind === 'year') return api.getYearStats(selectedYear)
      if (scopeKind === 'allTime') return api.getAllTimeStats()
      return Promise.resolve([])
    }

    Promise.all([battingP(), gamesP()])
      .then(([batting, games]) => {
        if (cancelled) return
        setBattingStats(batting)
        setGamesStats(games)
      })
      .catch(() => {
        if (cancelled) return
        setBattingStats([])
        setGamesStats([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [scopeKind, selectedSeasonId, selectedYear, selectedGameId])

  // Load seasons-by-year for Kontext-Info
  useEffect(() => {
    if (scopeKind !== 'year') return
    api.getYearSeasons(selectedYear).then(setSeasonsForYear).catch(() => setSeasonsForYear([]))
  }, [scopeKind, selectedYear])

  const contextInfo = useMemo(() => {
    if (scopeKind === 'game') {
      return selectedGameId != null ? `Nur dieses Spiel — Stats aus den At-Bats` : 'Kein Spiel ausgewählt'
    }
    if (scopeKind === 'season') {
      const s = seasons.find(x => x.id === selectedSeasonId)
      return s ? `${s.name} · ${s.year}` : 'Keine Saison ausgewählt'
    }
    if (scopeKind === 'year') {
      if (seasonsForYear.length === 0) return `Jahr ${selectedYear}`
      const names = seasonsForYear.map(s => s.name).join(', ')
      return `Jahr ${selectedYear} · ${seasonsForYear.length} ${seasonsForYear.length === 1 ? 'Saison' : 'Saisons'}: ${names}`
    }
    return `Alle Jahre · ${seasons.length} ${seasons.length === 1 ? 'Saison' : 'Saisons'}`
  }, [scopeKind, seasons, seasonsForYear, selectedSeasonId, selectedYear, selectedGameId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-softball-red-600 rounded-full" />
          <h1 className="text-2xl font-bold text-gray-950">Statistik</h1>
          <button
            onClick={() => setShowGlossary(true)}
            className="ml-auto text-sm text-gray-500 hover:text-navy-700 cursor-pointer flex items-center gap-1"
            title="Abkürzungen und Formeln erklärt"
          >
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-bold">i</span>
            <span className="hidden sm:inline">Abkürzungen</span>
          </button>
        </div>

        {/* Scope Toggle */}
        <div className="flex flex-wrap gap-2 mb-3">
          {scopeKind === 'game' && (
            <ScopeChip active={true} onClick={() => { /* noop */ }}>Dieses Spiel</ScopeChip>
          )}
          <ScopeChip active={scopeKind === 'season'} onClick={() => setScope('season')}>Saison</ScopeChip>
          <ScopeChip active={scopeKind === 'year'} onClick={() => setScope('year')}>Jahr</ScopeChip>
          <ScopeChip active={scopeKind === 'allTime'} onClick={() => setScope('allTime')}>Alle Zeit</ScopeChip>
        </div>

        {/* Scope Picker */}
        {scopeKind === 'season' && seasons.length > 0 && (
          <select
            value={selectedSeasonId ?? ''}
            onChange={e => setSeasonId(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
            ))}
          </select>
        )}
        {scopeKind === 'year' && years.length > 0 && (
          <select
            value={selectedYear}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        {/* Kontext-Info */}
        <p className="text-xs text-gray-500 mt-2">{contextInfo}</p>
      </div>

      {/* View Tabs — 'Einsätze' macht nur Sinn bei aggregierten Scopes */}
      <div className="flex gap-2 border-b border-gray-200">
        <ViewTab active={view === 'batting'} onClick={() => setView('batting')}>Schlagen</ViewTab>
        {scopeKind !== 'game' && (
          <ViewTab active={view === 'games'} onClick={() => setView('games')}>Einsätze</ViewTab>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-navy-800 rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
          </div>
        </div>
      ) : view === 'batting' ? (
        <BattingStatsTable stats={battingStats} onOpenGlossary={() => setShowGlossary(true)} />
      ) : (
        <GamesStatsTable stats={gamesStats} />
      )}

      <StatsGlossarySheet open={showGlossary} onClose={() => setShowGlossary(false)} />
    </div>
  )
}

function ScopeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-semibold rounded-full cursor-pointer transition-colors ${
        active ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold cursor-pointer border-b-2 -mb-[2px] transition-colors ${
        active ? 'border-softball-red-600 text-softball-red-700' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
