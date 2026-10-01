import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Player, GameDayPlayerStats, TrainingStatsResponse, TrainingPeriodResponse, PlayerBattingStatsResponse } from '@/types'
import { PlusCircle } from '@/icons'
import * as api from '@/api/client'
import type { OpponentBattingState } from '@/hooks/useOpponentBattingStats'
import { WeekdayFilter } from '@/components/shared/WeekdayFilter'

interface Props {
  allAvailablePlayers: Player[]
  lineupPlayerIds: Set<number>
  stats: GameDayPlayerStats[]
  battingStatsSeason?: PlayerBattingStatsResponse[]
  battingStatsYear?: PlayerBattingStatsResponse[]
  seasonYear?: number | null
  gameDayDate: string
  /** Gegner des aktiven Spiels — aktiviert den Gegner-Scope (AVG/OBP/OPS vs. dieses Team). */
  opponentTeamName?: string | null
  /** Gegner-Splits — zentral über useOpponentBattingStats geladen (ein Request statt zwei, siehe Hook).
   *  Required: Ohne Status (loading/failed) könnte die Empty-Zeile fälschlich laden, ohne je geladen zu haben. */
  opponentBatting: OpponentBattingState
  onAdd: (player: Player) => void
}

function formatAvg(avg: number | null | undefined): string | null {
  if (avg == null) return null
  const n = Number(avg)
  if (Number.isNaN(n)) return null
  return n.toFixed(3).replace(/^0\./, '.')
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
  // 4 Stufen: 0 = noch nicht gespielt (Alarm-Rot), 0.5–1 = wenige Einsätze (Amber-Warn),
  // 2 = Ziel erreicht (Emerald-grün), 3+ = mehr als genug (Navy, on-brand).
  if (gc === 0) return 'bg-softball-red-100 text-softball-red-600'
  if (gc <= 1) return 'bg-amber-100 text-amber-700'
  if (gc < 3) return 'bg-emerald-100 text-emerald-700'
  return 'bg-navy-100 text-navy-700'
}

type TrainingFilter = '3months' | 'all'

