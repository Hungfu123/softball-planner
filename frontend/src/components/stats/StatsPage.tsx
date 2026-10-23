import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Download } from 'lucide-react'
import * as api from '@/api/client'
import type { AwardResponse, GameDayResponse, GameResponse, OpponentBattingStatsResponse, PlayerBattingStatsResponse, Season, SeasonPlayerStats } from '@/types'
import { AwardsCard } from '@/components/dashboard/AwardsCard'
import { BattingStatsTable } from './BattingStatsTable'
import { GamesStatsTable } from './GamesStatsTable'
import { AnalysisModeTabs } from '@/components/analysis/AnalysisModeTabs'
import { StatsGlossarySheet } from './StatsGlossarySheet'
import { StatsTableSkeleton } from './StatsTableSkeleton'
import { generateBattingStatsPdf } from '@/utils/statsPdf'

type ScopeKind = 'season' | 'year' | 'allTime' | 'gameDay' | 'game' | 'opponent'
type ViewKind = 'batting' | 'games'

const SCOPE_LABEL_MAP: Record<ScopeKind, string> = {
  season: 'Saison',
  year: 'Jahr',
  allTime: 'Alle Zeit',
  gameDay: 'Spieltag',
  game: 'Spiel',
  opponent: 'Nach Gegner',
}

/** Scopes mit Rate-Stat-Qualifier (≥5 ABs). Einzel-Spiel + Spieltag bleiben ungefiltert. */
function isAggregatedScope(scope: ScopeKind): boolean {
  return scope === 'season' || scope === 'year' || scope === 'allTime' || scope === 'opponent'
}

