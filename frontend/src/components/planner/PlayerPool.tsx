import { useState, useMemo, useEffect, useCallback } from 'react'
import type { Player, GameDayPlayerStats, TrainingStatsResponse, TrainingPeriodResponse } from '@/types'
import { PlusCircle } from '@/icons'
import * as api from '@/api/client'

interface Props {
  allAvailablePlayers: Player[]
  lineupPlayerIds: Set<number>
  stats: GameDayPlayerStats[]
  gameDayDate: string
  onAdd: (player: Player) => void
}

function formatPositions(positions: string[]): string {
  if (positions.length === 0) return ''
  const counts = new Map<string, number>()
  for (const p of positions) counts.set(p, (counts.get(p) ?? 0) + 1)
  return [...counts.entries()]
    .map(([pos, n]) => n > 1 ? `${pos} ${n}x` : pos)
    .join(', ')
}

function gameCountBadge(gc: number): string {
  if (gc === 0) return 'bg-softball-red-100 text-softball-red-600'
  if (gc <= 1) return 'bg-amber-100 text-amber-700'
  if (gc <= 2) return 'bg-blue-100 text-blue-700'
  return 'bg-emerald-100 text-emerald-700'
}

type TrainingFilter = '3months' | 'all'

function sinceDate(filter: TrainingFilter, refDate: string): string | undefined {
  if (filter === 'all') return undefined
  const d = new Date(refDate + 'T00:00:00')
  d.setDate(d.getDate() - 90) // 3 Monate
  return d.toISOString().slice(0, 10)
}

