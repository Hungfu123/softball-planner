import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Trophy, Download } from 'lucide-react'
import * as api from '@/api/client'
import type { GameResponse, PlayerBattingStatsResponse, Season, SeasonPlayerStats } from '@/types'
import { BattingStatsTable } from './BattingStatsTable'
import { GamesStatsTable } from './GamesStatsTable'
import { StatsGlossarySheet } from './StatsGlossarySheet'
import { generateBattingStatsPdf } from '@/utils/statsPdf'

type ScopeKind = 'season' | 'year' | 'allTime' | 'game'
type ViewKind = 'batting' | 'games'

const SCOPE_LABEL_MAP: Record<ScopeKind, string> = {
  season: 'Saison',
  year: 'Jahr',
  allTime: 'Alle Zeit',
  game: 'Spiel',
}

export function StatsPage() {
  const [params, setParams] = useSearchParams()

  const scopeKind = (params.get('scope') as ScopeKind) || 'year'
  const view = (params.get('view') as ViewKind) || 'batting'
  const seasonIdParam = params.get('seasonId')
  const yearParam = params.get('year')
  const gameIdParam = params.get('gameId')
  const gameIdParsed = gameIdParam ? Number(gameIdParam) : null
  const selectedGameId = gameIdParsed != null && !Number.isNaN(gameIdParsed) ? gameIdParsed : null

  const [seasons, setSeasons] = useState<Season[]>([])
  const [years, setYears] = useState<number[]>([])
  const [seasonsForYear, setSeasonsForYear] = useState<Season[]>([])
  const [battingStats, setBattingStats] = useState<PlayerBattingStatsResponse[]>([])
  const [gamesStats, setGamesStats] = useState<SeasonPlayerStats[]>([])
  const [selectedGame, setSelectedGame] = useState<GameResponse | null>(null)
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

  // Load game details when scope=game for context-label + PDF filename
  useEffect(() => {
    if (scopeKind !== 'game' || selectedGameId == null) {
      setSelectedGame(null)
      return
    }
    api.getGame(selectedGameId).then(setSelectedGame).catch(() => setSelectedGame(null))
  }, [scopeKind, selectedGameId])

  const contextInfo = useMemo(() => {
    if (scopeKind === 'game') {
      if (selectedGameId == null) return 'Kein Spiel ausgewählt'
      if (!selectedGame) return `Spiel ${selectedGameId}`
      const opp = selectedGame.opponentTeam?.name
      const score = selectedGame.scoreUs != null && selectedGame.scoreThem != null
        ? ` · ${selectedGame.scoreUs}:${selectedGame.scoreThem}`
        : ''
      return opp
        ? `Spiel ${selectedGame.gameNumber} vs ${opp}${score}`
        : `Spiel ${selectedGame.gameNumber}${score}`
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
  }, [scopeKind, seasons, seasonsForYear, selectedSeasonId, selectedYear, selectedGameId, selectedGame])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-cream-300">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">Statistik</h1>
          <button
            onClick={() => setShowGlossary(true)}
            className="font-display ml-auto text-[11px] tracking-widest uppercase text-gray-500 hover:text-navy-700 cursor-pointer flex items-center gap-1.5 font-bold"
            title="Abkürzungen und Formeln erklärt"
          >
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full border border-cream-300 text-gray-600 text-xs font-bold">i</span>
            <span className="hidden sm:inline">Abkürzungen</span>
          </button>
          {view === 'batting' && battingStats.length > 0 && (
            <button
              onClick={() => generateBattingStatsPdf({
                stats: battingStats,
                contextLabel: contextInfo,
                scopeLabel: SCOPE_LABEL_MAP[scopeKind],
              })}
              className="font-display group relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-white bg-navy-900 hover:bg-softball-red-600 rounded-full cursor-pointer transition-colors shadow-sm"
              title="Schlag-Statistiken als PDF exportieren"
            >
              <Download size={12} className="transition-transform group-hover:translate-y-0.5" />
              PDF
            </button>
          )}
        </div>

        {/* Compact Filter-Row: Scope-Pills + Selector inline */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {scopeKind === 'game' && (
            <ScopeChip active={true} onClick={() => { /* noop */ }}>Dieses Spiel</ScopeChip>
          )}
          <ScopeChip active={scopeKind === 'season'} onClick={() => setScope('season')}>Saison</ScopeChip>
          <ScopeChip active={scopeKind === 'year'} onClick={() => setScope('year')}>Jahr</ScopeChip>
          <ScopeChip active={scopeKind === 'allTime'} onClick={() => setScope('allTime')}>Alle Zeit</ScopeChip>

          {/* Selector inline rechts daneben statt eigene Reihe */}
          {scopeKind === 'season' && seasons.length > 0 && (
            <div className="relative inline-flex items-center ml-auto sm:ml-0">
              <select
                value={selectedSeasonId ?? ''}
                onChange={e => setSeasonId(Number(e.target.value))}
                className="font-display appearance-none bg-cream-50 border border-cream-300 rounded-full pl-3 pr-8 py-1.5 text-xs font-bold tracking-wide text-navy-900 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none cursor-pointer hover:border-navy-400"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · {s.year}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}
          {scopeKind === 'year' && years.length > 0 && (
            <div className="relative inline-flex items-center ml-auto sm:ml-0">
              <select
                value={selectedYear}
                onChange={e => setYear(Number(e.target.value))}
                className="font-display appearance-none bg-cream-50 border border-cream-300 rounded-full pl-3 pr-8 py-1.5 text-xs font-bold tracking-wide text-navy-900 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none cursor-pointer hover:border-navy-400"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Highlight-Banner: Top-Stat als visueller Anker */}
      {(() => {
        const topPlayer = battingStats
          .filter(p => p.atBats > 0)
          .sort((a, b) => Number(b.battingAverage) - Number(a.battingAverage))[0]
        if (!topPlayer) return null
        const fmtAvg = (v: number) => {
          const s = v.toFixed(3)
          return s.startsWith('0') ? s.slice(1) : s
        }
        return (
          <div className="bg-cream-50 border border-cream-300 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-softball-red-50 text-softball-red-700 flex items-center justify-center shrink-0">
              <Trophy size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-500">Top Hitter · {contextInfo}</div>
              <div className="font-display font-extrabold text-navy-900 truncate">{topPlayer.playerName}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-2xl sm:text-3xl font-extrabold text-softball-red-600 leading-none tabular-nums">{fmtAvg(Number(topPlayer.battingAverage))}</div>
              <div className="font-display text-[9px] font-bold tracking-widest text-gray-500">AVG</div>
            </div>
          </div>
        )
      })()}

      {/* View Tabs — 'Einsätze' macht nur Sinn bei aggregierten Scopes */}
      <div className="flex gap-2 border-b border-cream-300">
        <ViewTab active={view === 'batting'} onClick={() => setView('batting')}>Schlagen</ViewTab>
        {scopeKind !== 'game' && (
          <ViewTab active={view === 'games'} onClick={() => setView('games')}>Einsätze</ViewTab>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-48 h-1.5 bg-cream-200 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-navy-800 rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
          </div>
        </div>
      ) : view === 'batting' ? (
        <BattingStatsTable
          stats={battingStats}
          onOpenGlossary={() => setShowGlossary(true)}
        />
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
      className={`font-display px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-full cursor-pointer transition-colors ${
        active ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-cream-200 hover:text-navy-900'
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
      className={`font-display px-4 py-2 text-xs font-bold tracking-widest uppercase cursor-pointer border-b-2 -mb-[2px] transition-colors ${
        active ? 'border-softball-red-600 text-softball-red-700' : 'border-transparent text-gray-500 hover:text-navy-900'
      }`}
    >
      {children}
    </button>
  )
}
