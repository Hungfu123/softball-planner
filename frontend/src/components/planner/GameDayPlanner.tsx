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
import { CarpoolPlanner } from './CarpoolPlanner'
import { EditGameDayModal } from '@/components/dashboard/EditGameDayModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ExportDoc, CrossBones, Pencil, CarIcon } from '@/icons'
import type { Player, GameDayResponse, Season } from '@/types'
import { generatePdf } from '@/utils/pdfExport'
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
  const [seasonGameDays, setSeasonGameDays] = useState<GameDayResponse[]>([])
  const [season, setSeason] = useState<Season | null>(null)
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
  }

  const handleExportPdf = async () => {
    if (!gameDay) return
    try {
      const { lineups, staff } = await api.getGameDayLineups(gameDay.id)
      const gameData = gameDay.games.map(g => ({
        game: g,
        lineup: lineups[String(g.id)] ?? [],
        staff: staff[String(g.id)] ?? [],
      }))
      generatePdf(gameDay, gameData, season)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
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
    return <div className="text-center py-12 text-gray-500">Laden...</div>
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
              onClick={handleExportPdf}
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
          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Lineup + Save + Field */}
            <div className="lg:col-span-2 space-y-4 order-1">
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
                onCopyOtherGame={seasonGameDays.some(gd => gd.games.some(g => g.id !== activeGame?.id)) && availablePlayers.length >= 2 ? () => setShowCopyLineup(true) : undefined}
              />

              <SaveButton
                hasChanges={lineup.hasChanges}
                saving={lineup.saving}
                onSave={handleSave}
                className="lg:block hidden"
              />

              <div className="hidden lg:block">
                <FieldView entries={lineup.entries} />
              </div>
            </div>

            {/* Right: Pool + Coaches + Bench */}
            <div className="space-y-4 order-2">
              <PlayerPool
                allAvailablePlayers={availablePlayers}
                lineupPlayerIds={lineupUsedIds}
                stats={adjustedStats}
                gameDayDate={gameDay.date}
                onAdd={handleAddPlayer}
              />

              <CoachSlots
                staff={staff.staff}
                availablePlayers={availablePlayers.filter(p => !lineupPlayerIds.has(p.id) && !dhBatterIds.has(p.id))}
                onSave={handleStaffSave}
              />

              <BenchDisplay players={benchPlayers} />
            </div>

            {/* Field — mobile only, after pool/coaches/bench */}
            <div className="order-3 lg:hidden">
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
