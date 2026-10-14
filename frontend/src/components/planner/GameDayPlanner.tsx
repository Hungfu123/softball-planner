import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useParams, useSearchParams, useBlocker, useNavigate } from 'react-router-dom'
import { useGameDay } from '@/hooks/useGameDay'
import { useLineup } from '@/hooks/useLineup'
import { useStaff } from '@/hooks/useStaff'
import { usePlayers } from '@/hooks/usePlayers'
import { useToastContext } from '@/components/layout/Layout'
import { GameTabs } from './GameTabs'
import { LineupEditor } from './LineupEditor'
import { useLineupRuleCheck } from '@/hooks/useLineupRuleCheck'
import { LineupSetBar } from './LineupSetBar'
import { SaveSetModal } from './SaveSetModal'
import { useLineupSets } from '@/hooks/useLineupSets'
import { useOpponentBattingStats } from '@/hooks/useOpponentBattingStats'
import { PlayerPool } from './PlayerPool'
import { FieldView } from './FieldView'
import { FieldPositionAssignSheet } from './FieldPositionAssignSheet'
import { CoachSlots } from './CoachSlots'
import { BenchDisplay } from './BenchDisplay'
import { SaveButton } from './SaveButton'
import { AvailablePlayersModal } from './AvailablePlayersModal'
import { CopyLineupModal } from './CopyLineupModal'
import { SubstitutionEditor } from './SubstitutionEditor'
import { TrainingAttendancePanel } from './TrainingAttendancePanel'
import { PollVoteSyncSheet } from './PollVoteSyncSheet'
import { PollSyncToolbarButton } from './PollSyncToolbarButton'
import { EditGameDayModal } from '@/components/dashboard/EditGameDayModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { EmptyState, Button } from '@/components/shared'
import { ExportDoc, CrossBones, Pencil, TrashBin, DiceIcon, UsersIcon, BallIcon, CheckCircle } from '@/icons'
import { MapPin } from 'lucide-react'
import type { Player, GameDayResponse, Season, TrainingStatsResponse, TrainingPeriodResponse, CoachRotationPair, LineupSetResponse, GameDayVotePreview } from '@/types'
import { generatePdf, generateLineupWithFieldPdf, generateSignatureListPdf } from '@/utils/pdfExport'
import { GameDayPlannerSkeleton } from './GameDayPlannerSkeleton'
import * as api from '@/api/client'

