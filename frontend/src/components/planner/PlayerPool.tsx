import { useState, useMemo } from 'react'
import type { Player, GameDayPlayerStats, TrainingStatsResponse } from '@/types'
import { PlusCircle } from '@/icons'

interface Props {
  allAvailablePlayers: Player[]
  lineupPlayerIds: Set<number>
  stats: GameDayPlayerStats[]
  trainingStats?: TrainingStatsResponse[]
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

export function PlayerPool({ allAvailablePlayers, lineupPlayerIds, stats, trainingStats, onAdd }: Props) {
  const [tab, setTab] = useState<'pool' | 'overview' | 'training'>('pool')
  const statsMap = new Map(stats.map(s => [s.playerId, s]))

  // Filter training stats to available players only, sorted by attendance desc
  const availableTrainingStats = useMemo(() => {
    if (!trainingStats?.length) return []
    const availableIds = new Set(allAvailablePlayers.map(p => p.id))
    return trainingStats
      .filter(s => availableIds.has(s.playerId))
      .sort((a, b) => b.attended - a.attended)
  }, [trainingStats, allAvailablePlayers])

  const sortByGames = (a: Player, b: Player) => {
    const ga = statsMap.get(a.id)?.gameCount ?? 0
    const gb = statsMap.get(b.id)?.gameCount ?? 0
    return ga - gb
  }

  const freePlayers = allAvailablePlayers.filter(p => !lineupPlayerIds.has(p.id)).sort(sortByGames)
  const lineupPlayers = allAvailablePlayers.filter(p => lineupPlayerIds.has(p.id)).sort(sortByGames)

  const allSorted = [...allAvailablePlayers].sort((a, b) => {
    const ga = statsMap.get(a.id)?.gameCount ?? 0
    const gb = statsMap.get(b.id)?.gameCount ?? 0
    return ga - gb
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="w-1 h-4 bg-softball-red-500 rounded-full" />
          <button
            onClick={() => setTab('pool')}
            className={`text-sm font-semibold uppercase tracking-wide px-2 py-0.5 rounded cursor-pointer transition-colors ${
              tab === 'pool'
                ? 'text-navy-700 bg-navy-50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Pool
          </button>
          <button
            onClick={() => setTab('overview')}
            className={`text-sm font-semibold uppercase tracking-wide px-2 py-0.5 rounded cursor-pointer transition-colors ${
              tab === 'overview'
                ? 'text-navy-700 bg-navy-50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Übersicht
          </button>
          {trainingStats && trainingStats.length > 0 && (
            <button
              onClick={() => setTab('training')}
              className={`text-sm font-semibold uppercase tracking-wide px-2 py-0.5 rounded cursor-pointer transition-colors ${
                tab === 'training'
                  ? 'text-navy-700 bg-navy-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Training
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500 font-mono">
          {tab === 'pool' ? freePlayers.length : tab === 'training' ? availableTrainingStats.length : allAvailablePlayers.length}
        </span>
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
          {availableTrainingStats.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Keine Trainingsdaten vorhanden.</p>
          ) : (
            availableTrainingStats.map(s => {
              const pct = s.totalTrainings > 0 ? Math.round((s.attended / s.totalTrainings) * 100) : 0
              const maxAttended = Math.max(...availableTrainingStats.map(st => st.attended), 1)
              const barWidth = Math.round((s.attended / maxAttended) * 100)
              return (
                <div key={s.playerId} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 w-20 truncate">
                    {s.playerName}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.regular ? 'bg-navy-800' : 'bg-gray-400'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 tabular-nums w-14 text-right shrink-0">
                    {s.attended}/{s.totalTrainings} ({pct}%)
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