function formatGameDayLabel(gd: GameDayResponse): string {
  const d = new Date(gd.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return gd.label ? `${d} · ${gd.label}` : d
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
  const gameDayIdParam = params.get('gameDayId')
  const opponentParam = params.get('opponent')
  const opponentGameParam = params.get('opponentGame')
  const opponentGameParsed = opponentGameParam ? Number(opponentGameParam) : null
  const selectedOpponentGameId = opponentGameParsed != null && !Number.isNaN(opponentGameParsed) ? opponentGameParsed : null

  const [seasons, setSeasons] = useState<Season[]>([])
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [years, setYears] = useState<number[]>([])
  const [seasonsForYear, setSeasonsForYear] = useState<Season[]>([])
  const [opponents, setOpponents] = useState<OpponentBattingStatsResponse[]>([])
  const [battingStats, setBattingStats] = useState<PlayerBattingStatsResponse[]>([])
  const [awards, setAwards] = useState<AwardResponse[]>([])
  const [gamesStats, setGamesStats] = useState<SeasonPlayerStats[]>([])
  const [selectedGame, setSelectedGame] = useState<GameResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)

  // playerId → gewichteter Game-Zähler (totalGames) für RBI/G in der Batting-Tabelle.
  const gamesByPlayerId = useMemo(
    () => new Map(gamesStats.map(g => [g.playerId, g.totalGames])),
    [gamesStats],
  )

  // Initial loads
  useEffect(() => {
    api.getSeasons().then(setSeasons).catch(() => setSeasons([]))
    api.getDistinctYears().then(setYears).catch(() => setYears([]))
    // Spieltage absteigend nach Datum (neueste zuerst) für den Spieltag-Selector
    api.getAllGameDays()
      .then(gds => setGameDays([...gds].sort((a, b) => b.date.localeCompare(a.date))))
      .catch(() => setGameDays([]))
    // Gegner-Übersicht für den Gegner-Selector (Name + Team-AVG)
    api.getOpponentBattingOverview().then(setOpponents).catch(() => setOpponents([]))
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

  const selectedGameDayId = useMemo(() => {
    if (gameDayIdParam) return Number(gameDayIdParam)
    return gameDays[0]?.id ?? null
  }, [gameDayIdParam, gameDays])

  const selectedOpponent = useMemo(() => {
    if (opponentParam) return opponentParam
    return opponents[0]?.teamName ?? null
  }, [opponentParam, opponents])

  // Alle Spiele gegen den gewählten Gegner (über alle Ligen/Saisons) — für den Zeitraum-Filter
  const gamesVsOpponent = useMemo(() => {
    if (scopeKind !== 'opponent' || !selectedOpponent) return []
    return gameDays
      .flatMap(gd => gd.games.map(g => ({ ...g, gameDay: gd })))
      .filter(g => g.opponentTeam?.name?.trim() === selectedOpponent)
      .map(g => {
        const d = new Date(g.gameDay.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
        const score = g.scoreUs != null && g.scoreThem != null ? ` · ${g.scoreUs}:${g.scoreThem}` : ''
        return { gameId: g.id, label: `${d} · Spiel ${g.gameNumber}${score}` }
      })
  }, [scopeKind, selectedOpponent, gameDays])

  // Update search params
  const setScope = (kind: ScopeKind) => {
    const next = new URLSearchParams(params)
    next.set('scope', kind)
    if (kind === 'season' && selectedSeasonId != null) next.set('seasonId', String(selectedSeasonId))
    if (kind === 'year') next.set('year', String(selectedYear))
    if (kind === 'gameDay' && selectedGameDayId != null) next.set('gameDayId', String(selectedGameDayId))
    if (kind === 'opponent') {
      next.delete('opponentGame')
      if (selectedOpponent != null) next.set('opponent', selectedOpponent)
    }
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
  const setGameDayId = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('gameDayId', String(id))
    setParams(next, { replace: true })
  }
  const setOpponentId = (name: string) => {
    const next = new URLSearchParams(params)
    next.set('opponent', name)
    next.delete('opponentGame') // Spiel-Auswahl gehört zum Gegner — beim Wechsel zurücksetzen
    setParams(next, { replace: true })
  }
  const setOpponentGameId = (gameId: number | null) => {
    const next = new URLSearchParams(params)
    if (gameId == null) next.delete('opponentGame')
    else next.set('opponentGame', String(gameId))
    setParams(next, { replace: true })
  }

  // Load stats when scope changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const battingP = (): Promise<PlayerBattingStatsResponse[]> => {
      if (scopeKind === 'game' && selectedGameId != null) return api.getGameBattingStats(selectedGameId)
      if (scopeKind === 'gameDay' && selectedGameDayId != null) return api.getGameDayBattingStats(selectedGameDayId)
      if (scopeKind === 'season' && selectedSeasonId != null) return api.getSeasonBattingStats(selectedSeasonId)
      if (scopeKind === 'year') return api.getYearBattingStats(selectedYear)
      if (scopeKind === 'allTime') return api.getAllTimeBattingStats()
      if (scopeKind === 'opponent' && selectedOpponentGameId != null) return api.getGameBattingStats(selectedOpponentGameId)
      if (scopeKind === 'opponent' && selectedOpponent != null) return api.getOpponentBattingStats(selectedOpponent)
      return Promise.resolve([])
    }
    const gamesP = (): Promise<SeasonPlayerStats[]> => {
      if (scopeKind !== 'season' && scopeKind !== 'year' && scopeKind !== 'allTime') return Promise.resolve([])
      if (scopeKind === 'season' && selectedSeasonId != null) return api.getSeasonStats(selectedSeasonId)
      if (scopeKind === 'year') return api.getYearStats(selectedYear)
      if (scopeKind === 'allTime') return api.getAllTimeStats()
      return Promise.resolve([])
    }
    // Auszeichnungen (gleiche Titel wie pro Spieltag, aber über den gewählten Scope)
    const awardsP = (): Promise<AwardResponse[]> => {
      if (scopeKind === 'gameDay' && selectedGameDayId != null) return api.getGameDayAwards(selectedGameDayId)
      if (scopeKind === 'season' && selectedSeasonId != null) return api.getSeasonAwards(selectedSeasonId)
      if (scopeKind === 'year') return api.getYearAwards(selectedYear)
      if (scopeKind === 'allTime') return api.getAllTimeAwards()
      return Promise.resolve([]) // 'game' = kein eigener Award-Scope
    }

    Promise.all([battingP(), gamesP(), awardsP().catch(() => [] as AwardResponse[])])
      .then(([batting, games, awards]) => {
        if (cancelled) return
        setBattingStats(batting)
        setGamesStats(games)
        setAwards(awards)
      })
      .catch(() => {
        if (cancelled) return
        setBattingStats([])
        setGamesStats([])
        setAwards([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [scopeKind, selectedSeasonId, selectedYear, selectedGameId, selectedGameDayId, selectedOpponent, selectedOpponentGameId])

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
    if (scopeKind === 'gameDay') {
      const gd = gameDays.find(x => x.id === selectedGameDayId)
      return gd ? `Spieltag · ${formatGameDayLabel(gd)}` : 'Kein Spieltag ausgewählt'
    }
    if (scopeKind === 'season') {
      const s = seasons.find(x => x.id === selectedSeasonId)
      return s ? `${s.name} · ${s.year}` : 'Keine Saison ausgewählt'
    }
    if (scopeKind === 'opponent') {
      const o = opponents.find(x => x.teamName === selectedOpponent)
      if (!o && selectedOpponentGameId == null) return 'Kein Gegner ausgewählt'
      if (selectedOpponentGameId != null) {
        const g = gamesVsOpponent.find(x => x.gameId === selectedOpponentGameId)
        return g ? `Gegen ${selectedOpponent} · ${g.label}` : `Gegen ${selectedOpponent} · Einzelspiel`
      }
      if (!o) return selectedOpponent
      const avg = o.battingAverage.toFixed(3).replace(/^0\./, '.')
      return `Gegen ${o.teamName} · ${o.games} ${o.games === 1 ? 'Spiel' : 'Spiele'} · Team-AVG ${avg}`
    }
    if (scopeKind === 'year') {
      if (seasonsForYear.length === 0) return `Jahr ${selectedYear}`
      const names = seasonsForYear.map(s => s.name).join(', ')
      return `Jahr ${selectedYear} · ${seasonsForYear.length} ${seasonsForYear.length === 1 ? 'Saison' : 'Saisons'}: ${names}`
    }
    return `Alle Jahre · ${seasons.length} ${seasons.length === 1 ? 'Saison' : 'Saisons'}`
  }, [scopeKind, seasons, seasonsForYear, selectedSeasonId, selectedYear, selectedGameId, selectedGame, gameDays, selectedGameDayId, opponents, selectedOpponent, selectedOpponentGameId, gamesVsOpponent])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-wide uppercase">Statistik</h1>
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
                // Aggregierte Scopes: nur qualifizierte (≥5 ABs) exportieren — wie in der Tabelle
                stats: isAggregatedScope(scopeKind) ? battingStats.filter(s => s.qualified) : battingStats,
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

        <AnalysisModeTabs />

        {/* Compact Filter-Row: Scope-Pills + Selector inline */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {scopeKind === 'game' && (
            <ScopeChip active={true} onClick={() => { /* noop */ }}>Dieses Spiel</ScopeChip>
          )}
          <ScopeChip active={scopeKind === 'gameDay'} onClick={() => setScope('gameDay')}>Spieltag</ScopeChip>
          <ScopeChip active={scopeKind === 'season'} onClick={() => setScope('season')}>Saison</ScopeChip>
          <ScopeChip active={scopeKind === 'year'} onClick={() => setScope('year')}>Jahr</ScopeChip>
          <ScopeChip active={scopeKind === 'opponent'} onClick={() => setScope('opponent')}>Nach Gegner</ScopeChip>
          <ScopeChip active={scopeKind === 'allTime'} onClick={() => setScope('allTime')}>Alle Zeit</ScopeChip>

          {/* Selector inline rechts daneben statt eigene Reihe */}
          {scopeKind === 'gameDay' && gameDays.length > 0 && (
            <div className="relative inline-flex items-center ml-auto sm:ml-0">
              <select
                value={selectedGameDayId ?? ''}
                onChange={e => setGameDayId(Number(e.target.value))}
                className="font-display appearance-none bg-cream-50 border border-cream-300 rounded-full pl-3 pr-8 py-1.5 text-xs font-bold tracking-wide text-navy-900 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none cursor-pointer hover:border-navy-400 max-w-[60vw] sm:max-w-none truncate"
              >
                {gameDays.map(gd => (
                  <option key={gd.id} value={gd.id}>{formatGameDayLabel(gd)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}
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
          {scopeKind === 'opponent' && opponents.length > 0 && (
            <div className="relative inline-flex items-center ml-auto sm:ml-0">
              <select
                value={selectedOpponent ?? ''}
                onChange={e => setOpponentId(e.target.value)}
                className="font-display appearance-none bg-cream-50 border border-cream-300 rounded-full pl-3 pr-8 py-1.5 text-xs font-bold tracking-wide text-navy-900 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none cursor-pointer hover:border-navy-400 max-w-[60vw] sm:max-w-none truncate"
              >
                {opponents.map(o => (
                  <option key={o.teamName} value={o.teamName}>
                    {o.teamName} · AVG {o.battingAverage.toFixed(3).replace(/^0\./, '.')} ({o.games} {o.games === 1 ? 'Spiel' : 'Spiele'})
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}
          {scopeKind === 'opponent' && gamesVsOpponent.length > 0 && (
            <div className="relative inline-flex items-center">
              <select
                value={selectedOpponentGameId ?? ''}
                onChange={e => setOpponentGameId(e.target.value === '' ? null : Number(e.target.value))}
                className="font-display appearance-none bg-cream-50 border border-cream-300 rounded-full pl-3 pr-8 py-1.5 text-xs font-bold tracking-wide text-navy-900 focus:border-navy-600 focus:ring-2 focus:ring-cream-200 outline-none cursor-pointer hover:border-navy-400 max-w-[60vw] sm:max-w-none truncate"
              >
                <option value="">Alle Spiele ({gamesVsOpponent.length})</option>
                {gamesVsOpponent.map(g => (
                  <option key={g.gameId} value={g.gameId}>{g.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Auszeichnungen (Scope-weit) — Highlights des Zeitraums, über den Detail-Tabs */}
      {!loading && awards.length > 0 && (
        <div className="mb-3">
          <AwardsCard awards={awards} subtitle={contextInfo} />
        </div>
      )}

      {/* Hinweis: Spieltag zeigt ALLE Schläge (kein Mindest-AB), Gesamt-Scopes filtern */}
      {!loading && view === 'batting' && scopeKind === 'gameDay' && battingStats.length > 0 && (
        <p className="text-[11px] text-gray-500 px-1 -mt-2">
          Spieltags-Ansicht: alle Schläge ungefiltert. In den Gesamt-Statistiken (Saison/Jahr/Alle Zeit)
          werden Quoten erst ab 5 At-Bats gewertet.
        </p>
      )}

      {/* Content */}
      {loading ? (
        <StatsTableSkeleton />
      ) : view === 'batting' ? (
        <BattingStatsTable
          stats={battingStats}
          onOpenGlossary={() => setShowGlossary(true)}
          applyQualifier={isAggregatedScope(scopeKind) && scopeKind !== 'opponent'}
          gamesByPlayerId={gamesByPlayerId}
          showPerGame={isAggregatedScope(scopeKind) && scopeKind !== 'opponent'}
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
