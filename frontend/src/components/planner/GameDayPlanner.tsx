import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useParams, useSearchParams, useBlocker, useNavigate } from 'react-router-dom'
import { useGameDay } from '@/hooks/useGameDay'
import { useLineup } from '@/hooks/useLineup'
import { useStaff } from '@/hooks/useStaff'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { GameTabs } from './GameTabs'
import { LineupEditor } from './LineupEditor'
import { PlayerPool } from './PlayerPool'
import { FieldView } from './FieldView'
import { FieldPositionAssignSheet } from './FieldPositionAssignSheet'
import { CoachSlots } from './CoachSlots'
import { BenchDisplay } from './BenchDisplay'
import { SaveButton } from './SaveButton'
import { AvailablePlayersModal } from './AvailablePlayersModal'
import { CopyLineupModal } from './CopyLineupModal'
import { SubstitutionEditor } from './SubstitutionEditor'
import { EditGameDayModal } from '@/components/dashboard/EditGameDayModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ExportDoc, CrossBones, Pencil, TrashBin, DiceIcon, ClipboardIcon, UsersIcon, BallIcon } from '@/icons'
import { MapPin } from 'lucide-react'
import type { Player, GameDayResponse, Season, TrainingStatsResponse, TrainingPeriodResponse } from '@/types'
import { generatePdf, generateScoringPdf } from '@/utils/pdfExport'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import * as api from '@/api/client'