export function PlayerPool({ allAvailablePlayers, lineupPlayerIds, stats, gameDayDate, onAdd }: Props) {
  const [tab, setTab] = useState<'pool' | 'overview' | 'training'>('pool')
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>('3months')
  const [trainingStats, setTrainingStats] = useState<TrainingStatsResponse[]>([])
  const [loadedFilter, setLoadedFilter] = useState<string | null>(null)
  const [trainingPeriods, setTrainingPeriods] = useState<TrainingPeriodResponse[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)
  const statsMap = new Map(stats.map(s => [s.playerId, s]))

  // Load training periods once
  useEffect(() => {
    api.getTrainingPeriods().then(setTrainingPeriods)
  }, [])

  const loadTrainingStats = useCallback((filter: TrainingFilter, periodId: number | null) => {
    const cacheKey = periodId ? `period-${periodId}` : `${filter}-${gameDayDate}`
    if (loadedFilter === cacheKey) return // already loaded
    if (periodId) {
      api.getTrainingStats(periodId).then(data => {
        setTrainingStats(data)
        setLoadedFilter(cacheKey)
      })
    } else {
      api.getTrainingStats(undefined, sinceDate(filter, gameDayDate), gameDayDate).then(data => {
        setTrainingStats(data)
        setLoadedFilter(cacheKey)
      })
    }
  }, [gameDayDate, loadedFilter])

  useEffect(() => {
    if (tab === 'training') loadTrainingStats(trainingFilter, selectedPeriodId)
  }, [tab, trainingFilter, selectedPeriodId, loadTrainingStats])

  // Filter training stats to available players only, sorted by attendance desc
  const availableTrainingStats = useMemo(() => {
    if (!trainingStats?.length) return []
    const availableIds = new Set(allAvailablePlayers.map(p => p.id))
    return trainingStats
      .filter(s => availableIds.has(s.playerId))
      .sort((a, b) => b.attended - a.attended)
  }, [trainingStats, allAvailablePlayers])

  const sortByOrder = (a: Player, b: Player) => {
    const aOrder = a.defaultBattingOrder
    const bOrder = b.defaultBattingOrder
    if (aOrder != null && bOrder != null) return aOrder - bOrder
    if (aOrder != null) return -1
    if (bOrder != null) return 1
    const ga = statsMap.get(a.id)?.gameCount ?? 0
    const gb = statsMap.get(b.id)?.gameCount ?? 0
    return ga - gb
  }

  const freePlayers = allAvailablePlayers.filter(p => !lineupPlayerIds.has(p.id)).sort(sortByOrder)
  const lineupPlayers = allAvailablePlayers.filter(p => lineupPlayerIds.has(p.id)).sort(sortByOrder)

  const allSorted = [...allAvailablePlayers].sort((a, b) => {
    const ga = statsMap.get(a.id)?.gameCount ?? 0
    const gb = statsMap.get(b.id)?.gameCount ?? 0
    return ga - gb
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-1 h-6 bg-softball-red-600 rounded-full shrink-0" />
        <nav className="flex items-center gap-4 flex-1 min-w-0">
          {([
            ['pool', 'Spieler', freePlayers.length, false],
            ['overview', 'Übersicht', allAvailablePlayers.length, false],
            ['training', 'Training', availableTrainingStats.length, true],
          ] as const).map(([key, label, count, mobileOnly]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-sm font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                tab === key
                  ? 'text-gray-950'
                  : 'text-gray-300 hover:text-gray-500'
              } ${mobileOnly ? 'lg:hidden' : ''}`}
            >
              {label}
              {tab === key && (
                <span className="ml-1 text-xs font-mono text-gray-400">
                  ({count})
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'pool' ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Free players — prominent, clickable */}
          {freePlayers.map(player => {
            const st = statsMap.get(player.id)
            const gc = st?.gameCount ?? 0
            const posStr = formatPositions(st?.positions?.map(p => p.position) ?? [])
            const noGames = gc === 0

            return (
              <button
                key={player.id}
                onClick={() => onAdd(player)}
                className={`pool-chip w-full flex items-center gap-2 px-3 py-2 text-left border-b border-gray-100 last:border-0 ${
                  noGames
                    ? 'bg-softball-red-50 hover:bg-navy-100'
                    : 'hover:bg-navy-50'
                } cursor-pointer`}
              >
                {player.defaultBattingOrder != null && (
                  <span className="text-[11px] font-mono font-semibold text-gray-400 shrink-0 lg:hidden">
                    #{player.defaultBattingOrder}
                  </span>
                )}
                <span className={`flex-1 text-sm font-medium truncate ${
                  noGames ? 'text-softball-red-700' : 'text-gray-900'
                }`}>
                  {player.name}
                </span>

                {posStr && (
                  <span className="text-[11px] font-mono text-gray-400 shrink-0">
                    {posStr}
                  </span>
                )}

                <span className={`text-xs font-mono font-semibold w-7 text-center shrink-0 rounded-full py-0.5 ${gameCountBadge(gc)}`}>
                  {gc}
                </span>

                <PlusCircle size={14} className={noGames ? 'text-softball-red-400' : 'text-gray-300'} />
              </button>
            )
          })}

          {/* Lineup players — subtle, separated */}
          {lineupPlayers.length > 0 && freePlayers.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Im Lineup</span>
            </div>
          )}
          {lineupPlayers.map(player => {
            const st = statsMap.get(player.id)
            const gc = st?.gameCount ?? 0
            const posStr = formatPositions(st?.positions?.map(p => p.position) ?? [])

            return (
              <div
                key={player.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left border-b border-gray-50 last:border-0 bg-gray-50/50 cursor-not-allowed"
              >
                {player.defaultBattingOrder != null && (
                  <span className="text-[11px] font-mono font-semibold text-gray-300 shrink-0 lg:hidden">
                    #{player.defaultBattingOrder}
                  </span>
                )}
                <span className="flex-1 text-sm text-gray-400 truncate">
                  {player.name}
                </span>

                {posStr && (
                  <span className="text-[11px] font-mono text-gray-300 shrink-0">
                    {posStr}
                  </span>
                )}

                <span className="text-xs font-mono w-7 text-center text-gray-400 shrink-0">
                  {gc}
                </span>
              </div>
            )
          })}
        </div>
      ) : tab === 'overview' ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
          {allSorted.map(player => {
            const st = statsMap.get(player.id)
            const gc = st?.gameCount ?? 0
            const posStr = formatPositions(st?.positions?.map(p => p.position) ?? [])

            return (
              <div
                key={player.id}
                className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 cursor-default select-none"
              >
                <span className="flex-1 text-sm text-gray-400 truncate">
                  {player.name}
                </span>

                {posStr && (
                  <span className="text-[11px] font-mono text-gray-300 shrink-0">
                    {posStr}
                  </span>
                )}

                <span className={`text-xs font-mono font-semibold w-7 text-center shrink-0 rounded-full py-0.5 ${gameCountBadge(gc)}`}>
                  {gc}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-3 space-y-1.5">
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            <select
              value={selectedPeriodId ?? ''}
              onChange={e => {
                setSelectedPeriodId(e.target.value ? Number(e.target.value) : null)
                setLoadedFilter(null)
              }}
              className="text-[11px] font-medium text-gray-600 bg-transparent border border-gray-200 rounded px-1.5 py-0.5 cursor-pointer hover:border-gray-400 transition-colors focus:outline-none focus:border-navy-600"
            >
              <option value="">Zeitraum</option>
              {trainingPeriods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {!selectedPeriodId && ([['3months', '3 Monate'], ['all', 'Gesamt']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTrainingFilter(key)}
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                  trainingFilter === key
                    ? 'bg-navy-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {availableTrainingStats.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-40">
                <path d="M4 4l16 16M20 4L4 20" strokeLinecap="round" />
                <circle cx="8" cy="8" r="2" /><circle cx="16" cy="16" r="2" />
              </svg>
              <p className="text-sm">Keine Trainingsdaten vorhanden.</p>
            </div>
          ) : (
            (() => {
              const maxAttended = Math.max(...availableTrainingStats.map(st => st.attended), 1)
              return availableTrainingStats.map(s => {
              const barWidth = Math.round((s.attended / maxAttended) * 100)
              return (
                <div key={s.playerId} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 w-20 truncate">
                    {s.playerName}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy-800"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 tabular-nums w-6 text-right shrink-0">
                    {s.attended}
                  </span>
                </div>
              )
            })
            })()
          )}
        </div>
      )}
    </div>
  )
}
