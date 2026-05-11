import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import { useScoring } from '@/hooks/useScoring'
import { useToastContext } from '@/components/layout/Layout'
import { ChevronLeft, ClipboardListIcon, SubstitutionIcon, BoltIcon, TrophyIcon } from '@/icons'
import { Flag, RotateCcw, Undo2, SquarePen, Zap, X as XIcon, Footprints, BarChart3 } from 'lucide-react'
import { DiamondView } from './DiamondView'
import { ActionButtons } from './ActionButtons'
import { CorrectionSheet } from './CorrectionSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import * as api from '@/api/client'
import type { AtBatResult, BaseStateDto, GameDayResponse, LineupEntryResponse, Player, RunnerOnBase, SubstitutionResponse } from '@/types'

export function ScoringPage() {
  const { id: gameDayIdParam, gameIndex: gameIndexParam } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()

  const gameDayId = gameDayIdParam ? Number(gameDayIdParam) : null
  const gameIndex = gameIndexParam ? Number(gameIndexParam) : 0

  const [gameDay, setGameDay] = useState<GameDayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [stealingRunner, setStealingRunner] = useState<RunnerOnBase | null>(null)
  const [lineup, setLineup] = useState<LineupEntryResponse[]>([])
  const [substitutions, setSubstitutions] = useState<SubstitutionResponse[]>([])
  const [showLineupSheet, setShowLineupSheet] = useState(false)
  const [showSubSheet, setShowSubSheet] = useState(false)
  const [subPlayerOut, setSubPlayerOut] = useState<Player | null>(null)
  const [subPlayerIn, setSubPlayerIn] = useState<Player | null>(null)
  // Inning-Override: wenn 3 Outs erreicht + User wechselt Inning, zeigen wir
  // frisches Inning mit leeren Bases bis der erste AtBat des neuen Innings passiert.
  const [inningOverride, setInningOverride] = useState<number | null>(null)
  // Extra-Outs pro Inning (für Double-Play o.Ä.): lokaler Override
  const [extraOuts, setExtraOuts] = useState(0)
  const [showCorrection, setShowCorrection] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [editingScoreThem, setEditingScoreThem] = useState(false)
  const [scoreThemInput, setScoreThemInput] = useState('')
  const [opponentRunsThisInning, setOpponentRunsThisInning] = useState('')
  // Animations halten jetzt den Spielernamen — sonst zeigt der Reload schon den nächsten Batter
  const [homerunFlash, setHomerunFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  // HR-Runner läuft über alle Bases. State hält name + battingOrder damit
  // der Runner auf dem Diamond animiert werden kann.
  const [homerunRunner, setHomerunRunner] = useState<{ playerId: number; playerName: string; battingOrder: number | null } | null>(null)
  const [hbpFlash, setHbpFlash] = useState<string | null>(null)
  const [walkFlash, setWalkFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  const [errorFlash, setErrorFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  const [strikeoutFlash, setStrikeoutFlash] = useState<string | null>(null)
  const [overthrowFlash, setOverthrowFlash] = useState<string | null>(null)
  const [stealFlash, setStealFlash] = useState<{ runner: string; type: 'BASE' | 'HOME' | 'CAUGHT'; toBase: number } | null>(null)
  // Runner die gerade Home erreicht haben (Array von Namen) — feiert Run-Scoring
  const [scoredFlash, setScoredFlash] = useState<{ runners: string[]; hitLabel: string | null } | null>(null)
  const [manualGameOver, setManualGameOver] = useState(false)
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false)
  // Wer ist bei dem letzten AtBat nach Home gelaufen (für Korrektur-Sheet)
  const [recentlyScored, setRecentlyScored] = useState<{ playerId: number; playerName: string }[]>([])
  // Top (Gegner schlägt zuerst) / Bottom (wir schlagen zuerst). Pro Spiel in localStorage.
  const [battingSide, setBattingSide] = useState<'top' | 'bottom' | null>(null)
  const [showSidePrompt, setShowSidePrompt] = useState(false)

  useEffect(() => {
    if (gameDayId == null) return
    api.getGameDay(gameDayId)
      .then(gd => {
        setGameDay(gd)
        // Saison-Kontext persistieren — wenn User Logo→Dashboard klickt, bleibt richtige Saison aktiv
        if (gd?.seasonId) localStorage.setItem('dashboard-season-id', String(gd.seasonId))
      })
      .catch((e: Error) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [gameDayId, toast])

  const currentGame = gameDay?.games[gameIndex] ?? null
  const opponentName = currentGame?.opponentTeam?.name ?? 'Gegner'

  const { atBats, stealingEvents, scoreboard, reload, recordAtBat, undo, recordStealingEvent } = useScoring(currentGame?.id ?? null)

  // Lineup laden für Batter-Preview (nächste 2-3 + Full-Lineup-Sheet)
  useEffect(() => {
    if (!currentGame?.id) return
    api.getLineup(currentGame.id).then(setLineup).catch(() => setLineup([]))
    api.getSubstitutions(currentGame.id).then(setSubstitutions).catch(() => setSubstitutions([]))
  }, [currentGame?.id])

  /**
   * Effektiver Spieler für einen Lineup-Slot unter Berücksichtigung von:
   *   - DH-Batter (wenn gesetzt)
   *   - Substitutions (Kaskade A→B→C)
   * Analog zur Backend-Logik in GameScoringService.resolveBatterForEntry.
   */
  const effectivePlayerForEntry = (entry: LineupEntryResponse): Player => {
    let current: Player = entry.dhBatterPlayer ?? entry.player
    const sortedSubs = [...substitutions].sort((a, b) =>
      a.inning !== b.inning ? a.inning - b.inning : a.id - b.id
    )
    for (const s of sortedSubs) {
      if (s.playerOut.id === current.id) current = s.playerIn
    }
    return current
  }

  // Effektive Anzeige-Werte: Wenn User "Nächstes Inning" getappt hat, zeigen wir
  // neues Inning + leere Bases bis der erste AtBat dieses Innings kommt.
  const serverInning = scoreboard?.currentInning ?? 1
  const displayInning = inningOverride ?? serverInning
  const inningTransition = inningOverride != null && serverInning < inningOverride
  const displayOuts = inningTransition ? 0 : (scoreboard?.outsInCurrentInning ?? 0)
  const displayBaseState = inningTransition ? { first: null, second: null, third: null } : (scoreboard?.baseState ?? { first: null, second: null, third: null })
  const displayRunners = inningTransition ? [] : (scoreboard?.runners ?? [])
  const halfInningOver = !inningTransition && displayOuts >= 3
  const currentInning = displayInning
  const REGULATION_INNINGS = 7
  // Unentschieden → Extra-Innings erlaubt. Game-Over nur wenn manuell ODER
  // (Regulation-Inning Ende UND nicht unentschieden)
  const regulationOver = halfInningOver && displayInning >= REGULATION_INNINGS
  const isTied = (scoreboard?.scoreUs ?? 0) === (scoreboard?.scoreThem ?? 0)
  const extraInningsNeeded = regulationOver && isTied
  const gameOver = manualGameOver || (regulationOver && !isTied)

  // inningOverride zurücksetzen sobald Server in das neue Inning nachgezogen hat
  useEffect(() => {
    if (inningOverride != null && serverInning >= inningOverride) {
      setInningOverride(null)
    }
  }, [serverInning, inningOverride])

  // extraOuts zurücksetzen bei Inning-Wechsel
  useEffect(() => {
    if (inningTransition) setExtraOuts(0)
  }, [inningTransition])

  // Batting-Side + Game-Over kommen ausschließlich vom Backend.
  // Inning-Override ist transient (in-memory) — Reload landet sauber bei Server-Inning.
  useEffect(() => {
    if (currentGame == null) return
    if (currentGame.battingSide === 'top' || currentGame.battingSide === 'bottom') {
      setBattingSide(currentGame.battingSide)
    } else if (atBats.length === 0 && scoreboard) {
      setShowSidePrompt(true)
    }
    setManualGameOver(currentGame.endedAt != null)
  }, [currentGame, atBats.length, scoreboard])

  const pickSide = async (side: 'top' | 'bottom') => {
    if (!currentGame) return
    setBattingSide(side)
    setShowSidePrompt(false)
    try {
      const updated = await api.setBattingSide(currentGame.id, side)
      // Local gameDay aktualisieren, damit Re-Render konsistent bleibt
      setGameDay(prev => prev ? {
        ...prev,
        games: prev.games.map(g => g.id === currentGame.id ? { ...g, battingSide: updated.battingSide } : g),
      } : prev)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleRecord = async (result: AtBatResult) => {
    if (!scoreboard || !scoreboard.currentBatterId) {
      toast.show('Kein Schlagmann gesetzt — bitte Lineup erstellen', 'error')
      return
    }
    setSubmitting(true)
    // Name des aktuellen Batters merken BEVOR reload passiert
    const batterNameSnapshot = scoreboard.currentBatterName ?? 'Batter'
    try {
      const nextState = advanceBases(displayBaseState, result, scoreboard.currentBatterId)
      const runsScored = countScored(displayBaseState, nextState, result, scoreboard.currentBatterId)
      // Ermittle Runner die durch diesen AtBat gescort haben (für Korrigieren-Sheet).
      // displayRunners statt scoreboard.runners: scoreboard hat stale state aus
      // vorherigem Inning bis erster AtBat im neuen Inning kommt — würde sonst
      // beim ersten Out im neuen Inning fälschlich +N Runs anzeigen.
      const newRunnerIds = new Set([nextState.first, nextState.second, nextState.third].filter(Boolean) as number[])
      const scoredPlayers = displayRunners
        .filter(r => !newRunnerIds.has(r.playerId))
        .map(r => ({ playerId: r.playerId, playerName: r.playerName }))
      // Homerun-Batter auch als "gescort" markieren (falls HR) damit er in Korrektur auftaucht
      if (result === 'HOMERUN' && scoreboard.currentBatterName) {
        scoredPlayers.push({
          playerId: scoreboard.currentBatterId,
          playerName: scoreboard.currentBatterName,
        })
      }
      // Erst Server-Call, danach lokalen State setzen — so bleibt bei Fehler
      // nichts inkonsistent.
      await recordAtBat({
        batterId: scoreboard.currentBatterId,
        result,
        inning: currentInning,
        baseStateAfter: nextState,
        runsScored,
        rbi: runsScored, // V1: RBI = Runs Scored (Vereinfachung)
      })
      setRecentlyScored(scoredPlayers)
      // Reduced-Motion: User-Setting respektieren — keine Vollbild-Flashes
      const reducedMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (result === 'HOMERUN') {
        if (!reducedMotion) {
          setHomerunFlash({ batter: batterNameSnapshot, runsScored })
          setTimeout(() => setHomerunFlash(null), 2200)
          setHomerunRunner({
            playerId: scoreboard.currentBatterId,
            playerName: batterNameSnapshot,
            battingOrder: scoreboard.currentBatterOrder ?? null,
          })
          setTimeout(() => setHomerunRunner(null), 1600)
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !reducedMotion) {
          try { navigator.vibrate([80, 60, 80, 60, 200]) } catch { /* vibrate not supported */ }
        }
      } else if (result === 'HIT_BY_PITCH') {
        if (!reducedMotion) {
          setHbpFlash(batterNameSnapshot)
          setTimeout(() => setHbpFlash(null), 1500)
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !reducedMotion) {
          try { navigator.vibrate([30, 30, 30]) } catch { /* vibrate not supported */ }
        }
      } else if (result === 'WALK') {
        if (!reducedMotion) {
          setWalkFlash({ batter: batterNameSnapshot, runsScored })
          setTimeout(() => setWalkFlash(null), 1700)
        }
      } else if (result === 'REACHED_ON_ERROR') {
        if (!reducedMotion) {
          setErrorFlash({ batter: batterNameSnapshot, runsScored })
          setTimeout(() => setErrorFlash(null), 1700)
        }
      } else if (result === 'STRIKEOUT') {
        if (!reducedMotion) {
          setStrikeoutFlash(batterNameSnapshot)
          setTimeout(() => setStrikeoutFlash(null), 1600)
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !reducedMotion) {
          try { navigator.vibrate([40, 40, 80]) } catch { /* vibrate not supported */ }
        }
      }

      const hadRunners = displayRunners.length > 0
      const isHit = result === 'SINGLE' || result === 'DOUBLE' || result === 'TRIPLE'
      const hitLabel = result === 'SINGLE' ? 'Single' : result === 'DOUBLE' ? 'Double' : result === 'TRIPLE' ? 'Triple' : null

      // Einheitliche Score/Anpassen-Pille — eine Pille für alle Hit/Run-Cases
      // (HR, HBP, WALK haben eigene Vollbild-/Pill-Animationen)
      if (result !== 'HOMERUN' && result !== 'HIT_BY_PITCH' && result !== 'WALK' && result !== 'REACHED_ON_ERROR') {
        const showRuns = scoredPlayers.length > 0
        const showHitPrompt = isHit && hadRunners
        if (showRuns || showHitPrompt) {
          setScoredFlash({
            runners: scoredPlayers.map(p => p.playerName),
            hitLabel: showHitPrompt ? hitLabel : null,
          })
          setTimeout(() => setScoredFlash(null), 2200)
        }
      }

      // Auto-Open Korrektur-Sheet:
      //   - OUT + Runner → Force-Play/Tag-up Entscheidung (advanceBases lässt
      //     State unchanged, User muss aktiv cyclen).
      //   - SINGLE/DOUBLE/TRIPLE + Runner → Bestätigung der Advance.
      //     SINGLE: 1B könnte 2B/3B, 2B könnte 3B/Home.
      //     DOUBLE: 1B könnte 3B/Home.
      //     TRIPLE: alle scoren default — Sheet als Sicherheit (Runner an Home thrown-out).
      //
      // Nicht bei HOMERUN: alle scoren per Definition (Ball über Zaun).
      // Nicht bei WALK/HBP: Force eindeutig.
      // Auch bei 3. Out öffnen: Force-Out-3rd-Out-Regel (Run zählt nicht) muss
      // user-bestätigt werden via CorrectionSheet-Banner (outsAfter===3).
      if (result === 'OUT' && hadRunners) {
        setShowCorrection(true)
      } else if ((result === 'SINGLE' || result === 'DOUBLE' || result === 'TRIPLE') && hadRunners) {
        setShowCorrection(true)
      } else if (result === 'REACHED_ON_ERROR' && hadRunners) {
        setShowCorrection(true)
      }
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextInning = async () => {
    // Optional: Gegner-Runs in diesem Inning addieren
    if (currentGame && opponentRunsThisInning.trim() !== '') {
      const addRuns = Number(opponentRunsThisInning)
      if (!Number.isNaN(addRuns) && addRuns >= 0) {
        const newScoreThem = (scoreThem ?? 0) + addRuns
        try {
          await api.setGameScore(currentGame.id, scoreUs, newScoreThem)
        } catch (e) {
          toast.show((e as Error).message, 'error')
        }
      }
    }
    setOpponentRunsThisInning('')
    setInningOverride(displayInning + 1)
    toast.show(`Inning ${displayInning + 1} · Bases frei`, 'success')
    await reload()
  }

  const saveScoreThem = async () => {
    if (!currentGame) return
    const parsed = scoreThemInput.trim() === '' ? null : Number(scoreThemInput)
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.show('Ungültige Zahl', 'error')
      setEditingScoreThem(false)
      return
    }
    try {
      await api.setGameScore(currentGame.id, scoreUs, parsed ?? 0)
      await reload()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setEditingScoreThem(false)
    }
  }

  const handleUndo = async () => {
    if (atBats.length === 0 && stealingEvents.length === 0 && substitutions.length === 0) return
    setSubmitting(true)
    try {
      const result = await undo()
      const message =
        result.type === 'AT_BAT' ? 'Letzter At-Bat rückgängig gemacht' :
        result.type === 'STEALING' ? 'Letztes Stealing-Event rückgängig gemacht' :
        result.type === 'SUBSTITUTION' ? 'Letzte Substitution rückgängig gemacht' :
        'Nichts zum Rückgängigmachen'
      toast.show(message, result.type === 'NONE' ? 'error' : 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Overthrow / Dead Ball / Wild Throw: alle Runner rücken eine Base weiter.
   * 3B → Home (scort), 2B → 3B, 1B → 2B. Direkt angewendet ohne Zwischensheet —
   * es gibt keine Varianten bei einem Overthrow.
   * Backend: letztes AtBat wird aktualisiert mit neuem BaseState + erhöhten Runs.
   */
  /**
   * Mid-Game-Sub bestätigen: API-Call + Reload von lineup/subs/scoreboard.
   */
  const handleConfirmSub = async () => {
    if (!currentGame || !subPlayerOut || !subPlayerIn) return
    setSubmitting(true)
    try {
      await api.addSubstitution(currentGame.id, {
        playerOutId: subPlayerOut.id,
        playerInId: subPlayerIn.id,
        inning: currentInning,
      })
      const [newSubs] = await Promise.all([
        api.getSubstitutions(currentGame.id),
        reload(),
      ])
      setSubstitutions(newSubs)
      toast.show(`${subPlayerOut.name} → ${subPlayerIn.name} eingewechselt`, 'success')
      setShowSubSheet(false)
      setSubPlayerOut(null)
      setSubPlayerIn(null)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOverthrow = async () => {
    if (!currentGame || atBats.length === 0) return
    const lastAtBat = atBats[atBats.length - 1]
    // Runner +1 berechnen
    const current = displayBaseState
    let extraRuns = 0
    const next: BaseStateDto = { first: null, second: null, third: null }
    if (current.third != null) extraRuns += 1 // 3B → Home
    if (current.second != null) next.third = current.second // 2B → 3B
    if (current.first != null) next.second = current.first // 1B → 2B

    if (extraRuns === 0 && next.second == null && next.third == null) {
      toast.show('Keine Runner zum Verschieben', 'error')
      return
    }

    setSubmitting(true)
    try {
      const newRuns = Math.max(0, (lastAtBat.runsScored ?? 0) + extraRuns)
      await api.updateLastBaseState(currentGame.id, {
        first: next.first,
        second: next.second,
        third: next.third,
        runsScored: newRuns,
        rbi: lastAtBat.rbi ?? 0, // RBI bleibt unverändert — Overthrow gibt keine RBI an Batter
      })
      await reload()
      const advanced = (current.first != null ? 1 : 0) + (current.second != null ? 1 : 0) + (current.third != null ? 1 : 0)
      const label = extraRuns > 0
        ? `${advanced} Runner +1 · ${extraRuns} Run${extraRuns > 1 ? 's' : ''}`
        : `${advanced} Runner +1 Base`
      setOverthrowFlash(label)
      setTimeout(() => setOverthrowFlash(null), 1600)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunnerTap = (_base: 1 | 2 | 3, runner: RunnerOnBase) => {
    setStealingRunner(runner)
  }

  const handleStealing = async (type: 'STOLEN_BASE' | 'CAUGHT_STEALING') => {
    if (!stealingRunner) return
    const runnerName = stealingRunner.playerName
    const fromBase = stealingRunner.base
    const toBase = type === 'STOLEN_BASE' ? fromBase + 1 : fromBase
    // Sheet sofort schließen — optimistic UX
    setStealingRunner(null)
    try {
      await recordStealingEvent({
        runnerId: stealingRunner.playerId,
        type,
        inning: currentInning,
      })
      const flashType: 'BASE' | 'HOME' | 'CAUGHT' =
        type === 'CAUGHT_STEALING' ? 'CAUGHT'
          : fromBase === 3 ? 'HOME'
            : 'BASE'
      setStealFlash({ runner: runnerName, type: flashType, toBase })
      setTimeout(() => setStealFlash(null), flashType === 'HOME' ? 2800 : 1700)
      if (flashType === 'HOME' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([60, 40, 60, 40, 150]) } catch { /* vibrate not supported */ }
      }
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-48 h-1.5 bg-cream-300 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-navy-800 rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
      </div>
    )
  }

  if (!gameDay || !currentGame) {
    return (
      <div className="py-20 text-center text-gray-500">
        Spiel nicht gefunden.
        <div className="mt-4">
          <Link to="/" className="text-softball-red-600 hover:underline">Zurück zum Dashboard</Link>
        </div>
      </div>
    )
  }

  const scoreUs = scoreboard?.scoreUs ?? 0
  const scoreThem = scoreboard?.scoreThem ?? 0
  const totalOuts = Math.min(3, displayOuts + extraOuts)

  const handleReset = async () => {
    if (!currentGame) return
    setShowResetConfirm(false)
    try {
      await api.resetScoring(currentGame.id)
      // Falls Backend `endedAt` gesetzt ist, auch reopen — sonst bleibt Game als FERTIG markiert
      try { await api.reopenGame(currentGame.id) } catch { /* ignore: vor Backend-Deploy */ }
      setInningOverride(null)
      setExtraOuts(0)
      setManualGameOver(false)
      // Cleanup ALLER scoring-localStorage-Keys für dieses Game (auch Override-Geist).
      localStorage.removeItem(`scoring-side-${currentGame.id}`)
      localStorage.removeItem(`scoring-ended-${currentGame.id}`)  // Legacy-Cleanup
      localStorage.removeItem(`scoring-inning-override-${currentGame.id}`)  // Legacy-Cleanup
      setBattingSide(null)
      setShowSidePrompt(true)
      await reload()
      toast.show('Scoring zurückgesetzt · Bases frei', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-dvh bg-cream-100 flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 text-white sticky top-0 z-40 shadow-md">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/"
              className="p-1 hover:bg-navy-700 rounded-lg flex items-center"
              aria-label="Zur Startseite"
              title="Zur Startseite"
            >
              <img src="/deadsox.jpeg" alt="Dead Sox" className="w-7 h-7 rounded" />
            </Link>
            <button
              onClick={() => navigate(`/gameday/${gameDayId}`)}
              className="p-1 hover:bg-navy-700 rounded-lg flex items-center gap-1"
              aria-label="Zurück zum Spieltag"
              title="Zurück zum Spieltag"
            >
              <ChevronLeft size={22} />
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEndGameConfirm(true)}
              disabled={atBats.length === 0 || gameOver}
              className="p-1.5 hover:bg-navy-700 rounded-lg text-white/70 hover:text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
              title="Spiel beenden und Stats zeigen"
              aria-label="Spiel beenden"
            >
              <Flag size={14} /> Beenden
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={atBats.length === 0}
              className="p-1.5 hover:bg-navy-700 rounded-lg text-white/70 hover:text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
              title="Scoring zurücksetzen"
              aria-label="Scoring zurücksetzen"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </header>

      {/* Live-State-Strip — Navy, direkt unter Header (1 Navy-Block oben) */}
      <div className="bg-navy-900 text-white px-4 py-2 flex items-center justify-between border-b-[3px] border-softball-red-600">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white">Inning</span>
          <span className="font-display text-2xl font-extrabold leading-none">{displayInning}</span>
          {battingSide && (
            <button
              onClick={() => setShowSidePrompt(true)}
              className="font-display inline-flex items-center text-[10px] px-2 py-0.5 border border-white/20 rounded-full text-white/85 hover:bg-white/10 hover:text-white cursor-pointer transition-colors tracking-widest uppercase"
              title="Seite ändern (Oben/Unten)"
              aria-label="Seite (Oben/Unten) ändern"
            >
              {battingSide === 'top' ? '↑ Top' : '↓ Btm'}
            </button>
          )}
        </div>
        <button
          onClick={() => setExtraOuts(x => (totalOuts < 3 ? x + 1 : 0))}
          className="flex items-center gap-2 cursor-pointer group"
          title="Tap = +1 Out (Double Play). Bei 3 Aus: Reset."
          aria-label="Outs +1"
        >
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white">Outs</span>
          <span className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${i < totalOuts
                  ? 'bg-softball-red-500 shadow-[0_0_8px_rgba(230,57,70,0.6)]'
                  : 'bg-white/15 border border-white/25'}`}
              />
            ))}
          </span>
        </button>
      </div>

      {/* Score-Band — Cream, kompakt + zentriert (Reference) — direkt nach Navy für klare Trennung */}
      <div className="bg-cream-50 border-b border-cream-300 px-4 py-2.5">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[11px] text-softball-red-700 uppercase font-bold tracking-widest truncate max-w-[80px] sm:max-w-[140px]" title="Dead Sox">Dead Sox</span>
            <span
              className="font-display text-4xl sm:text-5xl font-black text-softball-red-600 tabular-nums leading-none"
              title="Eigene Score wird automatisch aus AtBats gezählt"
            >
              {scoreUs}
            </span>
          </div>
          <span className="font-display text-2xl text-gray-300">—</span>
          <div className="flex items-baseline gap-2">
            {editingScoreThem ? (
              <input
                type="number"
                inputMode="numeric"
                value={scoreThemInput}
                onChange={e => setScoreThemInput(e.target.value)}
                onBlur={saveScoreThem}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveScoreThem()
                  if (e.key === 'Escape') setEditingScoreThem(false)
                }}
                className="font-display w-16 text-4xl sm:text-5xl font-black text-navy-900 tabular-nums border-b-2 border-softball-red-500 outline-none bg-transparent text-center"
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setScoreThemInput(String(scoreThem ?? 0)); setEditingScoreThem(true) }}
                className="font-display text-4xl sm:text-5xl font-black text-navy-900 tabular-nums cursor-pointer hover:text-softball-red-600 transition-colors leading-none"
                title="Gegner-Score tippen um zu editieren"
                aria-label="Gegner-Score editieren"
              >
                {scoreThem ?? 0}
              </button>
            )}
            <span className="font-display text-[11px] text-gray-500 uppercase font-bold tracking-widest truncate max-w-[80px] sm:max-w-[140px]" title={opponentName}>{opponentName}</span>
          </div>
        </div>
      </div>

      {/* Inning-Wechsel Banner / Spiel-Ende */}
      {halfInningOver && !gameOver && (
        <div className="bg-softball-red-50 border-b-2 border-softball-red-200 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-softball-red-900">
                {extraInningsNeeded ? `Unentschieden nach ${displayInning} — Extra Inning!` : '3. Out erreicht!'}
              </div>
              <div className="text-xs text-softball-red-700">
                {extraInningsNeeded ? 'Softball-Tiebreaker: weiter bis zur Entscheidung' : 'Halb-Inning beendet'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs text-softball-red-900 font-medium">
              Runs vom Gegner in diesem Inning:
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={opponentRunsThisInning}
                onChange={e => setOpponentRunsThisInning(e.target.value)}
                placeholder="0"
                className="ml-2 w-16 px-2 py-1 border border-softball-red-300 rounded text-center font-bold text-base text-gray-900 bg-white outline-none focus:border-softball-red-500 focus:ring-2 focus:ring-softball-red-100"
              />
            </label>
          </div>
          <button
            onClick={handleNextInning}
            className="w-full px-4 py-3 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold text-sm cursor-pointer shadow-sm"
          >
            Nächstes Inning starten ▸
          </button>
          <p className="text-[10px] text-softball-red-700/70 text-center">
            Gegner-Runs werden zum Gesamtscore addiert. Leer lassen wenn 0.
          </p>
        </div>
      )}

      {/* Spiel-Ende-Banner */}
      {gameOver && (
        <div className="bg-navy-900 text-white px-4 py-4 space-y-3">
          <div className="text-center">
            <div className="font-display text-2xl font-black uppercase tracking-wider inline-flex items-center gap-2">
              <TrophyIcon size={24} className="text-amber-400" />
              Spiel beendet
            </div>
            <div className="font-display text-sm text-white/80 tracking-wide">
              {(scoreUs ?? 0) > (scoreThem ?? 0) ? 'Wir haben gewonnen!' :
               (scoreUs ?? 0) < (scoreThem ?? 0) ? 'Leider verloren' :
               'Unentschieden'} · Endstand {scoreUs} : {scoreThem ?? 0}
            </div>
          </div>
          {currentGame && gameDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                to={`/stats?scope=game&gameId=${currentGame.id}&view=batting`}
                className="font-display block text-center px-4 py-3 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-extrabold text-xs tracking-widest uppercase cursor-pointer shadow-sm inline-flex items-center justify-center gap-2"
              >
                <BarChart3 size={16} /> Stats dieses Spiels
              </Link>
              <Link
                to={`/stats?scope=season&seasonId=${gameDay.seasonId}&view=batting`}
                className="font-display block text-center px-4 py-3 rounded-lg border border-white/30 text-white hover:bg-white/10 font-extrabold text-xs tracking-widest uppercase cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <BarChart3 size={16} /> Saison-Stats
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Setup-Hinweis — kein Lineup vorhanden, kann nicht scoren */}
      {!gameOver && !halfInningOver && atBats.length === 0 && lineup.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md bg-cream-50 border border-cream-300 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-softball-red-50 border-2 border-softball-red-200 text-softball-red-600">
              <ClipboardListIcon size={28} />
            </div>
            {gameDay.availablePlayers.length === 0 ? (
              <>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 uppercase tracking-wide mb-2">
                  Noch keine Spieler
                </h2>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                  Vor Live-Scoring: Anwesende Spieler markieren + Lineup erstellen. Geh zum Spieltag um zu starten.
                </p>
                <ol className="text-left text-[12px] text-gray-700 space-y-1.5 mb-6 bg-cream-100 border border-cream-200 rounded-lg p-3">
                  <li><span className="font-display font-extrabold text-softball-red-600 mr-1.5">1.</span>Anwesende Spieler auswählen</li>
                  <li><span className="font-display font-extrabold text-softball-red-600 mr-1.5">2.</span>Lineup + Positionen aufstellen</li>
                  <li><span className="font-display font-extrabold text-softball-red-600 mr-1.5">3.</span>Zurück hierher → Live scoren</li>
                </ol>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 uppercase tracking-wide mb-2">
                  Lineup fehlt
                </h2>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                  Spieler stehen, aber Batting-Order + Positionen für dieses Spiel sind noch leer. Lineup im Spieltag aufstellen, dann hierher zurück.
                </p>
              </>
            )}
            <Link
              to={`/gameday/${gameDayId}?game=${gameIndex}`}
              className="font-display inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-softball-red-600 text-white rounded-xl text-xs font-extrabold tracking-widest uppercase hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/20 cursor-pointer"
            >
              <ClipboardListIcon size={14} /> Zum Spieltag
            </Link>
          </div>
        </div>
      )}

      {/* Diamond - kompakter */}
      {(atBats.length > 0 || lineup.length > 0 || gameOver || halfInningOver) && (
      <div className="flex-1 flex flex-col items-center justify-center py-2 px-4 min-h-0">
        <div className="w-full max-w-[360px] sm:max-w-[420px]">
          <DiamondView
            baseState={displayBaseState}
            runners={displayRunners}
            onRunnerTap={halfInningOver ? undefined : handleRunnerTap}
            homerunRunner={homerunRunner}
          />
          {displayRunners.length > 0 && !halfInningOver && (
            <p className="text-[11px] text-gray-500 text-center mt-1">
              <span className="font-bold text-navy-800">Tipp</span> auf Runner für{' '}
              <span className="font-bold text-emerald-700">Stolen Base</span>
              {' / '}
              <span className="font-bold text-softball-red-600">Caught Stealing</span>
            </p>
          )}
        </div>
      </div>
      )}

      {/* Batter Card - flach mit HR-Trenner statt Card-Frame */}
      {(atBats.length > 0 || lineup.length > 0 || gameOver || halfInningOver) && (
      <div className="px-3 py-2 bg-cream-100 border-t border-cream-300">
        {scoreboard?.currentBatterId && !halfInningOver ? (
          <div className="px-1 py-1 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-display shrink-0 text-xl bg-navy-900 text-white font-extrabold tabular-nums w-10 h-10 rounded-lg flex items-center justify-center">
                {scoreboard.currentBatterOrder ?? '?'}
              </span>
              <span className="font-display font-extrabold text-xl sm:text-2xl text-gray-900 uppercase tracking-wider truncate flex-1 min-w-0">
                {scoreboard.currentBatterName}
              </span>
              <span className="font-display shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-softball-red-700 bg-softball-red-50 border border-softball-red-100 px-2 py-1 rounded-full">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-softball-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-softball-red-500" />
                </span>
                <span className="hidden sm:inline">am Schlag</span>
              </span>
              <button
                onClick={() => setShowLineupSheet(true)}
                className="shrink-0 text-navy-700 hover:text-navy-900 p-1 cursor-pointer"
                aria-label="Komplette Aufstellung anzeigen"
                title="Komplette Aufstellung anzeigen"
              >
                <ClipboardListIcon size={20} />
              </button>
            </div>
            {/* On-Deck Preview: nächste 3 Batters */}
            {(() => {
              const sorted = [...lineup].filter(e => e.battingOrder != null).sort((a, b) => a.battingOrder - b.battingOrder)
              if (sorted.length === 0) return null
              const currentIdx = sorted.findIndex(e => effectivePlayerForEntry(e).id === scoreboard.currentBatterId)
              if (currentIdx === -1) return null
              const next = Array.from({ length: 4 }, (_, i) => sorted[(currentIdx + i + 1) % sorted.length])
              return (
                <div className="flex items-center gap-2 pt-1.5 border-t border-cream-200">
                  <span className="font-display text-[9px] tracking-widest uppercase text-gray-500 font-bold">Nächste</span>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {next.map((e, i) => {
                      const p = effectivePlayerForEntry(e)
                      const isUp = i === 0
                      return (
                        <span key={`${e.id}-${i}`} className={`inline-flex items-center gap-1 ${isUp ? '' : 'opacity-60'}`}>
                          {isUp && <span className="text-softball-red-600 font-black">▸</span>}
                          <span className="font-display font-bold text-navy-700 tabular-nums">{e.battingOrder}</span>
                          <span className={`font-medium ${isUp ? 'text-softball-red-700 font-bold' : 'text-gray-700'}`}>{p.name}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : halfInningOver ? (
          <div className="text-xs text-gray-500 text-center py-2">Warte auf Inning-Wechsel</div>
        ) : (
          <div className="text-xs text-gray-500 text-center py-2">Kein Schlagmann — bitte Lineup erstellen</div>
        )}
      </div>
      )}

      {/* Action Buttons — sticky Thumb-Zone */}
      {(atBats.length > 0 || lineup.length > 0 || gameOver || halfInningOver) && (
      <div className="px-3 pt-3 pb-2 bg-cream-100 border-t border-cream-300 sticky bottom-0 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <ActionButtons onRecord={handleRecord} disabled={submitting || !scoreboard?.currentBatterId || halfInningOver} />

        {/* Undo + Korrektur + Overthrow (bei Runnern). Overthrow nur sichtbar
            wenn mind. 1 Runner auf Base — sonst irrelevant. */}
        <div className={`grid gap-2 mt-2 ${displayRunners.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            onClick={handleUndo}
            disabled={(atBats.length === 0 && stealingEvents.length === 0 && substitutions.length === 0) || submitting}
            className="font-display h-11 rounded-xl bg-cream-50 border border-cream-300 hover:bg-white text-gray-700 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Undo2 size={14} /> Rückgängig
          </button>
          <button
            onClick={() => setShowCorrection(true)}
            disabled={submitting}
            className="font-display h-11 rounded-xl bg-cream-50 border border-cream-300 hover:bg-white text-gray-700 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <SquarePen size={14} /> Korrigieren
          </button>
          {displayRunners.length > 0 && (
            <button
              onClick={handleOverthrow}
              disabled={submitting || atBats.length === 0}
              className="font-display h-11 rounded-xl bg-cream-50 border border-cream-300 hover:bg-white hover:border-navy-500 text-navy-800 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              title="Dead Ball / Overthrow: alle Runner rücken eine Base weiter"
            >
              <BoltIcon size={14} />
              Overthrow
            </button>
          )}
        </div>
      </div>
      )}

      {/* Korrektur-Sheet */}
      <CorrectionSheet
        open={showCorrection}
        onClose={() => setShowCorrection(false)}
        baseState={displayBaseState}
        runners={displayRunners}
        recentlyScored={recentlyScored}
        context={
          atBats.length > 0 && (atBats[atBats.length - 1]?.result === 'OUT' || atBats[atBats.length - 1]?.result === 'REACHED_ON_ERROR')
            ? 'post-out'
            : 'manual'
        }
        extraBatter={
          atBats.length > 0 && atBats[atBats.length - 1]?.result === 'REACHED_ON_ERROR'
            ? { playerId: atBats[atBats.length - 1].batterId, playerName: atBats[atBats.length - 1].batterName, defaultBase: 1 }
            : undefined
        }
        outsAfter={scoreboard?.outsInCurrentInning ?? 0}
        onSave={async ({ newState, extraRuns, outsFromRunners, unscoredPlayerIds, context }) => {
          if (atBats.length === 0) {
            toast.show('Noch kein AtBat — kann nicht korrigieren', 'error')
            return
          }
          try {
            const lastAtBat = atBats[atBats.length - 1]
            // neuHome adds, unscored subtracts
            const delta = extraRuns - unscoredPlayerIds.length
            const newRuns = Math.max(0, (lastAtBat.runsScored ?? 0) + delta)
            await api.updateLastBaseState(currentGame.id, {
              first: newState.first,
              second: newState.second,
              third: newState.third,
              runsScored: newRuns,
              rbi: newRuns,
            })
            // Runner-Outs speichern:
            //   post-out → OUT_ON_PLAY (Grounder/Fly-Out-Follow-up, kein CS-Stat)
            //   manual   → CAUGHT_STEALING (manuelle Korrektur eines Steal-Versuchs)
            const outEventType = context === 'post-out' ? 'OUT_ON_PLAY' : 'CAUGHT_STEALING'
            for (const runnerId of outsFromRunners) {
              await api.recordStealingEvent(currentGame.id, {
                runnerId,
                type: outEventType,
                inning: currentInning,
              })
            }
            // Korrektur wurde angewendet, recentlyScored leeren damit nächster Edit nicht doppelt zählt
            setRecentlyScored([])
            await reload()
            toast.show('Korrigiert ✓', 'success')
          } catch (e) {
            toast.show((e as Error).message, 'error')
          }
        }}
      />

      {/* Lineup-Sheet: komplette Batting-Order mit Current + Next-Markern */}
      <Drawer.Root open={showLineupSheet} onOpenChange={(open) => !open && setShowLineupSheet(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[80vh] overflow-y-auto focus:outline-none">
            <Drawer.Title className="sr-only">Batting-Order</Drawer.Title>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="px-4 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Batting-Order</h2>
              <p className="text-[11px] text-gray-500 mb-3">
                Reihenfolge der Schlagspieler. Aktueller Batter markiert.
              </p>
              {(() => {
                const sorted = [...lineup].filter(e => e.battingOrder != null).sort((a, b) => a.battingOrder - b.battingOrder)
                if (sorted.length === 0) return (
                  <p className="text-sm text-gray-500 text-center py-4">Kein Lineup verfügbar.</p>
                )
                const currentIdx = sorted.findIndex(e => effectivePlayerForEntry(e).id === scoreboard?.currentBatterId)
                return (
                  <div className="divide-y divide-gray-100 border border-cream-300 rounded-xl overflow-hidden">
                    {sorted.map((e, i) => {
                      const p = effectivePlayerForEntry(e)
                      const wasSubbedIn = p.id !== (e.dhBatterPlayer?.id ?? e.player.id)
                      const isCurrent = i === currentIdx
                      const isNext = currentIdx !== -1 && i === (currentIdx + 1) % sorted.length
                      return (
                        <div
                          key={e.id}
                          className={`flex items-center gap-3 px-4 py-2.5 ${
                            isCurrent ? 'bg-navy-50' : ''
                          }`}
                        >
                          <span className={`text-xs font-bold w-7 text-center rounded tabular-nums ${
                            isCurrent ? 'bg-navy-900 text-white px-1.5 py-0.5' : 'text-gray-400'
                          }`}>
                            {e.battingOrder}
                          </span>
                          <span className={`flex-1 text-sm truncate ${
                            isCurrent ? 'font-bold text-gray-900' : 'text-gray-700'
                          }`}>
                            {p.name}
                          </span>
                          {wasSubbedIn && (
                            <span className="text-[9px] uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">eingewechselt</span>
                          )}
                          {e.dhBatterPlayer && !wasSubbedIn && (
                            <span className="text-[9px] uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">DH</span>
                          )}
                          {e.position && (
                            <span className="text-[11px] font-mono text-gray-500">{e.position}</span>
                          )}
                          {isCurrent && (
                            <span className="font-display text-[10px] font-bold text-softball-red-700 uppercase tracking-widest inline-flex items-center gap-1">
                              <span className="relative flex w-1.5 h-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-softball-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-softball-red-500" />
                              </span>
                              am Schlag
                            </span>
                          )}
                          {isNext && !isCurrent && (
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">nächster</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => { setShowLineupSheet(false); setShowSubSheet(true) }}
                  className="h-11 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <SubstitutionIcon size={16} />
                  Wechseln
                </button>
                <button
                  onClick={() => setShowLineupSheet(false)}
                  className="h-11 rounded-lg border border-cream-300 text-gray-700 font-medium hover:bg-cream-100 cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Sub-Sheet: Mid-Game-Wechsel */}
      <Drawer.Root open={showSubSheet} onOpenChange={(open) => { if (!open) { setShowSubSheet(false); setSubPlayerOut(null); setSubPlayerIn(null) } }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
            <Drawer.Title className="sr-only">Spieler wechseln</Drawer.Title>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="px-4 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Spieler wechseln</h2>
              <p className="text-[11px] text-gray-500 mb-4">
                Aktives Inning: {currentInning}. Wechsel wird ab diesem Inning wirksam.
              </p>
              {(() => {
                // Aktive Spieler = effective players aus Lineup
                const activePlayers = [...lineup]
                  .filter(e => e.battingOrder != null)
                  .sort((a, b) => a.battingOrder - b.battingOrder)
                  .map(e => effectivePlayerForEntry(e))
                const activeIds = new Set(activePlayers.map(p => p.id))
                // Bench = available nicht aktiv
                const benchPlayers = gameDay.availablePlayers.filter(p => !activeIds.has(p.id))
                return (
                  <div className="space-y-4">
                    {/* Wer geht raus */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Raus{subPlayerOut ? '' : ' — wen ersetzen?'}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {activePlayers.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSubPlayerOut(p)}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                              subPlayerOut?.id === p.id
                                ? 'bg-softball-red-600 text-white border-2 border-softball-red-700'
                                : 'border border-cream-300 text-gray-700 hover:border-softball-red-400 hover:bg-softball-red-50'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Wer kommt rein */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Rein{subPlayerIn ? '' : ' — wer ersetzt?'}
                      </div>
                      {benchPlayers.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">Keine Bench-Spieler verfügbar.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {benchPlayers.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setSubPlayerIn(p)}
                              className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors ${
                                subPlayerIn?.id === p.id
                                  ? 'bg-emerald-600 text-white border-2 border-emerald-700'
                                  : 'border border-cream-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                              }`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    {subPlayerOut && subPlayerIn && (
                      <div className="bg-navy-50 border border-navy-200 rounded-lg p-3 text-sm text-navy-800">
                        <span className="font-semibold">{subPlayerOut.name}</span> geht raus,{' '}
                        <span className="font-semibold">{subPlayerIn.name}</span> kommt rein (Inning {currentInning}).
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-2 mt-5">
                <button
                  onClick={() => { setShowSubSheet(false); setSubPlayerOut(null); setSubPlayerIn(null) }}
                  className="h-11 rounded-lg border border-cream-300 text-gray-700 font-medium hover:bg-cream-100 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmSub}
                  disabled={!subPlayerOut || !subPlayerIn || submitting}
                  className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Wechseln…' : '✓ Bestätigen'}
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Stealing Sheet */}
      <Drawer.Root open={stealingRunner !== null} onOpenChange={(open) => !open && setStealingRunner(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[70vh] focus:outline-none">
            <Drawer.Title className="sr-only">Base Running</Drawer.Title>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="px-4 pt-4 pb-6 space-y-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
              {stealingRunner && (
                <>
                  <h2 className="text-lg font-bold text-gray-900 text-center">
                    {stealingRunner.playerName} auf {stealingRunner.base}B
                  </h2>
                  <p className="text-xs text-gray-500 text-center">
                    Was ist zwischen den Pitches passiert?
                  </p>
                  <button
                    onClick={() => handleStealing('STOLEN_BASE')}
                    className="font-display w-full h-20 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-base tracking-widest uppercase cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span className="inline-flex items-center gap-2"><Zap size={18} /> Stolen Base</span>
                    <span className="font-body text-xs font-normal opacity-90 tracking-normal normal-case">
                      Läuft zur nächsten Base · Runner bewegt sich
                    </span>
                  </button>
                  <button
                    onClick={() => handleStealing('CAUGHT_STEALING')}
                    className="font-display w-full h-20 rounded-xl bg-softball-red-600 hover:bg-softball-red-700 active:bg-softball-red-800 text-white font-extrabold text-base tracking-widest uppercase cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span className="inline-flex items-center gap-2"><XIcon size={18} /> Caught Stealing</span>
                    <span className="font-body text-xs font-normal opacity-90 tracking-normal normal-case">
                      Beim Klauen gefangen · Runner ist AUS (+1 Out)
                    </span>
                  </button>
                  <button
                    onClick={() => setStealingRunner(null)}
                    className="w-full h-11 rounded-xl border border-cream-300 text-gray-600 font-medium cursor-pointer"
                  >
                    Abbrechen
                  </button>
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Homerun — Power-Smash mit Type-Label nach Runs */}
      <AnimatePresence>
        {homerunFlash && (() => {
          const runs = homerunFlash.runsScored
          const isGrandSlam = runs >= 4
          const typeLabel = runs === 1 ? 'SOLO HR' : runs === 2 ? '2-RUN HR' : runs === 3 ? '3-RUN HR' : 'GRAND SLAM'
          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: [0, -16, 14, -12, 10, -6, 4, -2, 0],
              y: [0, 8, -5, 6, -4, 3, -2, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/95"
          >
            {/* Power-Flash: gold→red radial */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.3, 0] }}
              transition={{ duration: 0.5, times: [0, 0.1, 0.4, 1] }}
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 50% 50%, #FFD93D 0%, rgba(204,41,54,0.55) 22%, transparent 55%)' }}
            />

            {/* 3 expanding impact-rings from CENTER */}
            {[0, 0.1, 0.22].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute w-40 h-40 rounded-full border-[6px] border-softball-red-600"
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: [0, 6], opacity: [0.9, 0] }}
                transition={{ duration: 1.0, ease: 'easeOut', delay }}
              />
            ))}

            {/* Sun-burst rays from center */}
            <svg
              className="absolute pointer-events-none"
              width="900"
              height="900"
              viewBox="-300 -300 600 600"
            >
              {[...Array(16)].map((_, i) => {
                const angle = (i * 360) / 16
                const rad = (angle * Math.PI) / 180
                return (
                  <motion.line
                    key={i}
                    x1={Math.cos(rad) * 80}
                    y1={Math.sin(rad) * 80}
                    x2={Math.cos(rad) * 290}
                    y2={Math.sin(rad) * 290}
                    stroke={i % 2 === 0 ? '#CC2936' : '#0A0F5C'}
                    strokeWidth="7"
                    strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: [0, 0.75, 0], pathLength: [0, 1, 1] }}
                    transition={{ duration: 1.0, delay: 0.3 + i * 0.012, ease: 'easeOut' }}
                  />
                )
              })}
            </svg>

            {/* Smash-In Text — HOMERUN! mega + Type-Sticker + Batter */}
            <motion.div
              initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
              animate={{
                scale: [0.2, 1.4, 0.95, 1.05, 1, 1],
                rotate: [-25, 10, -6, 4, -4, -4],
                opacity: 1,
              }}
              exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
              transition={{ duration: 0.6, ease: [0.16, 1.4, 0.3, 1] }}
              className="text-center relative z-10"
            >
              <div
                className="font-display font-black text-softball-red-600 leading-none tracking-tight"
                style={{
                  fontSize: 'clamp(100px, 28vw, 280px)',
                  textShadow: '8px 8px 0 rgba(10,15,92,0.3), -3px -3px 0 rgba(255,251,243,0.7), 0 0 2px rgba(204,41,54,0.5)',
                  WebkitTextStroke: '2.5px var(--color-softball-red-700)',
                }}
              >
                HR<span className="text-navy-900">!</span>
              </div>

              {/* Type-Sticker (rotated) — SOLO / 2-RUN / 3-RUN / GRAND SLAM */}
              <motion.div
                initial={{ scale: 0, rotate: 30 }}
                animate={{ scale: [0, 1.3, 1], rotate: isGrandSlam ? 12 : 8 }}
                transition={{ duration: 0.45, delay: 0.3, ease: 'backOut' }}
                className={`absolute -top-3 -right-2 sm:-right-12 font-display font-black text-base sm:text-2xl px-3 py-1 rounded-md tracking-wider shadow-lg border-2 border-cream-50 ${
                  isGrandSlam
                    ? 'bg-amber-400 text-navy-900'
                    : 'bg-navy-900 text-white'
                }`}
              >
                {typeLabel}
              </motion.div>

              <div className="font-display mt-3 text-xl sm:text-3xl font-bold text-navy-900 uppercase tracking-widest">
                {homerunFlash.batter}
              </div>
              <div className="font-display mt-1 text-sm sm:text-lg font-bold text-softball-red-700 uppercase tracking-widest">
                {runs} {runs === 1 ? 'Run' : 'Runs'} · → HOME
              </div>
            </motion.div>

            {/* Ink-Splatter from center */}
            {[...Array(10)].map((_, i) => {
              const colors = isGrandSlam
                ? ['bg-amber-400', 'bg-softball-red-600', 'bg-navy-900', 'bg-cream-300']
                : ['bg-softball-red-600', 'bg-navy-900', 'bg-cream-300']
              const sizes = ['w-2 h-3', 'w-3 h-2', 'w-1.5 h-4', 'w-2 h-2']
              return (
                <motion.div
                  key={i}
                  className={`absolute ${colors[i % colors.length]} ${sizes[i % sizes.length]} rounded-sm`}
                  style={{
                    left: `${30 + Math.random() * 40}%`,
                    top: `${30 + Math.random() * 40}%`,
                  }}
                  initial={{ scale: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.2, 0.7],
                    rotate: Math.random() * 540 - 270,
                    x: (Math.random() - 0.5) * 480,
                    y: (Math.random() - 0.5) * 360,
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 + i * 0.04 }}
                />
              )
            })}

            {/* Confetti rain (Grand Slam: extra dichter + amber) */}
            {[...Array(isGrandSlam ? 22 : 12)].map((_, i) => {
              const colors = isGrandSlam
                ? ['bg-amber-400', 'bg-softball-red-600', 'bg-navy-900', 'bg-cream-300']
                : ['bg-softball-red-600', 'bg-navy-900', 'bg-cream-300']
              const sizes = ['w-2 h-3', 'w-1.5 h-5', 'w-3 h-2', 'w-2 h-2']
              return (
                <motion.div
                  key={`rain-${i}`}
                  className={`absolute ${colors[i % colors.length]} ${sizes[i % sizes.length]} rounded-sm`}
                  style={{ left: `${Math.random() * 100}%`, top: '-5%' }}
                  initial={{ y: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    y: '110vh',
                    rotate: Math.random() * 720 - 360,
                    x: (Math.random() - 0.5) * 100,
                    opacity: [0, 1, 1, 0.6],
                  }}
                  transition={{ duration: 2.0 + Math.random() * 0.5, ease: 'easeIn', delay: 0.6 + i * 0.04 }}
                />
              )
            })}
          </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* HBP — Impact "HBP!" mit Schmerz-Effekt (Crack-Lines + Impact-Ring + Shake) */}
      <AnimatePresence>
        {hbpFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: [0, -14, 12, -10, 8, -5, 3, 0],
              y: [0, 6, -4, 5, -3, 2, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/95"
          >
            {/* Roter Pain-Pulse Hintergrund */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0.15, 0] }}
              transition={{ duration: 0.5, times: [0, 0.15, 0.5, 1] }}
              className="absolute inset-0 bg-softball-red-600"
            />
            {/* Impact-Ring: roter Ring expandiert vom Zentrum */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: [0, 4], opacity: [0.8, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-40 h-40 rounded-full border-[6px] border-softball-red-600"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: [0, 6], opacity: [0.6, 0] }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="absolute w-40 h-40 rounded-full border-[3px] border-softball-red-700"
            />
            {/* Crack-Lines: zigzag SVG strahlt vom Zentrum aus */}
            <svg
              className="absolute pointer-events-none"
              width="600"
              height="600"
              viewBox="-300 -300 600 600"
            >
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <motion.path
                  key={angle}
                  d={`M 0 0 L ${Math.cos((angle * Math.PI) / 180) * 60} ${Math.sin((angle * Math.PI) / 180) * 60} l 18 -8 l 30 12 l 25 -10 l 30 6`}
                  transform={`rotate(${angle})`}
                  fill="none"
                  stroke="var(--color-softball-red-700)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.02, ease: 'easeOut' }}
                />
              ))}
            </svg>
            {/* Smash-In Text */}
            <motion.div
              initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
              animate={{
                scale: [0.2, 1.5, 0.95, 1.05, 1, 1],
                rotate: [-25, 12, -8, 5, -6, -6],
                opacity: 1,
              }}
              exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
              transition={{ duration: 0.55, ease: [0.16, 1.4, 0.3, 1] }}
              className="text-center relative"
            >
              <div
                className="font-display font-black text-softball-red-600 leading-none tracking-tight"
                style={{
                  fontSize: 'clamp(140px, 42vw, 380px)',
                  textShadow: '6px 6px 0 rgba(10,15,92,0.25), -2px -2px 0 rgba(255,251,243,0.6)',
                  WebkitTextStroke: '2.5px var(--color-softball-red-700)',
                }}
              >
                HBP!
              </div>
              {/* Klein "AUTSCH" als Sticker rotiert */}
              <motion.div
                initial={{ scale: 0, rotate: 25 }}
                animate={{ scale: [0, 1.2, 1], rotate: 12 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="absolute -top-4 -right-2 sm:-right-12 bg-softball-red-600 text-white font-display font-black text-xl sm:text-3xl px-3 py-1 rounded-md tracking-wider rotate-12 shadow-lg border-2 border-cream-50"
              >
                AUTSCH!
              </motion.div>
              <div className="font-display mt-2 text-base sm:text-xl font-bold text-navy-900 uppercase tracking-widest">
                Hit by Pitch
              </div>
              <div className="font-display mt-1 text-xl sm:text-2xl font-bold text-navy-900 uppercase tracking-widest">
                {hbpFlash} <span className="text-softball-red-700">→ 1B</span>
              </div>
            </motion.div>
            {/* Ink-Splatter */}
            {[...Array(10)].map((_, i) => {
              const colors = ['bg-softball-red-600', 'bg-navy-900']
              const sizes = ['w-2 h-3', 'w-3 h-2', 'w-1.5 h-4']
              return (
                <motion.div
                  key={i}
                  className={`absolute ${colors[i % colors.length]} ${sizes[i % sizes.length]}`}
                  style={{
                    left: `${30 + Math.random() * 40}%`,
                    top: `${35 + Math.random() * 30}%`,
                  }}
                  initial={{ scale: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1, 0.7],
                    rotate: Math.random() * 360,
                    x: (Math.random() - 0.5) * 320,
                    y: (Math.random() - 0.5) * 240,
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 + i * 0.04 }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overthrow — Scorecard "E" (Error/Dead-Ball) Notation */}
      <AnimatePresence>
        {overthrowFlash && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="bg-navy-900 text-white pl-3 pr-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/15">
              <span
                className="font-display font-black text-3xl text-softball-red-400 leading-none"
              >
                E
              </span>
              <div>
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60">Dead Ball</div>
                <div className="font-display text-base font-bold tracking-wider uppercase">{overthrowFlash}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk — Scorecard "BB" Notation mit walking Footsteps + Run-Sticker bei forced run */}
      <AnimatePresence>
        {walkFlash && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="relative bg-navy-900 text-white pl-3 pr-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/15 overflow-hidden">
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                initial={{ left: '-12%', opacity: 0 }}
                animate={{ left: '108%', opacity: [0, 0.3, 0.3, 0] }}
                transition={{ duration: 1.3, ease: 'linear', delay: 0.05 }}
              >
                <Footprints size={20} className="text-cream-50" />
              </motion.div>

              <motion.span
                className="font-display font-black text-3xl text-cream-50 leading-none relative"
                style={{ WebkitTextStroke: '1px var(--color-softball-red-500)' }}
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.15, 1, 1.05, 1] }}
                transition={{ duration: 0.9, times: [0, 0.2, 0.45, 0.7, 1], ease: 'easeOut' }}
              >
                BB
              </motion.span>

              <div className="relative">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60">Base on Balls</div>
                <div className="font-display text-base font-bold tracking-wider uppercase">
                  {walkFlash.batter}
                </div>
              </div>

              {/* Run-Sticker bei forced run (bases-loaded walk) */}
              {walkFlash.runsScored > 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: 30, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], rotate: 12, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.4, ease: 'backOut' }}
                  className="bg-softball-red-600 text-white font-display font-black text-sm px-2 py-1 rounded-md tracking-wider shadow-lg border border-cream-50/30 relative"
                >
                  +{walkFlash.runsScored} {walkFlash.runsScored === 1 ? 'RUN' : 'RUNS'}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reached on Error — Scorecard "E" Notation, rose-Akzent */}
      <AnimatePresence>
        {errorFlash && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="relative bg-rose-800 text-white pl-3 pr-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/15 overflow-hidden">
              <motion.span
                className="font-display font-black text-3xl text-cream-50 leading-none relative"
                style={{ WebkitTextStroke: '1px var(--color-softball-red-500)' }}
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.15, 1, 1.05, 1] }}
                transition={{ duration: 0.9, times: [0, 0.2, 0.45, 0.7, 1], ease: 'easeOut' }}
              >
                E
              </motion.span>

              <div className="relative">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60">Reached on Error</div>
                <div className="font-display text-base font-bold tracking-wider uppercase">
                  {errorFlash.batter}
                </div>
              </div>

              {errorFlash.runsScored > 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: 30, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], rotate: 12, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.4, ease: 'backOut' }}
                  className="bg-softball-red-600 text-white font-display font-black text-sm px-2 py-1 rounded-md tracking-wider shadow-lg border border-cream-50/30 relative"
                >
                  +{errorFlash.runsScored} {errorFlash.runsScored === 1 ? 'RUN' : 'RUNS'}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steal Pill — 1B/2B/3B oder Caught */}
      <AnimatePresence>
        {stealFlash && stealFlash.type !== 'HOME' && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className={`relative pl-3 pr-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border overflow-hidden ${
              stealFlash.type === 'CAUGHT'
                ? 'bg-softball-red-700 text-white border-softball-red-800'
                : 'bg-softball-red-600 text-white border-softball-red-700'
            }`}>
              {stealFlash.type !== 'CAUGHT' && (
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                  initial={{ left: '-12%', opacity: 0 }}
                  animate={{ left: '108%', opacity: [0, 0.3, 0.3, 0] }}
                  transition={{ duration: 1.0, ease: 'linear', delay: 0.05 }}
                >
                  <Footprints size={20} className="text-cream-50" />
                </motion.div>
              )}
              <motion.div
                initial={{ scale: 0.6, rotate: stealFlash.type === 'CAUGHT' ? 30 : -10 }}
                animate={{ scale: [0.6, 1.25, 1], rotate: 0 }}
                transition={{ duration: 0.5, ease: 'backOut' }}
                className="relative"
              >
                {stealFlash.type === 'CAUGHT' ? <XIcon size={28} /> : <Zap size={28} fill="currentColor" />}
              </motion.div>
              <div className="relative">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-white/75">
                  {stealFlash.type === 'CAUGHT' ? 'Caught Stealing · +1 Aus' : 'Stolen Base'}
                </div>
                <div className="font-display text-base font-bold tracking-wider uppercase">
                  {stealFlash.runner}
                  {stealFlash.type === 'BASE' && (
                    <span className="ml-1.5 text-cream-200">→ {stealFlash.toBase}B</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steal HOME — Cinematic Slide + SAFE!-Stamp */}
      <AnimatePresence>
        {stealFlash?.type === 'HOME' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: [0, -10, 8, -6, 4, -2, 0],
              y: [0, 5, -3, 2, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/95 overflow-hidden"
          >
            {/* Speed-Lines: streifen die Slide-Bewegung an */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
              {[...Array(10)].map((_, i) => {
                const y = 35 + (i * 4)
                return (
                  <motion.line
                    key={i}
                    x1={100} y1={y}
                    x2={20} y2={y}
                    stroke="#CC2936"
                    strokeWidth="0.4"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: [0, 0.7, 0], pathLength: [0, 1, 1] }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.025, ease: 'easeOut' }}
                  />
                )
              })}
            </svg>

            {/* Sliding Footsteps — fliegen von rechts nach Center, kippen bei Slide */}
            <motion.div
              className="absolute"
              style={{ top: '46%', transformOrigin: 'center' }}
              initial={{ left: '105%', opacity: 0, rotate: 0 }}
              animate={{
                left: ['105%', '42%'],
                opacity: [0, 1, 1, 0],
                rotate: [0, -25, -45],
                scale: [0.8, 1.1, 0.9],
              }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.45, 0, 0.6, 1], times: [0, 0.6, 0.85, 1] }}
            >
              <Footprints size={88} className="text-navy-900 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
            </motion.div>

            {/* Dust-Cloud Puffs */}
            {[...Array(16)].map((_, i) => {
              const dx = -(50 + Math.random() * 220)
              const dy = -(15 + Math.random() * 60)
              const size = 18 + Math.random() * 32
              return (
                <motion.div
                  key={`dust-${i}`}
                  className="absolute bg-cream-300 rounded-full opacity-70"
                  style={{ left: '42%', top: '56%', width: size, height: size }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.4, 1, 0.5],
                    x: dx,
                    y: dy,
                    opacity: [0, 0.6, 0.4, 0],
                  }}
                  transition={{ duration: 1.4, delay: 0.55 + i * 0.03, ease: 'easeOut' }}
                />
              )
            })}

            {/* SAFE!-Mega-Stamp + Sticker */}
            <motion.div
              initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
              animate={{
                scale: [0.2, 1.4, 0.95, 1.05, 1, 1],
                rotate: [-25, 12, -8, 5, -6, -6],
                opacity: 1,
              }}
              exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
              transition={{ duration: 0.55, delay: 0.85, ease: [0.16, 1.4, 0.3, 1] }}
              className="text-center relative z-10"
            >
              <div
                className="font-display font-black text-emerald-600 leading-none tracking-tight"
                style={{
                  fontSize: 'clamp(120px, 36vw, 320px)',
                  textShadow: '8px 8px 0 rgba(10,15,92,0.3), -3px -3px 0 rgba(255,251,243,0.7), 0 0 3px rgba(16,185,129,0.5)',
                  WebkitTextStroke: '3px #047857',
                }}
              >
                SAFE!
              </div>
              <motion.div
                initial={{ scale: 0, rotate: 30 }}
                animate={{ scale: [0, 1.3, 1], rotate: 12 }}
                transition={{ duration: 0.45, delay: 1.2, ease: 'backOut' }}
                className="absolute -top-3 -right-2 sm:-right-12 bg-softball-red-600 text-white font-display font-black text-base sm:text-2xl px-3 py-1 rounded-md tracking-wider shadow-lg border-2 border-cream-50"
              >
                STOLEN HOME
              </motion.div>
              <div className="font-display mt-3 text-xl sm:text-3xl font-bold text-navy-900 uppercase tracking-widest">
                {stealFlash.runner}
              </div>
              <div className="font-display mt-1 text-sm sm:text-lg font-bold text-softball-red-700 uppercase tracking-widest">
                +1 RUN
              </div>
            </motion.div>

            {/* Confetti */}
            {[...Array(20)].map((_, i) => {
              const colors = ['bg-softball-red-600', 'bg-navy-900', 'bg-emerald-500', 'bg-cream-300']
              const sizes = ['w-2 h-3', 'w-1.5 h-5', 'w-3 h-2', 'w-2 h-2']
              return (
                <motion.div
                  key={`conf-${i}`}
                  className={`absolute ${colors[i % colors.length]} ${sizes[i % sizes.length]} rounded-sm`}
                  style={{ left: `${Math.random() * 100}%`, top: '-5%' }}
                  initial={{ y: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    y: '110vh',
                    rotate: Math.random() * 720 - 360,
                    x: (Math.random() - 0.5) * 100,
                    opacity: [0, 1, 1, 0.6],
                  }}
                  transition={{ duration: 1.8 + Math.random() * 0.5, ease: 'easeIn', delay: 1.0 + i * 0.04 }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strikeout — Vintage "K!" Stempel diagonal */}
      <AnimatePresence>
        {strikeoutFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/90"
          >
            <motion.div
              initial={{ scale: 0.3, rotate: 20, opacity: 0 }}
              animate={{
                scale: [0.3, 1.3, 1, 1, 1],
                rotate: [20, -15, -12, -12, -12],
                x: [0, -8, 6, -4, 0],
                opacity: 1,
              }}
              exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center relative"
            >
              <div
                className="font-display font-black text-softball-red-600 leading-none"
                style={{
                  fontSize: 'clamp(180px, 50vw, 440px)',
                  textShadow: '5px 5px 0 rgba(10,15,92,0.2)',
                  WebkitTextStroke: '3px var(--color-softball-red-700)',
                }}
              >
                K!
              </div>
              {/* Diagonal Scribble durch K wie Umpire-Mark */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 400 400"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M 30 350 Q 200 50 380 320"
                  fill="none"
                  stroke="var(--color-softball-red-700)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
                />
              </svg>
              <div className="font-display mt-2 text-xl sm:text-2xl font-bold text-navy-900 uppercase tracking-widest">
                {strikeoutFlash} · Strikeout
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hit/Run-Pille — einheitlich für scorende Runs UND Hit-with-Runners */}
      <AnimatePresence>
        {scoredFlash && (scoredFlash.runners.length > 0 || scoredFlash.hitLabel) && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.45, type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-32 left-1/2 -translate-x-1/2 z-[60]"
          >
            <button
              onClick={() => setShowCorrection(true)}
              className="bg-cream-50 border-2 border-softball-red-600 text-navy-900 px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-2xl transition-all active:scale-95"
              title="Tippen um Runner anzupassen"
            >
              {scoredFlash.runners.length > 0 ? (
                <span
                  className="font-display font-black text-4xl text-softball-red-600 leading-none"
                  style={{ WebkitTextStroke: '0.5px var(--color-softball-red-700)' }}
                >
                  +{scoredFlash.runners.length}
                </span>
              ) : (
                <span
                  className="font-display font-black text-3xl text-softball-red-600 leading-none"
                  style={{ WebkitTextStroke: '0.5px var(--color-softball-red-700)' }}
                >
                  {scoredFlash.hitLabel === 'Single' ? '1B' : scoredFlash.hitLabel === 'Double' ? '2B' : '3B'}
                </span>
              )}
              <div className="text-left">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-500">
                  {scoredFlash.runners.length > 0
                    ? (scoredFlash.runners.length === 1 ? 'Run' : 'Runs')
                    : scoredFlash.hitLabel}
                </div>
                <div className="font-display text-base font-bold tracking-wider uppercase truncate max-w-[200px]">
                  {scoredFlash.runners.length > 0
                    ? scoredFlash.runners.join(' · ')
                    : 'Runner anders?'}
                </div>
                <div className="font-display text-[9px] font-bold tracking-widest uppercase text-softball-red-700/70 mt-0.5">
                  Tippen → Anpassen
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <ConfirmModal
          title="Scoring zurücksetzen"
          message={`Wirklich alle ${atBats.length} At-Bats und Steal-Events für dieses Spiel löschen? Das kann nicht rückgängig gemacht werden.`}
          confirmLabel="Ja, alles löschen"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {/* End-Game Confirmation */}
      {showEndGameConfirm && (
        <ConfirmModal
          title="Spiel beenden?"
          message="Das Scoring wird auf 'beendet' gesetzt. Stats sind sofort abrufbar. Du kannst später 'Wieder öffnen' tippen um weiter zu editieren."
          confirmLabel="Ja, beenden"
          onConfirm={async () => {
            setShowEndGameConfirm(false)
            if (!currentGame) return
            try {
              await api.endGame(currentGame.id)
              setManualGameOver(true)
              await reload()
              toast.show('Spiel beendet — Stats verfügbar', 'success')
            } catch (e) {
              toast.show((e as Error).message, 'error')
            }
          }}
          onCancel={() => setShowEndGameConfirm(false)}
        />
      )}

      {/* Top/Bottom Prompt — Wer schlägt zuerst? */}
      {showSidePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Wer schlägt zuerst?</h2>
              <p className="text-xs text-gray-500 mt-1">
                In Softball schlägt das Auswärtsteam oben (Top of Inning), das Heimteam unten (Bottom).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => pickSide('top')}
                className="h-16 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-bold text-sm flex items-center justify-between px-4 cursor-pointer"
              >
                <span className="flex flex-col items-start">
                  <span>Wir schlagen zuerst</span>
                  <span className="text-[10px] font-normal opacity-80">wir sind Auswärtsteam</span>
                </span>
                <span className="text-lg">↑ Oben</span>
              </button>
              <button
                onClick={() => pickSide('bottom')}
                className="h-16 rounded-xl bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold text-sm flex items-center justify-between px-4 cursor-pointer"
              >
                <span className="flex flex-col items-start">
                  <span>Gegner schlägt zuerst</span>
                  <span className="text-[10px] font-normal opacity-80">wir sind Heimteam</span>
                </span>
                <span className="text-lg">↓ Unten</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug: reload silently wenn nötig */}
      <button onClick={reload} className="hidden" aria-hidden />
    </div>
  )
}

// --- Konservatives Auto-Advance ---
// Regel: Batter erreicht die Base, die seinem Hit entspricht. Runner die vor
// ihm stehen laufen NUR so weit wie unbedingt nötig (Force) bzw. genau +N
// Bases. Realistische Softball-Play-Szenarien wie "Runner von 2B scort bei
// Single" sollten vom User über die Runner-Korrektur manuell gesetzt werden,
// weil Out-am-Basepad oder Stop-at-3rd auch vorkommen können.
function advanceBases(state: BaseStateDto, result: AtBatResult, batterId: number): BaseStateDto {
  switch (result) {
    case 'STRIKEOUT':
    case 'OUT':
      return state
    case 'HOMERUN':
      return { first: null, second: null, third: null }
    case 'TRIPLE':
      // Alle Runner laufen Home, Batter auf 3B
      return { first: null, second: null, third: batterId }
    case 'WALK':
    case 'HIT_BY_PITCH': {
      // Force-Advance: nur wenn bases vor Batter besetzt sind
      const next: BaseStateDto = { first: batterId, second: state.second, third: state.third }
      if (state.first != null) {
        next.second = state.first
        if (state.second != null) {
          next.third = state.second
          // Runner von 3B scort — wird beim countScored erkannt
        }
      }
      return next
    }
    case 'REACHED_ON_ERROR': {
      // ROE mit Runnern: state UNCHANGED — Korrektur-Sheet fragt User wo alle landen.
      // Sheet fügt Batter als extra-Assignment auf 1B hinzu (defaultBase).
      // Ohne Runner: Batter direkt auf 1B (kein Sheet).
      const hasRunners = state.first != null || state.second != null || state.third != null
      if (!hasRunners) {
        return { first: batterId, second: null, third: null }
      }
      return state
    }
    case 'SINGLE': {
      // Konservativ: Batter auf 1B, Runner jeweils +1 Base
      // 3B → Home (scort), 2B → 3B, 1B → 2B
      return {
        first: batterId,
        second: state.first,
        third: state.second,
        // 3B-Runner scort (wird weggelassen aus state → countScored erkennt)
      }
    }
    case 'DOUBLE': {
      // Konservativ: Batter auf 2B, Runner jeweils +2 Bases
      // 3B → Home, 2B → Home, 1B → 3B
      return {
        first: null,
        second: batterId,
        third: state.first,
      }
    }
  }
}

function countScored(before: BaseStateDto, after: BaseStateDto, result: AtBatResult, batterId: number): number {
  const wasOnBase = [before.first, before.second, before.third].filter(id => id != null) as number[]
  const stillOnBase = [after.first, after.second, after.third].filter(id => id != null) as number[]
  // Wer vorher auf Base war aber nicht mehr drauf (und nicht der Batter) ist Home
  const scored = wasOnBase.filter(id => !stillOnBase.includes(id)).length
  // Batter kommt Home bei HR
  if (result === 'HOMERUN' && !stillOnBase.includes(batterId)) {
    return scored + 1
  }
  return scored
}