export function GameDayPlanner() {
  const { id } = useParams<{ id: string }>()
  const gameDayId = Number(id)
  const { gameDay, setGameDay, stats, loading, refreshStats, setAvailablePlayers, reload } = useGameDay(gameDayId)
  const lineup = useLineup()
  const staff = useStaff()
  const { players } = usePlayers()
  const toast = useToastContext()
  const [searchParams] = useSearchParams()
  const initialTab = Math.max(0, Number(searchParams.get('game') ?? 0))
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showPlayersModal, setShowPlayersModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const navigate = useNavigate()
  const [showCopyLineup, setShowCopyLineup] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showAutoAllConfirm, setShowAutoAllConfirm] = useState(false)
  const [showAutoSingleConfirm, setShowAutoSingleConfirm] = useState(false)
  const [autoAllLoading, setAutoAllLoading] = useState(false)
  const [autoSingleLoading, setAutoSingleLoading] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [seasonGameDays, setSeasonGameDays] = useState<GameDayResponse[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [trainingStats, setTrainingStats] = useState<TrainingStatsResponse[]>([])
  const [seasonBattingStats, setSeasonBattingStats] = useState<import('@/types').PlayerBattingStatsResponse[]>([])
  const [yearBattingStats, setYearBattingStats] = useState<import('@/types').PlayerBattingStatsResponse[]>([])
  const [, setTrainingPeriods] = useState<TrainingPeriodResponse[]>([])
  const [selectedPeriodId] = useState<number | null>(null)
  const [mobileView, setMobileView] = useState<'lineup' | 'field'>('lineup')
  const [assignPosition, setAssignPosition] = useState<string | null>(null)
  const activeGame = gameDay?.games[activeTab]

  // Block in-app navigation when there are unsaved changes
  const blocker = useBlocker(lineup.hasChanges)

  // Warn before leaving with unsaved changes (browser tab close / refresh)
  useEffect(() => {
    if (!lineup.hasChanges) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [lineup.hasChanges])

  useEffect(() => {
    if (activeGame) {
      lineup.load(activeGame.id)
      staff.load(activeGame.id)
    }
  }, [activeGame?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch season game days + season in one batch
  useEffect(() => {
    if (gameDay?.seasonId) {
      Promise.all([
        api.getGameDays(gameDay.seasonId),
        api.getSeason(gameDay.seasonId),
      ]).then(([gd, s]) => {
        setSeasonGameDays(gd)
        setSeason(s)
        // Batting-Stats: beide Varianten parallel laden, User kann zwischen
        // Saison und Jahr umschalten.
        api.getSeasonBattingStats(gameDay.seasonId)
          .then(setSeasonBattingStats)
          .catch(() => setSeasonBattingStats([]))
        if (s?.year) {
          api.getYearBattingStats(s.year)
            .then(setYearBattingStats)
            .catch(() => setYearBattingStats([]))
        }
      })
    }
  }, [gameDay?.seasonId])

  // Fetch training periods for dropdown
  useEffect(() => {
    api.getTrainingPeriods().then(setTrainingPeriods)
  }, [])

  // Fetch training stats — by period or last 12 weeks
  useEffect(() => {
    if (!gameDay?.date) return
    if (selectedPeriodId) {
      api.getTrainingStats(selectedPeriodId).then(setTrainingStats)
    } else {
      const d = new Date(gameDay.date + 'T00:00:00')
      d.setDate(d.getDate() - 84)
      api.getTrainingStats(undefined, d.toISOString().slice(0, 10), gameDay.date).then(setTrainingStats)
    }
  }, [gameDay?.date, selectedPeriodId])

  const selectGame = useCallback((i: number) => {
    setActiveTab(i)
    const game = gameDay?.games[i]
    if (game) {
      lineup.load(game.id)
      staff.load(game.id)
    }
  }, [gameDay, lineup, staff])

  const onSwipeStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onSwipeEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start || !gameDay || gameDay.games.length <= 1) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const nextIdx = dx < 0 ? activeTab + 1 : activeTab - 1
    if (nextIdx < 0 || nextIdx >= gameDay.games.length) return
    selectGame(nextIdx)
  }

  const handleSave = async () => {
    if (!activeGame) return
    try {
      await lineup.save(activeGame.id)
      await refreshStats()
      toast.show('Lineup gespeichert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleStaffSave = async (entries: { playerId: number; role: string }[]) => {
    if (!activeGame) return
    try {
      await staff.save(activeGame.id, entries)
      await refreshStats()
      toast.show('Coaches gespeichert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleAddPlayer = (player: Player) => {
    lineup.addPlayer(player)
    // Auto-remove from coach slot if player was a base coach
    if (staffPlayerIds.has(player.id)) {
      const remaining = staff.staff
        .filter(s => s.player.id !== player.id)
        .map(s => ({ playerId: s.player.id, role: s.role }))
      handleStaffSave(remaining)
    }
  }

  const handlePositionAssign = (player: Player, position: string) => {
    const inLineup = lineup.entries.some(e => e.player.id === player.id)
    if (!inLineup) handleAddPlayer(player)
    lineup.setPosition(player.id, position)
  }

  const handlePositionClear = (position: string) => {
    const entry = lineup.entries.find(e => e.position === position)
    if (entry) lineup.setPosition(entry.player.id, '')
  }

  const loadGameData = async () => {
    if (!gameDay) return null
    const { lineups, staff, substitutions } = await api.getGameDayLineups(gameDay.id)
    return gameDay.games.map(g => ({
      game: g,
      lineup: lineups[String(g.id)] ?? [],
      staff: staff[String(g.id)] ?? [],
      substitutions: substitutions?.[String(g.id)] ?? [],
    }))
  }

  const handleExportPdf = async () => {
    if (!gameDay) return
    try {
      const gameData = await loadGameData()
      if (gameData) generatePdf(gameDay, gameData, season)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleExportScoring = async () => {
    if (!gameDay) return
    try {
      const gameData = await loadGameData()
      if (gameData) generateScoringPdf(gameDay, gameData, season)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const triggerAutoGenerate = () => {
    if (!activeGame) return
    if (lineup.entries.length > 0) {
      setShowAutoSingleConfirm(true)
    } else {
      handleAutoGenerate()
    }
  }

  const handleAutoGenerate = async () => {
    if (!activeGame) return
    setShowAutoSingleConfirm(false)
    setAutoSingleLoading(true)
    try {
      const suggestions = await api.suggestLineup(activeGame.id)
      lineup.applySuggestion(suggestions, availablePlayers)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setAutoSingleLoading(false)
    }
  }

  const handleAutoAll = async () => {
    if (!gameDay) return
    setShowAutoAllConfirm(false)
    setAutoAllLoading(true)
    try {
      const result = await api.suggestAllLineups(gameDay.id)
      // Capture current game ID before async operations (prevents stale closure)
      const currentGameId = activeGame?.id
      // Invalidate lineup cache so tab switches reload from backend
      lineup.invalidateCache()
      // Reload current game lineup from backend
      if (currentGameId) {
        await lineup.load(currentGameId)
      }
      await refreshStats()
      // Show toast with undo action
      const oldLineups = result.oldLineups
      const gameDayIdForUndo = gameDay.id
      toast.show('Alle Spiele aufgestellt', 'success', {
        duration: 10000,
        action: {
          label: 'Rückgängig',
          onClick: async () => {
            try {
              await api.undoAllLineups(gameDayIdForUndo, oldLineups)
              lineup.invalidateCache()
              if (currentGameId) {
                await lineup.load(currentGameId)
              }
              await refreshStats()
              toast.show('Rückgängig gemacht')
            } catch (err: unknown) {
              toast.show((err as Error).message, 'error')
            }
          },
        },
      })
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setAutoAllLoading(false)
    }
  }

  const handleSetAvailablePlayers = async (playerIds: number[]) => {
    try {
      await setAvailablePlayers(playerIds)
      // Remove lineup/staff entries for players no longer available (instead of full reload)
      const availableSet = new Set(playerIds)
      lineup.removeUnavailable(availableSet)
      if (activeGame) {
        staff.load(activeGame.id)
      }
      await refreshStats()
      setShowPlayersModal(false)
      toast.show('Spieler aktualisiert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (loading || !gameDay) {
    return <LoadingSkeleton />
  }

  const lineupPlayerIds = new Set(lineup.entries.map(e => e.player.id))
  const dhBatterIds = new Set(lineup.entries.filter(e => e.dhBatterId).map(e => e.dhBatterId!))
  const staffPlayerIds = new Set(staff.staff.map(s => s.player.id))
  const lineupUsedIds = new Set([...lineupPlayerIds, ...dhBatterIds])
  const allUsedIds = new Set([...lineupUsedIds, ...staffPlayerIds])
  const availablePlayers = gameDay.availablePlayers

  const poolPlayers = availablePlayers.filter(p => !lineupUsedIds.has(p.id))

  const benchPlayers = availablePlayers.filter(p => !allUsedIds.has(p.id))

  // Compute locally adjusted stats: reflect unsaved lineup changes in game counts
  // Only adjust stats if lineup entries actually belong to the current game (prevents flash on tab switch)
  const adjustedStats = (() => {
    if (!activeGame || lineup.activeGameId !== activeGame.id) return stats
    const gameNum = activeGame.gameNumber
    return stats.map(s => {
      const savedInGame = s.positions.some(p => p.gameNumber === gameNum)
      const localInGame = lineupPlayerIds.has(s.playerId)
      if (savedInGame === localInGame) return s
      return { ...s, gameCount: s.gameCount + (localInGame ? 1 : -1) }
    })
  })()

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="group flex items-baseline gap-3">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 tracking-wide uppercase">
                {gameDay.label || 'Spieltag'} <span className="text-softball-red-600">·</span> {formatDate(gameDay.date)}
              </h1>
              {gameDay.location && (
                <p className="font-display text-[11px] tracking-widest uppercase text-gray-500 mt-0.5 inline-flex items-center gap-1"><MapPin size={11} className="shrink-0" /> {gameDay.location}</p>
              )}
            </div>
            <div className="actions-reveal flex items-center gap-0.5">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-navy-700 hover:bg-cream-100 transition-colors cursor-pointer"
                title="Spieltag bearbeiten"
                aria-label="Spieltag bearbeiten"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 transition-colors cursor-pointer"
                title="Spieltag löschen"
                aria-label="Spieltag löschen"
              >
                <TrashBin size={14} />
              </button>
            </div>
          </div>
          {/* MOBILE Layout: Primary-Row + Toolbar-Strip */}
          <div className="sm:hidden flex flex-col gap-2 w-full">
            {/* Primary — Anwesend + Live scoren (beide filled Navy/Red) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowPlayersModal(true)}
                title="Wer ist am Spieltag dabei?"
                className={`px-3 py-2.5 text-sm rounded-lg font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors ${
                  availablePlayers.length === 0
                    ? 'bg-softball-red-50 border-2 border-softball-red-500 text-softball-red-700 animate-pulse'
                    : 'bg-navy-800 text-white hover:bg-navy-900'
                }`}
              >
                <UsersIcon size={18} />
                <span>Anwesend ({availablePlayers.length})</span>
                {availablePlayers.length > 0 && availablePlayers.length < 9 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                )}
              </button>
              {gameDay && gameDay.games.length > 0 && (
                <Link
                  to={`/gameday/${gameDayId}/scoring/${activeTab}`}
                  className="px-3 py-2.5 rounded-lg bg-softball-red-600 text-white font-bold text-sm hover:bg-softball-red-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <BallIcon size={18} />
                  <span>Live scoren</span>
                </Link>
              )}
            </div>

            {/* Secondary — Toolbar-Strip ohne einzelne Boxen */}
            <div className="flex items-center justify-between gap-0 border-t border-cream-200 pt-2">
              {availablePlayers.length > 0 && (
                <ToolbarBtn
                  icon={<DiceIcon size={16} />}
                  label="Auto"
                  onClick={() => setShowAutoAllConfirm(true)}
                  disabled={autoAllLoading}
                />
              )}
              <ToolbarBtn
                icon={<ClipboardIcon size={16} />}
                label="Scoring"
                onClick={handleExportScoring}
              />
              <ToolbarBtn
                icon={<ExportDoc size={16} />}
                label="PDF"
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
              />
            </div>
          </div>

          {/* DESKTOP Layout: 2-zeilig wie Mobile — Primary-Row (Anwesend + Live) + Toolbar-Strip (Auto, Fahrten, Scoring-PDF, PDF) */}
          <div className="hidden sm:flex flex-col gap-2 items-end">
            {/* Primary-Row: Anwesend + Live scoren */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPlayersModal(true)}
                title="Wer ist am Spieltag dabei?"
                className={`font-display px-3 py-2 text-xs font-extrabold tracking-widest uppercase rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                  availablePlayers.length === 0
                    ? 'border-2 border-softball-red-500 bg-softball-red-50 text-softball-red-700 animate-pulse'
                    : 'bg-navy-900 text-white hover:bg-navy-800'
                }`}
              >
                <UsersIcon size={14} />
                <span>Anwesend ({availablePlayers.length})</span>
                {availablePlayers.length > 0 && availablePlayers.length < 9 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Weniger als 9 Spieler — Minimum für ein Spiel" />
                )}
              </button>
              {gameDay && gameDay.games.length > 0 && (
                <Link
                  to={`/gameday/${gameDayId}/scoring/${activeTab}`}
                  className="font-display px-4 py-2 rounded-lg bg-softball-red-600 text-white font-extrabold text-xs tracking-widest uppercase hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/20 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  title="Live scoren"
                >
                  <BallIcon size={15} />
                  <span>Live scoren</span>
                </Link>
              )}
            </div>
            {/* Toolbar-Strip: Tertiary-Aktionen (Icon + Label) */}
            <div className="flex items-center gap-1 border-t border-cream-200 pt-1.5">
              {availablePlayers.length > 0 && (
                <button
                  onClick={() => setShowAutoAllConfirm(true)}
                  disabled={autoAllLoading}
                  className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                  title="Alle Spiele automatisch aufstellen"
                >
                  <DiceIcon size={14} />
                  <span>Auto</span>
                </button>
              )}
              <button
                onClick={handleExportScoring}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Scoring-Sheet drucken"
              >
                <ClipboardIcon size={14} />
                <span>Scoring</span>
              </button>
              <button
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Als PDF exportieren"
              >
                <ExportDoc size={14} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <>
      {/* Tabs */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm px-2 sm:px-4 pt-2">
      <GameTabs
        games={gameDay.games}
        activeIndex={activeTab}
        seasonId={gameDay.seasonId}
        onSelect={(i) => {
          setActiveTab(i)
          const game = gameDay.games[i]
          if (game) {
            lineup.load(game.id)
            staff.load(game.id)
          }
        }}
        gameCompletions={(() => {
          const map = new Map<number, { total: number; fieldCount: number }>()
          for (const game of gameDay.games) {
            const positions = new Set<string>()
            let total = 0
            for (const s of stats) {
              for (const p of s.positions) {
                if (p.gameNumber === game.gameNumber) {
                  total++
                  if (['P','C','1B','2B','3B','SS','LF','CF','RF'].includes(p.position)) {
                    positions.add(p.position)
                  }
                }
              }
            }
            map.set(game.id, { total, fieldCount: positions.size })
          }
          return map
        })()}
        onOpponentChanged={(gameId, opponentTeam) => {
          setGameDay(gd => gd ? {
            ...gd,
            games: gd.games.map(g => g.id === gameId ? { ...g, opponentTeam } : g),
          } : gd)
        }}
        onSwapped={async () => {
          lineup.invalidateCache()
          await reload()
          if (activeGame) {
            lineup.load(activeGame.id)
            staff.load(activeGame.id)
          }
          await refreshStats()
        }}
      />
      </div>

      {availablePlayers.length === 0 ? (
        /* Empty state: no players assigned yet */
        <div className="text-center py-16 border-2 border-dashed border-cream-300 rounded-xl">
          <CrossBones size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-gray-500 mb-1">Noch keine Spieler für diesen Spieltag ausgewählt.</p>
          <p className="text-sm text-gray-400 mb-6">Wähle zuerst aus, wer am Spieltag dabei ist.</p>
          <button
            onClick={() => setShowPlayersModal(true)}
            className="px-5 py-3 text-sm font-semibold text-white bg-softball-red-600 rounded-xl hover:bg-softball-red-500 shadow-lg shadow-softball-red-600/20"
          >
            Spieler auswählen
          </button>
        </div>
      ) : (
        <>
          {/* Mobile only: Lineup ↔ Feld Tab-Toggle */}
          <div className="lg:hidden flex bg-cream-100 border border-cream-300 rounded-lg p-0.5">
            <button
              onClick={() => setMobileView('lineup')}
              className={`flex-1 h-9 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${
                mobileView === 'lineup' ? 'bg-navy-800 text-white' : 'text-navy-700'
              }`}
            >
              Lineup
            </button>
            <button
              onClick={() => setMobileView('field')}
              className={`flex-1 h-9 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${
                mobileView === 'field' ? 'bg-navy-800 text-white' : 'text-navy-700'
              }`}
            >
              Feld
            </button>
          </div>

          {/* Main Layout — 3 columns on desktop, Swipe-Handler global */}
          <div
            className="grid grid-cols-1 lg:grid-cols-[5fr_4fr_3fr] gap-4 lg:gap-5"
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
          >
            {/* Col 1: Lineup + Save (desktop always; mobile: only when mobileView=lineup) */}
            <div className={`space-y-4 order-1 ${mobileView === 'field' ? 'hidden lg:block' : ''}`}>
              <LineupEditor
                entries={lineup.entries}
                poolPlayers={poolPlayers}
                onRemove={lineup.removePlayer}
                onSetPosition={lineup.setPosition}
                onSetDhBatter={lineup.setDhBatter}
                onMoveUp={lineup.moveUp}
                onMoveDown={lineup.moveDown}
                onReorder={lineup.reorder}
                onClear={() => setShowClearConfirm(true)}
                onAutoGenerate={triggerAutoGenerate}
                autoGenerateLoading={autoSingleLoading}
                onCopyOtherGame={seasonGameDays.some(gd => gd.games.some(g => g.id !== activeGame?.id)) && availablePlayers.length >= 2 ? () => setShowCopyLineup(true) : undefined}
              />

              <SubstitutionEditor
                substitutions={lineup.substitutions}
                lineupEntries={lineup.entries}
                poolPlayers={poolPlayers}
                staff={staff.staff}
                onAdd={lineup.addSubstitution}
                onRemove={lineup.removeSubstitution}
              />

              <SaveButton
                hasChanges={lineup.hasChanges}
                saving={lineup.saving}
                onSave={handleSave}
                onCancel={lineup.revert}
                className="lg:block hidden"
              />
            </div>

            {/* Col 2: Pool */}
            <div className="space-y-4 order-2">
              <PlayerPool
                allAvailablePlayers={availablePlayers}
                lineupPlayerIds={lineupUsedIds}
                stats={adjustedStats}
                battingStatsSeason={seasonBattingStats}
                battingStatsYear={yearBattingStats}
                seasonYear={season?.year ?? null}
                gameDayDate={gameDay.date}
                onAdd={handleAddPlayer}
              />
            </div>

            {/* Col 3: Training + Coaches — desktop only */}
            <div className="hidden lg:block space-y-4 order-3">
              <div>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cream-200">
                  <span className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900">
                    Training
                  </span>
                  <span className="ml-auto font-display text-[10px] tracking-widest uppercase text-gray-500 font-bold">
                    Letzte 3 Monate
                  </span>
                </div>
                <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden p-3 space-y-1.5">
                  {(() => {
                    const availableIds = new Set(availablePlayers.map(p => p.id))
                    const filtered = trainingStats
                      .filter(s => availableIds.has(s.playerId))
                      .sort((a, b) => b.attended - a.attended)
                    const maxAttended = Math.max(...filtered.map(s => s.attended), 1)

                    return filtered.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Keine Trainingsdaten.</p>
                    ) : (
                      filtered.map(s => {
                        const barWidth = Math.round((s.attended / maxAttended) * 100)
                        return (
                          <div key={s.playerId} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900 w-16 truncate">
                              {s.playerName}
                            </span>
                            <div className="flex-1 h-4 bg-cream-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-navy-800"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 tabular-nums w-6 text-right shrink-0">
                              {s.attended}
                            </span>
                          </div>
                        )
                      })
                    )
                  })()}
                </div>
              </div>

              <CoachSlots
                staff={staff.staff}
                availablePlayers={availablePlayers.filter(p => !lineupPlayerIds.has(p.id) && !dhBatterIds.has(p.id))}
                onSave={handleStaffSave}
              />
            </div>

            {/* Row 2: Field spans col 1+2, Bank in col 3 — desktop */}
            <div className="hidden lg:block lg:col-span-2 order-4">
              <FieldView entries={lineup.entries} onPositionClick={setAssignPosition} />
            </div>
            <div className="hidden lg:block order-5">
              <BenchDisplay players={benchPlayers} />
            </div>

            {/* Mobile: Coaches + Bench + Field after pool */}
            <div className="lg:hidden space-y-4 order-3">
              <CoachSlots
                staff={staff.staff}
                availablePlayers={availablePlayers.filter(p => !lineupPlayerIds.has(p.id) && !dhBatterIds.has(p.id))}
                onSave={handleStaffSave}
              />
              <BenchDisplay players={benchPlayers} />
            </div>
            <div className={`lg:hidden ${mobileView === 'field' ? 'order-0' : 'hidden'}`}>
              <FieldView entries={lineup.entries} onPositionClick={setAssignPosition} />
            </div>
          </div>

          {/* Mobile: Sticky Save Button */}
          <SaveButton
            hasChanges={lineup.hasChanges}
            saving={lineup.saving}
            onSave={handleSave}
            onCancel={lineup.revert}
            className="lg:hidden sticky bottom-4"
          />
        </>
      )}
      </>

      {showPlayersModal && (
        <AvailablePlayersModal
          allPlayers={players}
          selectedIds={availablePlayers.map(p => p.id)}
          onSave={handleSetAvailablePlayers}
          onClose={() => setShowPlayersModal(false)}
        />
      )}

      {showEditModal && (
        <EditGameDayModal
          gameDay={gameDay}
          onSaved={updated => {
            setGameDay(updated)
            setShowEditModal(false)
            toast.show('Spieltag aktualisiert')
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Spieltag löschen"
          message={`„${gameDay.label || 'Spieltag'} · ${formatDate(gameDay.date)}" wirklich löschen? Alle Spiele, Lineups und Scoring-Daten gehen verloren.`}
          confirmLabel="Löschen"
          onConfirm={async () => {
            await api.deleteGameDay(gameDay.id)
            setShowDeleteConfirm(false)
            toast.show('Spieltag gelöscht')
            navigate('/')
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showCopyLineup && activeGame && (
        <CopyLineupModal
          gameDays={seasonGameDays}
          currentGameId={activeGame.id}
          availablePlayerIds={new Set(availablePlayers.map(p => p.id))}
          onImport={entries => {
            lineup.importEntries(entries)
            setShowCopyLineup(false)
            toast.show('Lineup kopiert')
          }}
          onClose={() => setShowCopyLineup(false)}
        />
      )}

      <FieldPositionAssignSheet
        open={assignPosition != null}
        position={assignPosition}
        entries={lineup.entries}
        poolPlayers={poolPlayers}
        onAssign={handlePositionAssign}
        onClear={handlePositionClear}
        onClose={() => setAssignPosition(null)}
      />

      {showClearConfirm && (
        <ConfirmModal
          title="Lineup leeren"
          message="Alle Spieler aus dem Lineup entfernen? Ungespeicherte Änderungen gehen verloren."
          confirmLabel="Leeren"
          onConfirm={() => {
            lineup.clearAll()
            setShowClearConfirm(false)
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {showAutoSingleConfirm && (
        <ConfirmModal
          title="Positionen neu würfeln"
          message={
            lineup.hasChanges
              ? 'Es gibt ungespeicherte Änderungen. Positionen basierend auf dem letzten Speicherstand neu zuweisen?'
              : 'Positionen automatisch neu zuweisen?'
          }
          confirmLabel="Würfeln"
          onConfirm={handleAutoGenerate}
          onCancel={() => setShowAutoSingleConfirm(false)}
        />
      )}

      {showAutoAllConfirm && (
        <ConfirmModal
          title="Alle aufstellen"
          message={
            lineup.hasChanges
              ? 'Es gibt ungespeicherte Änderungen im aktuellen Lineup. Alle Spiele automatisch aufstellen und speichern?'
              : 'Alle Spiele automatisch aufstellen und speichern?'
          }
          confirmLabel="Aufstellen"
          onConfirm={handleAutoAll}
          onCancel={() => setShowAutoAllConfirm(false)}
        />
      )}

      {showExportConfirm && (
        <ConfirmModal
          title="PDF exportieren"
          message="Es gibt ungespeicherte Änderungen. Das PDF enthält den letzten Speicherstand."
          confirmLabel="Trotzdem exportieren"
          onConfirm={() => { setShowExportConfirm(false); handleExportPdf() }}
          onCancel={() => setShowExportConfirm(false)}
        />
      )}

      {blocker.state === 'blocked' && (
        <ConfirmModal
          title="Ungespeicherte Änderungen"
          message="Es gibt ungespeicherte Änderungen im Lineup. Seite trotzdem verlassen?"
          confirmLabel="Verlassen"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </div>
  )
}

interface ToolbarBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

function ToolbarBtn({ icon, label, onClick, active, disabled }: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'text-navy-700 bg-navy-50'
          : 'text-navy-600 hover:bg-cream-100 active:bg-cream-200'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  )
}
