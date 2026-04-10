import { useEffect, useState } from 'react'
import { useParams, useBlocker } from 'react-router-dom'
import { useGameDay } from '@/hooks/useGameDay'
import { useLineup } from '@/hooks/useLineup'
import { useStaff } from '@/hooks/useStaff'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { GameTabs } from './GameTabs'
import { LineupEditor } from './LineupEditor'
import { PlayerPool } from './PlayerPool'
import { FieldView } from './FieldView'
import { CoachSlots } from './CoachSlots'
import { BenchDisplay } from './BenchDisplay'
import { SaveButton } from './SaveButton'
import { AvailablePlayersModal } from './AvailablePlayersModal'
import { CopyLineupModal } from './CopyLineupModal'
import { SubstitutionEditor } from './SubstitutionEditor'
import { CarpoolPlanner } from './CarpoolPlanner'
import { EditGameDayModal } from '@/components/dashboard/EditGameDayModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ExportDoc, CrossBones, Pencil, CarIcon, DiceIcon, ClipboardIcon } from '@/icons'
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
  const [activeTab, setActiveTab] = useState(0)
  const [activeSection, setActiveSection] = useState<'lineup' | 'carpool'>('lineup')
  const [showPlayersModal, setShowPlayersModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCopyLineup, setShowCopyLineup] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showAutoAllConfirm, setShowAutoAllConfirm] = useState(false)
  const [showAutoSingleConfirm, setShowAutoSingleConfirm] = useState(false)
  const [autoAllLoading, setAutoAllLoading] = useState(false)
  const [autoSingleLoading, setAutoSingleLoading] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [seasonGameDays, setSeasonGameDays] = useState<GameDayResponse[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [trainingStats, setTrainingStats] = useState<TrainingStatsResponse[]>([])
  const [trainingPeriods, setTrainingPeriods] = useState<TrainingPeriodResponse[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)
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

  const loadLineup = lineup.load
  const loadStaff = staff.load

  useEffect(() => {
    if (activeGame) {
      loadLineup(activeGame.id)
      loadStaff(activeGame.id)
    }
  }, [activeGame?.id, loadLineup, loadStaff])

  // Fetch season game days for copy lineup feature + season for PDF export
  useEffect(() => {
    if (gameDay?.seasonId) {
      api.getGameDays(gameDay.seasonId).then(setSeasonGameDays)
      api.getSeason(gameDay.seasonId).then(setSeason)
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
        loadStaff(activeGame.id)
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
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="group/header flex items-start gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-950">
                {gameDay.label || 'Spieltag'} — {formatDate(gameDay.date)}
              </h1>
              {gameDay.location && (
                <p className="text-sm text-gray-600">@ {gameDay.location}</p>
              )}
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="mt-1 p-1.5 rounded-lg text-softball-red-500 opacity-0 group-hover/header:opacity-100 hover:text-softball-red-700 hover:bg-softball-red-50 transition-all cursor-pointer"
              title="Spieltag bearbeiten"
            >
              <Pencil size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {availablePlayers.length > 0 && (
              <button
                onClick={() => setShowAutoAllConfirm(true)}
                disabled={autoAllLoading}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-navy-700 hover:bg-navy-800 hover:border-navy-800 hover:text-white cursor-pointer font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                title="Alle Spiele automatisch aufstellen"
              >
                <DiceIcon size={16} />
                <span className="hidden sm:inline">Alle aufstellen</span>
              </button>
            )}
            <button
              onClick={() => setShowPlayersModal(true)}
              title="Wer ist am Spieltag dabei?"
              className={`px-3 py-2 text-sm rounded-lg border font-medium cursor-pointer ${
                availablePlayers.length === 0
                  ? 'border-softball-red-500 bg-softball-red-50 text-softball-red-700 animate-pulse'
                  : 'border-navy-200 text-navy-700 hover:bg-navy-800 hover:border-navy-800 hover:text-white transition-colors'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                Anwesend ({availablePlayers.length})
                {availablePlayers.length > 0 && availablePlayers.length < 9 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Weniger als 9 Spieler — Minimum für ein Spiel" />
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'carpool' ? 'lineup' : 'carpool')}
              title="Fahrten planen"
              className={`p-2 rounded-lg border cursor-pointer ${
                activeSection === 'carpool'
                  ? 'border-navy-600 bg-navy-50 text-navy-700'
                  : 'border-navy-200 text-navy-600 hover:bg-navy-800 hover:border-navy-800 hover:text-white transition-colors'
              }`}
            >
              <CarIcon size={20} />
            </button>
            <button
              onClick={handleExportScoring}
              className="p-2 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-800 hover:border-navy-800 hover:text-white transition-colors cursor-pointer"
              title="Scoring-Sheet drucken"
            >
              <ClipboardIcon size={20} />
            </button>
            <button
              onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
              className="p-2 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-800 hover:border-navy-800 hover:text-white transition-colors cursor-pointer"
              title="Als PDF exportieren"
            >
              <ExportDoc size={20} />
            </button>
          </div>
        </div>
      </div>

      {activeSection === 'carpool' ? (
        <>
        <button
          onClick={() => setActiveSection('lineup')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-navy-700 hover:bg-navy-50 rounded-lg cursor-pointer transition-colors"
        >
          <span className="text-base leading-none">&larr;</span> Zurück zum Lineup
        </button>
        <CarpoolPlanner gameDayId={gameDayId} availablePlayers={availablePlayers} />
        </>
      ) : (
      <>
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm px-4 pt-2">
      <GameTabs
        games={gameDay.games}
        activeIndex={activeTab}
        seasonId={gameDay.seasonId}
        onSelect={(i) => {
          setActiveTab(i)
          const game = gameDay.games[i]
          if (game) {
            loadLineup(game.id)
            loadStaff(game.id)
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
        onScoreChanged={(gameId, scoreUs, scoreThem) => {
          setGameDay(gd => gd ? {
            ...gd,
            games: gd.games.map(g => g.id === gameId ? { ...g, scoreUs, scoreThem } : g),
          } : gd)
        }}
        onSwapped={async () => {
          lineup.invalidateCache()
          await reload()
          if (activeGame) {
            loadLineup(activeGame.id)
            loadStaff(activeGame.id)
          }
          await refreshStats()
        }}
      />
      </div>

      {availablePlayers.length === 0 ? (
        /* Empty state: no players assigned yet */
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
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
          {/* Main Layout — 3 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr_3fr] gap-4 lg:gap-5">
            {/* Col 1: Lineup + Save */}
            <div className="space-y-4 order-1">
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
                className="lg:block hidden"
              />
            </div>

            {/* Col 2: Pool */}
            <div className="space-y-4 order-2">
              <PlayerPool
                allAvailablePlayers={availablePlayers}
                lineupPlayerIds={lineupUsedIds}
                stats={adjustedStats}
                gameDayDate={gameDay.date}
                onAdd={handleAddPlayer}
              />
            </div>

            {/* Col 3: Training + Coaches — desktop only */}
            <div className="hidden lg:block space-y-4 order-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-1 h-6 bg-softball-red-600 rounded-full shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-wide text-gray-950">
                    Training
                  </span>
                  <select
                    value={selectedPeriodId ?? ''}
                    onChange={e => setSelectedPeriodId(e.target.value ? Number(e.target.value) : null)}
                    className="ml-auto text-[11px] font-mono text-gray-500 bg-transparent border border-gray-200 rounded px-1.5 py-0.5 cursor-pointer hover:border-gray-400 transition-colors focus:outline-none focus:border-navy-600"
                  >
                    <option value="">letzte 12 Wo.</option>
                    {trainingPeriods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-3 space-y-1.5">
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
                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
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
              <FieldView entries={lineup.entries} />
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
            <div className="order-4 lg:hidden">
              <FieldView entries={lineup.entries} />
            </div>
          </div>

          {/* Mobile: Sticky Save Button */}
          <SaveButton
            hasChanges={lineup.hasChanges}
            saving={lineup.saving}
            onSave={handleSave}
            className="lg:hidden sticky bottom-4"
          />
        </>
      )}
      </>
      )}

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