/** Ein Scope-Chip im AVG-Toggle — aktive Variante per Klasse (Gegner rot, Saison/Jahr navy). */
function ScopeChip({ label, active, activeClass, title, onClick }: {
  label: string
  active: boolean
  activeClass: string
  title?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer active:scale-95 ${
        active ? activeClass : 'bg-cream-200 text-gray-500 hover:bg-cream-300'
      }`}
    >
      {label}
    </button>
  )
}

function sinceDate(filter: TrainingFilter, refDate: string): string | undefined {
  if (filter === 'all') return undefined
  const d = new Date(refDate + 'T00:00:00')
  d.setDate(d.getDate() - 90) // 3 Monate
  return d.toISOString().slice(0, 10)
}

export function PlayerPool({
  allAvailablePlayers, lineupPlayerIds, stats,
  battingStatsSeason = [], battingStatsYear = [], seasonYear,
  gameDayDate, opponentTeamName, opponentBatting, onAdd,
}: Props) {
  const [storedScope, setStoredScope] = useState<'season' | 'year'>(() => {
    if (typeof window === 'undefined') return 'year'
    const stored = localStorage.getItem('player-pool-batting-scope')
    return stored === 'season' || stored === 'year' ? stored : 'year'
  })
  const [battingScope, setBattingScope] = useState<'season' | 'year' | 'opponent'>(opponentTeamName ? 'opponent' : storedScope)

  /** Saison/Jahr per Chip gewählt → Präferenz persistieren (Event-getrieben, kein Effect).
   *  'opponent' wird bewusst nicht persistiert — es ist pro Spiel kontextuell. */
  const chooseScope = (next: 'season' | 'year') => {
    setBattingScope(next)
    setStoredScope(next)
    if (typeof window !== 'undefined') localStorage.setItem('player-pool-batting-scope', next)
  }

  // Gegner gewechselt → automatisch auf Gegner-Scope springen (die Frage ist ja "wie liefen wir gegen DIE?");
  // Gegner entfernt → zurück auf die gespeicherte Präferenz. Anpassung während des Renders
  // (React-Dokumentiertes Muster für "State bei Prop-Änderung korrigieren", kein Effect nötig).
  const [prevOpponent, setPrevOpponent] = useState(opponentTeamName)
  if (opponentTeamName !== prevOpponent) {
    setPrevOpponent(opponentTeamName)
    setBattingScope(opponentTeamName ? 'opponent' : storedScope)
  }

  const battingStats = useMemo(() => {
    if (battingScope === 'year') return battingStatsYear
    if (battingScope === 'season') return battingStatsSeason
    return opponentBatting.stats
  }, [battingScope, battingStatsYear, battingStatsSeason, opponentBatting])
  const opponentScopeActive = battingScope === 'opponent' && !!opponentTeamName
  const battingMap = useMemo(() =>
    new Map(battingStats.map(b => [b.playerId, b])),
    [battingStats]
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('pool') as 'pool' | 'overview' | 'training' | null
  const tab: 'pool' | 'overview' | 'training' = rawTab === 'overview' || rawTab === 'training' ? rawTab : 'pool'
  const setTab = (next: 'pool' | 'overview' | 'training') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'pool') params.delete('pool')
    else params.set('pool', next)
    setSearchParams(params, { replace: true })
  }
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>('3months')
  const [trainingStats, setTrainingStats] = useState<TrainingStatsResponse[]>([])
  const [loadedFilter, setLoadedFilter] = useState<string | null>(null)
  const [trainingPeriods, setTrainingPeriods] = useState<TrainingPeriodResponse[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)
  /** Ausgeschlossene Wochentage (ISO 1 = Mo … 7 = So) — Montag ist P/C-Training. */
  const [excludedWeekdays, setExcludedWeekdays] = useState<number[]>([])
  const toggleWeekday = useCallback((weekday: number) => {
    setExcludedWeekdays(prev =>
      prev.includes(weekday) ? prev.filter(d => d !== weekday) : [...prev, weekday])
  }, [])
  const statsMap = new Map(stats.map(s => [s.playerId, s]))

  // Load training periods once
  useEffect(() => {
    api.getTrainingPeriods().then(setTrainingPeriods)
  }, [])

  const loadTrainingStats = useCallback((filter: TrainingFilter, periodId: number | null, excluded: number[]) => {
    const exKey = [...excluded].sort((a, b) => a - b).join(',')
    const cacheKey = periodId ? `period-${periodId}-${exKey}` : `${filter}-${gameDayDate}-${exKey}`
    if (loadedFilter === cacheKey) return // already loaded
    if (periodId) {
      api.getTrainingStats(periodId, undefined, undefined, excluded).then(data => {
        setTrainingStats(data)
        setLoadedFilter(cacheKey)
      })
    } else {
      api.getTrainingStats(undefined, sinceDate(filter, gameDayDate), gameDayDate, excluded).then(data => {
        setTrainingStats(data)
        setLoadedFilter(cacheKey)
      })
    }
  }, [gameDayDate, loadedFilter])

  useEffect(() => {
    if (tab === 'training') loadTrainingStats(trainingFilter, selectedPeriodId, excludedWeekdays)
  }, [tab, trainingFilter, selectedPeriodId, excludedWeekdays, loadTrainingStats])

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
      <div className="flex items-center gap-3 mb-2 pb-1.5 border-b border-cream-200">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        <nav className="flex items-center gap-4 flex-1 min-w-0">
          {([
            ['pool', 'Spieler', freePlayers.length, false],
            ['overview', 'Übersicht', allAvailablePlayers.length, false],
            ['training', 'Training', availableTrainingStats.length, true],
          ] as const).map(([key, label, count, mobileOnly]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`font-display text-[12px] sm:text-[13px] font-extrabold uppercase tracking-widest cursor-pointer transition-colors ${
                tab === key
                  ? 'text-navy-900'
                  : 'text-gray-400 hover:text-gray-600'
              } ${mobileOnly ? 'lg:hidden' : ''}`}
            >
              {label}
              {tab === key && (
                <span className="ml-1 font-display text-[11px] font-bold text-gray-400">
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'pool' ? (
        <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm overflow-hidden">
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
                className={`pool-chip w-full flex items-center gap-2 px-3 py-2 text-left border-b border-cream-200 last:border-0 ${
                  noGames
                    ? 'bg-softball-red-50 hover:bg-navy-100'
                    : 'hover:bg-navy-50'
                } cursor-pointer`}
              >
                {player.defaultBattingOrder != null && (
                  <span className="text-[11px] font-display tabular-nums font-bold text-gray-400 shrink-0 lg:hidden">
                    #{player.defaultBattingOrder}
                  </span>
                )}
                <span className={`flex-1 text-sm font-medium truncate ${
                  noGames ? 'text-softball-red-700' : 'text-gray-900'
                }`}>
                  {player.name}
                </span>

                {posStr && (
                  <span className="text-[11px] font-display tabular-nums text-gray-400 shrink-0">
                    {posStr}
                  </span>
                )}

                <span className={`text-xs font-display tabular-nums font-bold w-7 text-center shrink-0 rounded-full py-0.5 ${gameCountBadge(gc)}`}>
                  {gc}
                </span>

                <PlusCircle size={14} className={noGames ? 'text-softball-red-400' : 'text-gray-300'} />
              </button>
            )
          })}

          {/* Lineup players — subtle, separated */}
          {lineupPlayers.length > 0 && freePlayers.length > 0 && (
            <div className="border-t border-cream-300 bg-cream-100 px-3 py-1.5">
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
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left border-b border-cream-200 last:border-0 bg-cream-100/50 cursor-not-allowed"
              >
                {player.defaultBattingOrder != null && (
                  <span className="text-[11px] font-display tabular-nums font-bold text-gray-300 shrink-0 lg:hidden">
                    #{player.defaultBattingOrder}
                  </span>
                )}
                <span className="flex-1 text-sm text-gray-400 truncate">
                  {player.name}
                </span>

                {posStr && (
                  <span className="text-[11px] font-display tabular-nums text-gray-300 shrink-0">
                    {posStr}
                  </span>
                )}

                <span className="text-xs font-display tabular-nums w-7 text-center text-gray-400 shrink-0">
                  {gc}
                </span>
              </div>
            )
          })}
        </div>
      ) : tab === 'overview' ? (
        (() => {
          // Top-AVG ermitteln für Highlight (handles Ties)
          const availableIds = new Set(allAvailablePlayers.map(p => p.id))
          const avgValues = battingStats
            .filter(b => availableIds.has(b.playerId) && b.atBats > 0)
            .map(b => Number(b.battingAverage))
          const topAvg = avgValues.length > 0 ? Math.max(...avgValues) : null
          return (
        <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden">
          {/* Scope-Toggle: vs Gegner (falls gesetzt) · Saison · Jahr */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-cream-50 border-b border-cream-200 text-[10px]">
            {opponentTeamName && (
              <ScopeChip
                label={`vs ${opponentTeamName.length > 14 ? opponentTeamName.slice(0, 13) + '…' : opponentTeamName}`}
                active={battingScope === 'opponent'}
                activeClass="bg-softball-red-600 text-white"
                title={`Schlag-Statistik gegen ${opponentTeamName} (alle Ligen, alle Spiele)`}
                onClick={() => setBattingScope('opponent')}
              />
            )}
            <ScopeChip
              label="Saison"
              active={battingScope === 'season'}
              activeClass="bg-navy-800 text-white"
              onClick={() => chooseScope('season')}
            />
            <ScopeChip
              label={`Jahr ${seasonYear ?? ''}`}
              active={battingScope === 'year'}
              activeClass="bg-navy-800 text-white"
              onClick={() => chooseScope('year')}
            />
            {battingScope === 'opponent' && opponentTeamName && (
              <Link
                to={`/teams?club=${encodeURIComponent(opponentTeamName)}`}
                className="ml-auto text-navy-700 hover:text-softball-red-600 hover:underline cursor-pointer whitespace-nowrap"
                title={`Bilanz und Spiel-Historie gegen ${opponentTeamName}`}
              >
                Historie →
              </Link>
            )}
          </div>
          {/* Spalten-Header — navy-900 für 30%-Palette */}
          <div className="grid grid-cols-[minmax(0,1fr)_2.9rem_2.9rem_3.2rem] gap-2 px-3 py-2 bg-navy-900 text-white text-[10px] font-bold uppercase tracking-wider">
            <span className="truncate">Spieler</span>
            <span className="text-left" title="Batting Average — Treffer ÷ At-Bats">AVG</span>
            <span className="text-left" title="On-Base Percentage — wie oft die Base erreicht wird">OBP</span>
            <span className="text-left" title="On-Base + Slugging — Gesamtstärke">OPS</span>
          </div>
          {opponentScopeActive && opponentBatting.loading && (
            <p className="px-3 py-2 text-xs text-gray-400 italic bg-cream-50 border-b border-cream-200">
              Stats gegen {opponentTeamName} werden geladen…
            </p>
          )}
          {opponentScopeActive && !opponentBatting.loading && opponentBatting.failed && (
            <p className="px-3 py-2 text-xs text-softball-red-700 bg-softball-red-50 border-b border-softball-red-100">
              Stats gegen {opponentTeamName} konnten nicht geladen werden.
            </p>
          )}
          {opponentScopeActive && !opponentBatting.loading && !opponentBatting.failed
            && opponentBatting.stats.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 italic bg-cream-50 border-b border-cream-200">
              Noch keine Schlag-Daten gegen {opponentTeamName} — beim ersten gemeinsamen Spiel entstehen sie automatisch.
            </p>
          )}
          {allSorted.map(player => {
            const bs = battingMap.get(player.id)
            const hasAbs = bs && bs.atBats > 0
            const avgNum = hasAbs ? Number(bs.battingAverage) : null
            const avgStr = avgNum != null ? formatAvg(avgNum) : null
            const obpStr = hasAbs ? formatAvg(Number(bs.onBasePct)) : null
            const opsStr = hasAbs ? formatAvg(Number(bs.ops)) : null
            const isTop = avgNum != null && topAvg != null && avgNum === topAvg
            const scopeTitle = battingScope === 'opponent' && opponentTeamName
              ? ` gegen ${opponentTeamName}`
              : battingScope === 'year' ? ' dieses Jahres' : ' dieser Saison'

            return (
              <div
                key={player.id}
                className="grid grid-cols-[minmax(0,1fr)_2.9rem_2.9rem_3.2rem] gap-2 items-center px-3 py-2 border-b border-cream-200 last:border-0 hover:bg-cream-100 cursor-default select-none"
              >
                <span className="text-sm text-gray-800 truncate">
                  {player.name}
                </span>

                <span className={`text-left text-sm font-display tabular-nums font-bold ${
                  isTop ? 'text-softball-red-600' : avgStr ? 'text-navy-900' : 'text-gray-300'
                }`}
                      title={avgStr ? `${bs?.hits}/${bs?.atBats} Treffer${isTop ? ' · Top-AVG' : ''}${scopeTitle}` : `Noch keine At-Bats${scopeTitle}`}>
                  {avgStr ?? '—'}
                </span>
                <span className={`text-left text-sm font-display tabular-nums ${obpStr ? 'text-gray-600' : 'text-gray-300'}`}
                      title={`On-Base Percentage${scopeTitle}`}>
                  {obpStr ?? '—'}
                </span>
                <span className={`text-left text-sm font-display tabular-nums ${opsStr ? 'text-gray-600' : 'text-gray-300'}`}
                      title={`OBP + Slugging${scopeTitle}`}>
                  {opsStr ?? '—'}
                </span>
              </div>
            )
          })}
          {/* Link zu ausführlicher Stats-Seite */}
          <div className="px-3 py-1.5 bg-cream-50 border-t border-cream-300 text-right">
            <a
              href="/stats?scope=season"
              className="text-[11px] text-navy-700 hover:text-softball-red-600 hover:underline cursor-pointer"
              title="Jahr- und Karriere-Vergleiche"
            >
              Alle Statistiken (Jahr, Karriere…) →
            </a>
          </div>
        </div>
          )
        })()
      ) : (
        <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden p-3 space-y-1.5">
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            <select
              value={selectedPeriodId ?? ''}
              onChange={e => {
                setSelectedPeriodId(e.target.value ? Number(e.target.value) : null)
                setLoadedFilter(null)
              }}
              className="text-[11px] font-medium text-gray-600 bg-transparent border border-cream-300 rounded px-1.5 py-0.5 cursor-pointer hover:border-navy-500 transition-colors focus:outline-none focus:border-navy-600"
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
                    : 'bg-cream-200 text-gray-500 hover:bg-cream-300'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="w-px h-4 bg-cream-300 mx-0.5" aria-hidden="true" />
            <WeekdayFilter
              weekdays={[1]}
              excluded={excludedWeekdays}
              onToggle={toggleWeekday}
            />
            <span className="text-[10px] text-gray-400">
              {excludedWeekdays.includes(1) ? 'nur Basic' : 'inkl. P/C'}
            </span>
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
                  <div className="flex-1 h-4 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-navy-800"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-display tabular-nums text-gray-500 tabular-nums w-6 text-right shrink-0">
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