export function GameDayPlanner() {
  const { id } = useParams<{ id: string }>()
  const gameDayId = Number(id)
  const { gameDay, setGameDay, stats, loading, refreshStats, setAvailablePlayers } = useGameDay(gameDayId)
  const lineup = useLineup()
  const lineupSets = useLineupSets(gameDayId)
  const staff = useStaff()
  const { players, reload: reloadPlayers } = usePlayers()
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
  const [saveSetOpen, setSaveSetOpen] = useState(false)
  const [renameSet, setRenameSet] = useState<LineupSetResponse | null>(null)
  const [deleteSet, setDeleteSet] = useState<LineupSetResponse | null>(null)
  const [overwriteSet, setOverwriteSet] = useState<LineupSetResponse | null>(null)
  const [pendingApplySet, setPendingApplySet] = useState<LineupSetResponse | null>(null)
  const [activeSetId, setActiveSetId] = useState<number | null>(null)
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
  const [pollStatus, setPollStatus] = useState<GameDayVotePreview | null>(null)
  // Montag = P/C-Training. Ausgeschlossene Wochentage gehen als Query-Param mit,
  // das Backend rechnet die Teilnahme-Zahlen ohne diese Tage.
  const [excludedTrainingWeekdays, setExcludedTrainingWeekdays] = useState<number[]>([])
  const [showPollSync, setShowPollSync] = useState(false)
  const activeGame = gameDay?.games[activeTab]

  // FERTIG: Backend `endedAt` ist die Wahrheit (wie HeroNextGameDay) — Score-Presence
  // allein zählt nicht (Spiel kann mid-game 0–0 stehen). Der rote Live-Button wird
  // für beendete Spiele zum leiseren Ergebnis-Button (Klick öffnet Spielbogen/Stats).
  const activeGameFinished = activeGame?.endedAt != null
  const activeResult = !activeGameFinished || activeGame?.scoreUs == null || activeGame.scoreThem == null
    ? null
    : activeGame.scoreUs > activeGame.scoreThem ? 'W'
    : activeGame.scoreUs < activeGame.scoreThem ? 'L' : 'T'
  const finishedScoreBtnLabel = !activeGameFinished
    ? null
    : activeResult == null ? 'Beendet'
    : `${activeResult === 'W' ? 'Sieg' : activeResult === 'L' ? 'Niederlage' : 'Unentschieden'} ${activeGame!.scoreUs}:${activeGame!.scoreThem}`
  const finishedScoreBtnCls =
    activeResult === 'W' ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
    : activeResult === 'L' ? 'bg-softball-red-50 border border-softball-red-300 text-softball-red-700 hover:bg-softball-red-100'
    : 'bg-navy-50 border border-navy-300 text-navy-900 hover:bg-navy-100'

  // Gegner-Splits EINMAL pro Gegner laden (PlayerPool wird mobil + desktop zweimal gerendert)
  const opponentBatting = useOpponentBattingStats(activeGame?.opponentTeam?.name ?? null)

  // Block in-app navigation when there are unsaved changes
  const blocker = useBlocker(lineup.hasChanges)

  // Warn before leaving with unsaved changes (browser tab close / refresh)
  useEffect(() => {
    if (!lineup.hasChanges) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [lineup.hasChanges])

  // First-load gate: keep the full-page skeleton until lineup AND staff for the
  // active game have loaded once. Tab switches afterwards stay smooth (lineup is
  // cached, staff shows its own inline skeleton via CoachSlots `loading`).
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (activeGame) {
      Promise.all([
        lineup.load(activeGame.id),
        staff.load(activeGame.id),
      ]).then(() => setReady(true))
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

  // Poll-Status für den WhatsApp-Stimmen-Button: nur gespeicherte Stimmen (kein Live-Abruf
  // bei WhatsApp), fehlertolerant — schlägt der Call fehl (kein Poll, Backend-Problem),
  // bleibt der Button einfach versteckt statt den Planner zu brechen.
  useEffect(() => {
    if (!gameDay?.id) return
    api.getGameDayPollVotes(gameDay.id)
      .then(setPollStatus)
      .catch(() => setPollStatus(null))
  }, [gameDay?.id])

  const toggleTrainingWeekday = useCallback((weekday: number) => {
    setExcludedTrainingWeekdays(prev =>
      prev.includes(weekday) ? prev.filter(d => d !== weekday) : [...prev, weekday])
  }, [])

  // Fetch training stats — by period or last 12 weeks
  useEffect(() => {
    if (!gameDay?.date) return
    if (selectedPeriodId) {
      api.getTrainingStats(selectedPeriodId, undefined, undefined, excludedTrainingWeekdays).then(setTrainingStats)
    } else {
      const d = new Date(gameDay.date + 'T00:00:00')
      d.setDate(d.getDate() - 84)
      api.getTrainingStats(undefined, d.toISOString().slice(0, 10), gameDay.date, excludedTrainingWeekdays)
        .then(setTrainingStats)
    }
  }, [gameDay?.date, selectedPeriodId, excludedTrainingWeekdays])

  // Nur den Tab wechseln — das Laden von Lineup/Staff übernimmt zentral der
  // Effect auf activeGame?.id (verhindert doppelte, konkurrierende load()-Aufrufe).
  const selectGame = useCallback((i: number) => {
    setActiveTab(i)
  }, [])

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

  // Speichert ALLE Spiel-Lineups des Spieltags auf einmal (nicht nur das aktive).
  const handleSave = async () => {
    if (!gameDay) return
    const games = gameDay.games.map(g => ({ id: g.id, gameNumber: g.gameNumber }))
    try {
      const skipped = await lineup.saveAllGames(games)
      await refreshStats()
      if (skipped.length === 0) {
        toast.show('Alle Lineups gespeichert')
      } else {
        toast.show(`Gespeichert. Spiel ${skipped.join(', ')}: freie Slots — bitte füllen & speichern`)
      }
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const doApplySet = async (set: LineupSetResponse) => {
    const games = (gameDay?.games ?? []).map(g => ({ id: g.id, gameNumber: g.gameNumber }))
    try {
      // 0. Verfügbare Spieler aus dem Set setzen (Cascade räumt Fremde aus allen Spielen).
      // Ältere Sets (vor diesem Feature) haben leere availablePlayerIds — dann Roster
      // aus den Set-Einträgen ableiten (Feldspieler + DH-Batter), sonst würden Set-Spieler,
      // die heute nicht im Roster stehen, beim setLineup mit 400 abgelehnt werden.
      const roster = (set.availablePlayerIds && set.availablePlayerIds.length > 0)
        ? set.availablePlayerIds
        : Array.from(new Set(
            set.entries.flatMap(e => [e.player.id, e.dhBatterPlayer?.id]).filter((x): x is number => x != null)
          ))
      if (roster.length > 0) await setAvailablePlayers(roster)
      // 1-3. pro Spiel: Coaches leeren → Lineup → Set-Coaches (in applySet)
      const { skipped, skippedCoaches } = await lineup.applySet(set.entries, set.staff, games, set.rotations ?? [])
      setActiveSetId(set.id)
      // Staff des aktiven Spiels neu laden, damit CoachSlots stimmen
      if (activeGame) await staff.load(activeGame.id)
      // Games frisch ziehen: applySet schreibt die Coach-Rotation des Sets ins
      // Backend, sonst zeigt das Lineup weiter die 1B/3B-Badges des vorherigen Sets.
      if (gameDay) setGameDay(await api.getGameDay(gameDay.id))
      await refreshStats()
      if (skipped.length === 0 && skippedCoaches.length === 0) {
        toast.show(`Set „${set.name}" angewendet & gespeichert`, 'success')
      } else {
        const notes: string[] = []
        if (skipped.length > 0) {
          notes.push(`Spiel ${skipped.join(', ')}: freie Slots — bitte füllen & speichern`)
        }
        if (skippedCoaches.length > 0) {
          const coaches = skippedCoaches.map(c => `Spiel ${c.gameNumber}: ${c.playerName}`).join(', ')
          notes.push(`${coaches} schlägt/schlagen im Set selbst — Base-Coach-Slot bleibt frei`)
        }
        toast.show(`Set „${set.name}" angewendet. ${notes.join(' · ')}`)
      }
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleApplySet = (set: LineupSetResponse) => {
    setPendingApplySet(set)
  }

  // "Als Set speichern" = ganzer Spieltag: speichert ZUERST alle Game-Lineups
  // (Drafts aller Tabs) in die DB, dann snapshotet das Backend den frischen Stand.
  const handleSaveSet = async (name: string) => {
    const games = (gameDay?.games ?? []).map(g => ({ id: g.id, gameNumber: g.gameNumber }))
    try {
      const skipped = await lineup.saveAllGames(games)
      if (skipped.length > 0) {
        toast.show(`Spiel ${skipped.join(', ')} hat freie Slots — erst füllen, dann Set speichern`, 'error')
        return
      }
      await lineupSets.create(name)
      await refreshStats()
      setSaveSetOpen(false)
      toast.show(`Set „${name}" + alle Lineups gespeichert`, 'success')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  // Überschreiben = gleiche Reihenfolge wie "Als Set speichern": erst alle Game-Lineups
  // in die DB, dann snapshotet das Backend den frischen Stand in das bestehende Set.
  const handleOverwriteSet = async () => {
    if (!overwriteSet) return
    const target = overwriteSet
    const games = (gameDay?.games ?? []).map(g => ({ id: g.id, gameNumber: g.gameNumber }))
    try {
      const skipped = await lineup.saveAllGames(games)
      if (skipped.length > 0) {
        toast.show(`Spiel ${skipped.join(', ')} hat freie Slots — erst füllen, dann überschreiben`, 'error')
        return
      }
      await lineupSets.overwrite(target.id)
      await refreshStats()
      setActiveSetId(target.id)
      setOverwriteSet(null)
      toast.show(`Set „${target.name}" überschrieben`, 'success')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleRenameSet = async (name: string) => {
    if (!renameSet) return
    try {
      await lineupSets.rename(renameSet.id, name)
      setRenameSet(null)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleDeleteSet = async () => {
    if (!deleteSet) return
    try {
      await lineupSets.remove(deleteSet.id)
      if (activeSetId === deleteSet.id) setActiveSetId(null)
      setDeleteSet(null)
      toast.show('Set gelöscht')
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

  const coachRotationLineup = lineup.entries.map((e, i) => ({
    battingOrder: i + 1,
    position: e.position,
    player: { name: e.player.name },
  }))

  const handleRotationSave = async (
    firstBase: CoachRotationPair | null,
    firstReversed: boolean,
    thirdBase: CoachRotationPair | null,
    thirdReversed: boolean
  ) => {
    if (!activeGame || !gameDay) return
    try {
      const updated = await api.setCoachRotation(activeGame.id, firstBase, thirdBase, firstReversed, thirdReversed)
      setGameDay(prev => prev ? ({
        ...prev,
        games: prev.games.map(g => g.id === updated.id ? updated : g),
      }) : prev)
      toast.show('Coach-Rotation gespeichert')
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

  // Der DH-Batter schlägt → darf laut Domain-Regel NICHT Base Coach sein.
  // Wie beim Hinzufügen ins Lineup den Coach-Slot direkt freiräumen, statt den
  // Konflikt erst beim Speichern als Backend-Fehler hochkommen zu lassen.
  // Batter null = "DH entfernen" → der HOST schlägt wieder selbst → auch dann räumen.
  const handleSetDhBatter = async (fieldPlayerId: number, batter: Player | null) => {
    const hostEntry = batter ? null : lineup.entries.find(e => e.player.id === fieldPlayerId)
    lineup.setDhBatter(fieldPlayerId, batter)
    if (batter) {
      if (!activeGame || !staffPlayerIds.has(batter.id)) return
      const remaining = staff.staff
        .filter(s => s.player.id !== batter.id)
        .map(s => ({ playerId: s.player.id, role: s.role }))
      try {
        await staff.save(activeGame.id, remaining)
        await refreshStats()
        toast.show(`${batter.name} schlägt als DH — Base-Coach-Slot geleert`)
      } catch (e: unknown) {
        toast.show((e as Error).message, 'error')
      }
    } else {
      void clearCoachesIfDhHosts([hostEntry])
    }
  }

  const handleSwapWithPool = (rowPlayerId: number, newPlayer: Player) => {
    // War der neue Spieler der DH-Batter eines Hosts, verliert der Host sein DH
    // (replacePlayer nullt die Referenz) und schlägt wieder selbst.
    const hostsLosingDh = lineup.entries.filter(e => e.dhBatterId === newPlayer.id)
    lineup.replacePlayer(rowPlayerId, newPlayer)
    // Auto-remove from coach slot if swapped-in player was a base coach
    if (staffPlayerIds.has(newPlayer.id)) {
      const remaining = staff.staff
        .filter(s => s.player.id !== newPlayer.id)
        .map(s => ({ playerId: s.player.id, role: s.role }))
      handleStaffSave(remaining)
    }
    void clearCoachesIfDhHosts(hostsLosingDh)
  }

  // DH-Hosts, die durch eine Editor-Transition (Positionswechsel, DH entfernen,
  // Spieler entfernen/tauschen) ihre DH-Annotation verlieren, schlagen wieder
  // selbst und dürfen nicht Base Coach bleiben (Domain-Regel). Den Coach-Slot
  // direkt freiräumen statt den Konflikt erst beim Speichern als Backend-Fehler
  // zu sehen. ALLE betroffenen Spieler in EINEM Save — mehrere parallele Saves
  // aus demselben staff-Snapshot würden sich gegenseitig den Eintrag restaurieren.
  // Die Entry-Snapshots müssen von VOR der Lineup-Änderung stammen (immutable).
  const clearCoachesIfDhHosts = async (entrySnapshots: ({ player: Player; dhBatterId: number | null } | null | undefined)[]) => {
    const affected = entrySnapshots.filter(
      (e): e is { player: Player; dhBatterId: number } => e != null && e.dhBatterId != null && staffPlayerIds.has(e.player.id),
    )
    if (affected.length === 0 || !activeGame) return
    const removeIds = new Set(affected.map(e => e.player.id))
    const remaining = staff.staff
      .filter(s => !removeIds.has(s.player.id))
      .map(s => ({ playerId: s.player.id, role: s.role }))
    try {
      await staff.save(activeGame.id, remaining)
      await refreshStats()
      toast.show(`${affected.map(e => e.player.name).join(', ')} schlagen wieder selbst — Base-Coach-Slot geleert`)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  // Spieler aus dem Lineup entfernen: War er der DH-Batter eines Hosts, verliert
  // der Host sein DH und schlägt wieder selbst → Coach-Slot mit aufräumen.
  const handleRemovePlayer = (playerId: number) => {
    const hostsLosingDh = lineup.entries.filter(e => e.dhBatterId === playerId)
    lineup.removePlayer(playerId)
    void clearCoachesIfDhHosts(hostsLosingDh)
  }

  // Zwei Lineup-Zeilen tauschen: swapEntries nimmt BEIDEN Entries das DH —
  // beide Hosts schlagen wieder selbst → Coach-Slots mit aufräumen.
  const handleSwapWithLineup = (rowPlayerId: number, otherRowPlayerId: number) => {
    const a = lineup.entries.find(e => e.player.id === rowPlayerId)
    const b = lineup.entries.find(e => e.player.id === otherRowPlayerId)
    lineup.swapEntries(rowPlayerId, otherRowPlayerId)
    void clearCoachesIfDhHosts([a, b])
  }

  const handlePositionAssign = (player: Player, position: string) => {
    const currentEntry = lineup.entries.find(e => e.position === position)
    const newPlayerEntry = lineup.entries.find(e => e.player.id === player.id)
    const newPlayerOldPosition = newPlayerEntry?.position ?? null
    const replacingDifferentPlayer = !!currentEntry && currentEntry.player.id !== player.id
    // DH-Hosts, die in dieser Transition ihr DH verlieren (Snapshots von vorher):
    const lostDhHosts: { player: Player; dhBatterId: number | null }[] = []

    // Bisherigen Belegt-Spieler ZUERST verschieben/entfernen,
    // damit bei vollem Lineup (10/10) ein Pool-Pick noch Platz findet.
    if (replacingDifferentPlayer) {
      if (newPlayerOldPosition || newPlayerEntry) {
        lineup.setPosition(currentEntry!.player.id, newPlayerOldPosition || '')
        lostDhHosts.push(currentEntry!)
      } else {
        lineup.removePlayer(currentEntry!.player.id) // fliegt raus → darf Coach bleiben
      }
    }

    if (!newPlayerEntry) handleAddPlayer(player)
    lineup.setPosition(player.id, position)
    if (newPlayerEntry) lostDhHosts.push(newPlayerEntry)
    void clearCoachesIfDhHosts(lostDhHosts)
  }

  const handlePositionClear = (position: string) => {
    const entry = lineup.entries.find(e => e.position === position)
    if (!entry) return
    lineup.setPosition(entry.player.id, '')
    void clearCoachesIfDhHosts([entry])
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

  const handleExportLineupField = async () => {
    if (!gameDay) return
    try {
      const gameData = await loadGameData()
      if (gameData) generateLineupWithFieldPdf(gameDay, gameData, season)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleExportSignatures = () => {
    if (!gameDay) return
    try {
      generateSignatureListPdf(gameDay, gameDay.availablePlayers)
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

  // Gemeinsamer Nachlauf für jeden Weg, der die Anwesenheitsliste ändert (manuelles
  // Anwesend-Modal UND WhatsApp-Stimmen-Übernahme): lokales Lineup/Staff auf den neuen
  // Anwesenheitsstand bringen, sonst zeigt das Grid für die aktive Ansicht veraltete
  // Einträge (Spieler steht noch im Lineup, obwohl die DB ihn bereits entfernt hat).
  const syncAfterAvailabilityChange = async (availablePlayerIds: number[]) => {
    const availableSet = new Set(availablePlayerIds)
    lineup.removeUnavailable(availableSet)
    // Backend cascade cleaned the removed player from ALL games (lineup + staff,
    // batting orders renumbered). removeUnavailable only fixed the active tab, so
    // drop the cached snapshots of the other games — sonst zeigt ein Tab-Wechsel
    // (z.B. auf Spiel 2) den veralteten Stand und man muss neu laden.
    lineup.invalidateCache()
    if (activeGame) {
      staff.load(activeGame.id)
    }
    await refreshStats()
  }

  const handleSetAvailablePlayers = async (playerIds: number[]) => {
    try {
      await setAvailablePlayers(playerIds)
      await syncAfterAvailabilityChange(playerIds)
      setShowPlayersModal(false)
      toast.show('Spieler aktualisiert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  // Liga-Regeln gegen den aktuellen Entwurf — rechnet das Backend, zeigt der Bogen.
  // Muss vor dem Skeleton-Return stehen: Hooks laufen in jedem Render gleich oft.
  const ruleCheck = useLineupRuleCheck(activeGame?.id ?? null, lineup.entries)

  if (loading || !gameDay || !ready) {
    return <GameDayPlannerSkeleton />
  }

  const lineupPlayerIds = new Set(lineup.entries.map(e => e.player.id))
  const dhBatterIds = new Set(lineup.entries.filter(e => e.dhBatterId).map(e => e.dhBatterId!))
  // Base Coach darf nur sein, wer nicht schlägt: Bank-Spieler + DH-Host (gibt Batting an DH ab).
  // Gesperrt: schlagende Lineup-Spieler (battingLineupIds) + DH-Batter (dhBatterIds).
  const battingLineupIds = new Set(lineup.entries.filter(e => !e.dhBatterId).map(e => e.player.id))
  const staffPlayerIds = new Set(staff.staff.map(s => s.player.id))
  const lineupUsedIds = new Set([...lineupPlayerIds, ...dhBatterIds])
  const allUsedIds = new Set([...lineupUsedIds, ...staffPlayerIds])
  const availablePlayers = gameDay.availablePlayers

  // Save button reflects unsaved changes in ANY game (not just the active tab),
  // since saving persists the whole gameday at once.
  const anyUnsaved = lineup.hasChanges || lineup.hasUnsavedWork(gameDay.games.map(g => g.id))

  const poolPlayers = availablePlayers.filter(p => !lineupUsedIds.has(p.id))

  const benchPlayers = availablePlayers.filter(p => !allUsedIds.has(p.id))

  // Compute locally adjusted stats: reflect unsaved lineup changes in game counts
  // Only adjust stats if lineup entries actually belong to the current game (prevents flash on tab switch)
  const adjustedStats = (() => {
    if (!activeGame || lineup.activeGameId !== activeGame.id) return stats
    const gameNum = activeGame.gameNumber

    // Lokaler Einsatz-Gewichtung eines Spielers im aktiven (ungespeicherten) Spiel:
    // DH-Batter = 0.5, Feld-Host (gibt Batting an DH ab) = 0.5, EH = 0.5, sonst 1.0
    const localWeight = (playerId: number): number => {
      if (dhBatterIds.has(playerId)) return 0.5
      const entry = lineup.entries.find(e => e.player.id === playerId)
      if (!entry) return 0
      if (entry.dhBatterId) return 0.5
      if (entry.position === 'EH') return 0.5
      return 1.0
    }

    return stats.map(s => {
      const savedWeight = s.positions
        .filter(p => p.gameNumber === gameNum)
        .reduce((sum, p) => sum + p.weight, 0)
      const local = localWeight(s.playerId)
      if (savedWeight === local) return s
      return { ...s, gameCount: s.gameCount - savedWeight + local }
    })
  })()

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm p-5 xl:px-7 xl:pt-5 xl:rounded-b-none xl:pb-3 xl:pt-2.5 xl:pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="group flex items-baseline gap-3 xl:gap-4">
            <div>
              <h1 className="font-headline text-2xl sm:text-3xl xl:text-[2.5rem] xl:leading-[1.02] xl:text-[2.1rem] font-extrabold text-navy-900 tracking-wide uppercase">
                {gameDay.label || 'Spieltag'} <span className="text-softball-red-600">·</span> {formatDate(gameDay.date)}
              </h1>
              {gameDay.location && (
                <p className="font-display text-[11px] tracking-widest uppercase text-gray-500 mt-0.5 xl:mt-0 inline-flex items-center gap-1"><MapPin size={11} className="shrink-0" /> {gameDay.location}</p>
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
                  className={`px-3 py-2.5 rounded-lg font-bold text-sm cursor-pointer inline-flex items-center justify-center gap-1.5 border transition-[background-color,border-color,color,transform] active:scale-[0.98] ${
                    activeGameFinished
                      ? finishedScoreBtnCls
                      : 'border-transparent bg-softball-red-600 text-white hover:bg-softball-red-700'
                  }`}
                  title={activeGameFinished ? 'Beendet — Spielbogen & Statistiken ansehen' : 'Live scoren'}
                >
                  {activeGameFinished ? (
                    <>
                      <CheckCircle size={18} />
                      <span>{finishedScoreBtnLabel}</span>
                    </>
                  ) : (
                    <>
                      <BallIcon size={18} />
                      <span>Live scoren</span>
                    </>
                  )}
                </Link>
              )}
            </div>

            <PollSyncToolbarButton variant="mobile" pollStatus={pollStatus} onClick={() => setShowPollSync(true)} />

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
                icon={<ExportDoc size={16} />}
                label="Aufstellung"
                onClick={handleExportLineupField}
              />
              <ToolbarBtn
                icon={<ExportDoc size={16} />}
                label="PDF"
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
              />
              <ToolbarBtn
                icon={<UsersIcon size={16} />}
                label="Liste"
                onClick={handleExportSignatures}
              />
            </div>
          </div>

          {/* DESKTOP Layout: 2-zeilig wie Mobile — Primary-Row (Anwesend + Live) + Toolbar-Strip (Auto, Fahrten, Scoring-PDF, PDF) */}
          <div className="hidden sm:flex flex-col gap-2 items-end xl:flex-row xl:items-center xl:gap-3">
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
                  className={`font-display px-4 py-2 rounded-lg font-extrabold text-xs tracking-widest uppercase cursor-pointer inline-flex items-center gap-1.5 border shadow-sm transition-[background-color,border-color,color,transform] active:scale-[0.98] ${
                    activeGameFinished
                      ? finishedScoreBtnCls
                      : 'border-transparent bg-softball-red-600 text-white hover:bg-softball-red-700 shadow-softball-red-600/20'
                  }`}
                  title={activeGameFinished ? 'Beendet — Spielbogen & Statistiken ansehen' : 'Live scoren'}
                >
                  {activeGameFinished ? (
                    <>
                      <CheckCircle size={15} />
                      <span>{finishedScoreBtnLabel}</span>
                    </>
                  ) : (
                    <>
                      <BallIcon size={15} />
                      <span>Live scoren</span>
                    </>
                  )}
                </Link>
              )}
              <PollSyncToolbarButton variant="desktop" pollStatus={pollStatus} onClick={() => setShowPollSync(true)} />
            </div>
            {/* Toolbar-Strip: Tertiary-Aktionen (Icon + Label) */}
            <div className="flex items-center gap-1 border-t border-cream-200 pt-1.5 xl:order-first xl:border-t-0 xl:pt-0 xl:border-r xl:pr-3">
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
                onClick={handleExportLineupField}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Aufstellung als PDF exportieren"
              >
                <ExportDoc size={14} />
                <span>Aufstellung</span>
              </button>
              <button
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Als PDF exportieren"
              >
                <ExportDoc size={14} />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportSignatures}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Anwesenheitsliste (Unterschriften) als PDF"
              >
                <UsersIcon size={14} />
                <span>Liste</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <>
      {/* Tabs — mobil sticky unter dem App-Header (h=59px), damit der Spiel-Wechsler
          beim Lineup-Scrollen immer erreichbar bleibt (sonst nur fummeliger Swipe).
          Desktop: normaler Fluss. */}
      {/* Ab xl sitzt die Spiel-Leiste direkt unter dem Titel in derselben Karte —
          zwei fast leere Bänder über dem Grid waren auf dem Desktop reine Höhe. */}
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm px-2 sm:px-4 pt-2 xl:pt-0 sticky top-[59px] z-40 lg:static lg:top-auto lg:z-auto xl:-mt-4 xl:rounded-t-none xl:border-t-0 xl:px-5">
      <GameTabs
        games={gameDay.games}
        activeIndex={activeTab}
        seasonId={gameDay.seasonId}
        onSelect={(i) => setActiveTab(i)}
        rightSlot={availablePlayers.length > 0 && gameDay.games.length > 0 ? (
          <LineupSetBar
            sets={lineupSets.sets}
            activeSetId={activeSetId}
            onApply={handleApplySet}
            onSaveNew={() => setSaveSetOpen(true)}
            onOverwrite={s => setOverwriteSet(s)}
            onRename={s => setRenameSet(s)}
            onDelete={s => setDeleteSet(s)}
          />
        ) : undefined}
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
        onSwapped={async (updatedGames) => {
          lineup.invalidateCache()
          setGameDay(gd => gd ? {
            ...gd,
            games: gd.games.map(g => updatedGames.find(u => u.id === g.id) ?? g),
          } : gd)
          if (activeGame) {
            lineup.load(activeGame.id)
            staff.load(activeGame.id)
          }
          await refreshStats()
        }}
      />
      </div>

      {availablePlayers.length === 0 ? (
        <EmptyState
          dashed
          icon={<CrossBones size={48} />}
          title="Noch keine Spieler für diesen Spieltag ausgewählt."
          description="Wähle zuerst aus, wer am Spieltag dabei ist."
          action={(
            <Button
              variant="primary"
              onClick={() => setShowPlayersModal(true)}
              className="px-5 py-3 text-sm font-semibold rounded-xl shadow-lg shadow-softball-red-600/20"
            >
              Spieler auswählen
            </Button>
          )}
        />
      ) : (
        <>
          {/* Lineup ↔ Feld Umschalter — unter 1440px teilen sich Bogen und Feld denselben
              Platz. Darüber stehen beide nebeneinander, der Umschalter entfällt. */}
          <div className="flex bg-cream-100 border border-cream-300 rounded-lg p-0.5 lg:max-w-md wide:hidden">
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

          {/*
            Werkbank-Layout. Jedes Panel liegt GENAU EINMAL im DOM — vorher lagen
            Lineup/Auswechslungen doppelt und Coaches/Bank dreifach da (je ein
            xl:hidden- und ein hidden-xl:block-Zweig), was zwei parallele
            DndContexts und drei Coach-Formulare bedeutete. Die Spalte wechselt
            jetzt nur noch per `order`:
              mobil   Bogen → Spieler → Coaches/Bank   (unverändert)
              lg      Bogen | Spieler | Coaches+Bank
              wide    Bogen | Feld | Coaches+Bank | Spieler  (ab 1440px)
            Bogen und Feld teilen darunter denselben Platz (eines ist display:none,
            fällt damit aus dem Grid) — ab 1440px stehen sie nebeneinander.
          */}
          <div
            className="grid gap-4 lg:gap-5 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] wide:grid-cols-[minmax(380px,1.05fr)_minmax(400px,1.35fr)_minmax(240px,0.72fr)_minmax(290px,0.88fr)] items-start"
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
          >
            {/* Bogen — Schlagreihenfolge + Auswechslungen */}
            <div className={`planner-pane space-y-4 xl:space-y-2.5 order-1 ${mobileView === 'lineup' ? '' : 'hidden'} wide:block`}>
              <LineupEditor
                ruleWarnings={ruleCheck?.warnings}
                entries={lineup.entries}
                poolPlayers={poolPlayers}
                onRemove={handleRemovePlayer}
                onSetPosition={lineup.setPosition}
                onSetDhBatter={handleSetDhBatter}
                onMoveUp={lineup.moveUp}
                onMoveDown={lineup.moveDown}
                onReorder={lineup.reorder}
                onSwapWithPool={handleSwapWithPool}
                onSwapWithLineup={handleSwapWithLineup}
                onFillSlot={lineup.fillEmptySlot}
                onClear={() => setShowClearConfirm(true)}
                onAutoGenerate={triggerAutoGenerate}
                autoGenerateLoading={autoSingleLoading}
                onCopyOtherGame={seasonGameDays.some(gd => gd.games.some(g => g.id !== activeGame?.id)) && availablePlayers.length >= 2 ? () => setShowCopyLineup(true) : undefined}
                firstBaseCoachRotation={activeGame?.firstBaseCoachRotation}
                thirdBaseCoachRotation={activeGame?.thirdBaseCoachRotation}
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
                hasChanges={anyUnsaved}
                saving={lineup.saving}
                onSave={handleSave}
                onCancel={lineup.revert}
                className="lg:block hidden"
              />
            </div>

            {/* Feld — unter xl im Wechsel mit dem Bogen, ab xl die eigene Bühne */}
            <div className={`planner-pane order-1 wide:sticky wide:top-4 wide:self-start ${mobileView === 'field' ? '' : 'hidden'} wide:block`}>
              <FieldView
                entries={lineup.entries}
                onPositionClick={setAssignPosition}
              />
            </div>

            {/* Coaches + Bank */}
            <div className="space-y-4 xl:space-y-2.5 order-3 wide:order-3">
              <CoachSlots
                staff={staff.staff}
                availablePlayers={availablePlayers.filter(p => !battingLineupIds.has(p.id) && !dhBatterIds.has(p.id))}
                onSave={handleStaffSave}
                lineup={coachRotationLineup}
                game={activeGame!}
                loading={!staff.loaded}
                onSaveRotation={handleRotationSave}
              />
              <BenchDisplay players={benchPlayers} />
            </div>

            {/* Spieler-Leiste — Pool/Übersicht + Trainingsteilnahme */}
            <div className="space-y-4 xl:space-y-2.5 order-2 wide:order-4">
              <PlayerPool
                allAvailablePlayers={availablePlayers}
                lineupPlayerIds={lineupUsedIds}
                stats={adjustedStats}
                battingStatsSeason={seasonBattingStats}
                battingStatsYear={yearBattingStats}
                seasonYear={season?.year ?? null}
                gameDayDate={gameDay.date}
                opponentTeamName={activeGame?.opponentTeam?.name ?? null}
                opponentBatting={opponentBatting}
                onAdd={handleAddPlayer}
              />
              {/* Trainingsteilnahme sitzt bei der Spieler-Leiste — beide beantworten
                  dieselbe Frage: wen stelle ich auf. Unter lg ausgeblendet, dort
                  liegt sie als Tab im Spieler-Panel. */}
              <div className="hidden lg:block">
                <TrainingAttendancePanel
                  stats={trainingStats}
                  availablePlayers={availablePlayers}
                  excludedWeekdays={excludedTrainingWeekdays}
                  onToggleWeekday={toggleTrainingWeekday}
                />
              </div>
            </div>
          </div>

          {/* Mobile: Sticky Save Button */}
          <SaveButton
            hasChanges={anyUnsaved}
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

      {showPollSync && (
        <PollVoteSyncSheet
          target={{ type: 'GAME_DAY', id: gameDay.id }}
          players={players}
          onPlayerCreated={reloadPlayers}
          onApplied={async () => {
            const updated = await api.getGameDay(gameDay.id)
            setGameDay(updated)
            // Backend hat die Anwesenheit bereits geschrieben (inkl. Kaskade) — lokales
            // Lineup/Staff muss denselben Nachlauf wie beim manuellen Anwesend-Modal fahren,
            // sonst zeigt das Grid Spieler weiter an, die die Umfrage-Übernahme entfernt hat.
            await syncAfterAvailabilityChange(updated.availablePlayers.map(p => p.id))
            setPollStatus(await api.getGameDayPollVotes(gameDay.id).catch(() => null))
          }}
          onClose={() => setShowPollSync(false)}
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

      <SaveSetModal
        open={saveSetOpen}
        title="Als Set speichern"
        onCancel={() => setSaveSetOpen(false)}
        onConfirm={handleSaveSet}
      />
      <SaveSetModal
        open={renameSet !== null}
        title="Set umbenennen"
        initialName={renameSet?.name ?? ''}
        onCancel={() => setRenameSet(null)}
        onConfirm={handleRenameSet}
      />
      {deleteSet && (
        <ConfirmModal
          title="Set löschen"
          message={`Set „${deleteSet.name}" wirklich löschen?`}
          confirmLabel="Löschen"
          onConfirm={handleDeleteSet}
          onCancel={() => setDeleteSet(null)}
        />
      )}
      {overwriteSet && (
        <ConfirmModal
          title="Set überschreiben"
          message={`Set „${overwriteSet.name}" mit dem aktuellen Stand des Spieltags überschreiben? Der bisherige Inhalt des Sets ist danach weg.`}
          confirmLabel="Ja, überschreiben"
          onConfirm={handleOverwriteSet}
          onCancel={() => setOverwriteSet(null)}
        />
      )}
      {pendingApplySet && (
        <ConfirmModal
          title="Set anwenden?"
          message="Verfügbare Spieler, Lineups und Base-Coaches des ganzen Spieltags werden mit dem Set überschrieben."
          confirmLabel="Ja, anwenden"
          onConfirm={() => { doApplySet(pendingApplySet); setPendingApplySet(null) }}
          onCancel={() => setPendingApplySet(null)}
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
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
