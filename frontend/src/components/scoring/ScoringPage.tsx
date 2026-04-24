import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import { useScoring } from '@/hooks/useScoring'
import { useToastContext } from '@/components/layout/Layout'
import { ChevronLeft, FootstepsIcon, StrikeoutIcon, TrophyIcon, SadFaceIcon, Pencil, ClipboardListIcon, SubstitutionIcon, BoltIcon } from '@/icons'
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
  const [editingScoreUs, setEditingScoreUs] = useState(false)
  const [scoreUsInput, setScoreUsInput] = useState('')
  const [opponentRunsThisInning, setOpponentRunsThisInning] = useState('')
  // Animations halten jetzt den Spielernamen — sonst zeigt der Reload schon den nächsten Batter
  const [homerunFlash, setHomerunFlash] = useState<string | null>(null)
  // HR-Runner läuft über alle Bases. State hält name + battingOrder damit
  // der Runner auf dem Diamond animiert werden kann.
  const [homerunRunner, setHomerunRunner] = useState<{ playerId: number; playerName: string; battingOrder: number | null } | null>(null)
  const [hbpFlash, setHbpFlash] = useState<string | null>(null)
  const [walkFlash, setWalkFlash] = useState<string | null>(null)
  const [strikeoutFlash, setStrikeoutFlash] = useState<string | null>(null)
  const [overthrowFlash, setOverthrowFlash] = useState<string | null>(null)
  // Runner die gerade Home erreicht haben (Array von Namen) — feiert Run-Scoring
  const [scoredFlash, setScoredFlash] = useState<string[] | null>(null)
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
      .then(setGameDay)
      .catch((e: Error) => toast.show(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [gameDayId, toast])

  const currentGame = gameDay?.games[gameIndex] ?? null
  const opponentName = currentGame?.opponentTeam?.name ?? 'Gegner'

  const { atBats, scoreboard, reload, recordAtBat, undo, recordStealingEvent } = useScoring(currentGame?.id ?? null)

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

  // Batting-Side + Ended-Flag + Inning-Override aus localStorage laden
  useEffect(() => {
    if (currentGame == null) return
    const stored = localStorage.getItem(`scoring-side-${currentGame.id}`)
    if (stored === 'top' || stored === 'bottom') {
      setBattingSide(stored)
    } else if (atBats.length === 0 && scoreboard) {
      setShowSidePrompt(true)
    }
    // Manual Game-Over-Flag persistent
    const ended = localStorage.getItem(`scoring-ended-${currentGame.id}`)
    if (ended === '1') setManualGameOver(true)
    // Inning-Override persistieren: User hat "Nächstes Inning" gedrückt aber
    // noch kein neuer AtBat → Reload würde sonst zurück zum alten Inning springen.
    const overrideStr = localStorage.getItem(`scoring-inning-override-${currentGame.id}`)
    if (overrideStr) {
      const n = Number(overrideStr)
      if (!Number.isNaN(n) && n >= 1 && n <= 99) setInningOverride(n)
    }
  }, [currentGame, atBats.length, scoreboard])

  // Inning-Override-Persistierung
  useEffect(() => {
    if (currentGame == null) return
    if (inningOverride == null) {
      localStorage.removeItem(`scoring-inning-override-${currentGame.id}`)
    } else {
      localStorage.setItem(`scoring-inning-override-${currentGame.id}`, String(inningOverride))
    }
  }, [currentGame, inningOverride])

  const pickSide = (side: 'top' | 'bottom') => {
    if (!currentGame) return
    setBattingSide(side)
    localStorage.setItem(`scoring-side-${currentGame.id}`, side)
    setShowSidePrompt(false)
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
      // Ermittle Runner die durch diesen AtBat gescort haben (für Korrigieren-Sheet)
      const newRunnerIds = new Set([nextState.first, nextState.second, nextState.third].filter(Boolean) as number[])
      const scoredPlayers = (scoreboard.runners ?? [])
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
      if (result === 'HOMERUN') {
        setHomerunFlash(batterNameSnapshot)
        setTimeout(() => setHomerunFlash(null), 2200)
        // Runner läuft Home → 1B → 2B → 3B → Home
        setHomerunRunner({
          playerId: scoreboard.currentBatterId,
          playerName: batterNameSnapshot,
          battingOrder: scoreboard.currentBatterOrder ?? null,
        })
        setTimeout(() => setHomerunRunner(null), 2200)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([80, 60, 80, 60, 200]) } catch { /* vibrate not supported */ }
        }
      } else if (result === 'HIT_BY_PITCH') {
        setHbpFlash(batterNameSnapshot)
        setTimeout(() => setHbpFlash(null), 1500)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([30, 30, 30]) } catch { /* vibrate not supported */ }
        }
      } else if (result === 'WALK') {
        setWalkFlash(batterNameSnapshot)
        setTimeout(() => setWalkFlash(null), 1400)
      } else if (result === 'STRIKEOUT') {
        setStrikeoutFlash(batterNameSnapshot)
        setTimeout(() => setStrikeoutFlash(null), 1600)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([40, 40, 80]) } catch { /* vibrate not supported */ }
        }
      }

      // Home-Plate-Berührung: wenn Runner durch diesen AtBat gescort sind, feier die!
      // NICHT bei HR (HR-Vollbild läuft schon) und nicht bei HBP (AUA-Vollbild reicht).
      if (result !== 'HOMERUN' && result !== 'HIT_BY_PITCH' && scoredPlayers.length > 0) {
        setScoredFlash(scoredPlayers.map(p => p.playerName))
        setTimeout(() => setScoredFlash(null), 1500)
      }
      // Toasts + Sheet-Trigger abhängig vom Result
      const hadRunners = (scoreboard.runners?.length ?? 0) > 0
      const isHit = result === 'SINGLE' || result === 'DOUBLE' || result === 'TRIPLE'
      // Wenn dieser Out der 3. Out ist → Half-Inning ist vorbei,
      // Runner-Advancement interessiert nicht mehr.
      const willBe3rdOut = result === 'OUT' && (scoreboard.outsInCurrentInning ?? 0) >= 2

      if (result === 'OUT' && hadRunners && !willBe3rdOut) {
        // Auto-Open nach OUT: meist muss User entscheiden (Sac Fly, DP, Advancement)
        setShowCorrection(true)
      } else if (isHit && hadRunners) {
        // Nach Hit mit Runnern: Toast mit Anpassen-Action (non-blocking).
        // Default-Advance stimmt meist, User kann tippen wenn Runner ausgelaufen
        // oder extra Base genommen hat.
        const runsMsg = runsScored > 0 ? ` · ${runsScored} Run${runsScored > 1 ? 's' : ''}` : ''
        toast.show(`${result === 'SINGLE' ? 'Single' : result === 'DOUBLE' ? 'Double' : 'Triple'}${runsMsg} — Runner anders?`, 'success', {
          duration: 6000,
          action: { label: 'Anpassen', onClick: () => setShowCorrection(true) },
        })
      } else if (runsScored > 0) {
        toast.show(`${runsScored} Run${runsScored > 1 ? 's' : ''} gescort!`, 'success')
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

  const saveScoreUs = async () => {
    if (!currentGame) return
    const parsed = scoreUsInput.trim() === '' ? null : Number(scoreUsInput)
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.show('Ungültige Zahl', 'error')
      setEditingScoreUs(false)
      return
    }
    try {
      await api.setGameScore(currentGame.id, parsed ?? 0, scoreThem)
      await reload()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setEditingScoreUs(false)
    }
  }

  const handleUndo = async () => {
    if (atBats.length === 0) return
    setSubmitting(true)
    try {
      await undo()
      toast.show('Letzte Aktion rückgängig gemacht', 'success')
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
    // Sheet sofort schließen — optimistic UX
    setStealingRunner(null)
    try {
      await recordStealingEvent({
        runnerId: stealingRunner.playerId,
        type,
        inning: currentInning,
      })
      if (type === 'STOLEN_BASE') {
        toast.show(`⚡ ${runnerName} klaut die nächste Base!`, 'success')
      } else {
        toast.show(`✕ ${runnerName} beim Klauen gefangen · +1 Aus`, 'success')
      }
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
      setInningOverride(null)
      setExtraOuts(0)
      setManualGameOver(false)
      // Batting-Side + Ended-Flag resetten
      localStorage.removeItem(`scoring-side-${currentGame.id}`)
      localStorage.removeItem(`scoring-ended-${currentGame.id}`)
      setBattingSide(null)
      setShowSidePrompt(true)
      await reload()
      toast.show('Scoring zurückgesetzt · Bases frei', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 text-white sticky top-0 z-40 shadow-md">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(`/gameday/${gameDayId}`)}
            className="p-1 hover:bg-navy-700 rounded-lg flex items-center gap-1 shrink-0"
          >
            <ChevronLeft size={24} />
            <span className="text-sm font-medium hidden sm:inline">Zurück</span>
          </button>
          <div className="text-sm font-semibold truncate flex-1 text-center min-w-0">
            <span className="hidden sm:inline">Dead Sox </span>
            <span className="text-white/60">vs.</span> {opponentName}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEndGameConfirm(true)}
              disabled={atBats.length === 0 || gameOver}
              className="p-1.5 hover:bg-navy-700 rounded-lg text-white/70 hover:text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Spiel beenden und Stats zeigen"
            >
              🏁 Beenden
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={atBats.length === 0}
              className="p-1.5 hover:bg-navy-700 rounded-lg text-white/70 hover:text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Scoring zurücksetzen"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      </header>

      {/* Scoreboard Strip - kompakt */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Scores — beide tappbar + editierbar */}
          <div className="flex items-baseline gap-1.5">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-400 uppercase font-semibold -mb-0.5">Wir</span>
              {editingScoreUs ? (
                <input
                  type="number"
                  inputMode="numeric"
                  value={scoreUsInput}
                  onChange={e => setScoreUsInput(e.target.value)}
                  onBlur={saveScoreUs}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveScoreUs()
                    if (e.key === 'Escape') setEditingScoreUs(false)
                  }}
                  className="w-14 text-2xl sm:text-3xl font-black text-navy-900 tabular-nums border-b-2 border-softball-red-500 outline-none bg-transparent text-center"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => {
                    setScoreUsInput(String(scoreUs ?? 0))
                    setEditingScoreUs(true)
                  }}
                  className="text-2xl sm:text-3xl font-black text-navy-900 tabular-nums cursor-pointer hover:text-softball-red-600 transition-colors px-1 leading-none"
                  title="Unseren Score tippen um zu editieren"
                >
                  {scoreUs}
                </button>
              )}
            </div>
            <span className="text-xl text-gray-300">:</span>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-400 uppercase font-semibold -mb-0.5">Sie</span>
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
                  className="w-14 text-2xl sm:text-3xl font-black text-gray-700 tabular-nums border-b-2 border-softball-red-500 outline-none bg-transparent text-center"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => {
                    setScoreThemInput(String(scoreThem ?? 0))
                    setEditingScoreThem(true)
                  }}
                  className="text-2xl sm:text-3xl font-black text-gray-600 tabular-nums cursor-pointer hover:text-softball-red-600 transition-colors px-1 leading-none"
                  title="Gegner-Score tippen um zu editieren"
                >
                  {scoreThem ?? 0}
                </button>
              )}
            </div>
            <span className="ml-1 text-[10px] text-gray-400 font-medium">✎ tap zum edit</span>
          </div>

          {/* Inning + Outs */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs sm:text-sm font-semibold text-gray-700">
              <span>{displayInning}. Inning</span>
              {battingSide && (
                <button
                  onClick={() => setShowSidePrompt(true)}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border border-gray-300 rounded-full text-gray-600 hover:border-navy-600 hover:bg-navy-50 hover:text-navy-800 cursor-pointer transition-colors"
                  title="Seite ändern (Oben/Unten)"
                >
                  <span>{battingSide === 'top' ? '↑ Oben' : '↓ Unten'}</span>
                  <Pencil size={10} />
                </button>
              )}
            </div>
            <button
              onClick={() => setExtraOuts(x => (totalOuts < 3 ? x + 1 : 0))}
              className="flex items-center justify-end gap-1 mt-0.5 cursor-pointer group"
              title="Tap = +1 Out (Double Play). Bei 3 Aus: Reset."
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i < totalOuts ? 'bg-softball-red-600' : 'bg-gray-200 group-hover:bg-gray-300'}`}
                />
              ))}
              <span className="text-[10px] text-gray-500 ml-1 tabular-nums">{totalOuts} Aus</span>
            </button>
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
            <div className="text-2xl font-black">🏆 Spiel beendet!</div>
            <div className="text-sm text-white/80">
              {(scoreUs ?? 0) > (scoreThem ?? 0) ? 'Wir haben gewonnen!' :
               (scoreUs ?? 0) < (scoreThem ?? 0) ? 'Leider verloren' :
               'Unentschieden'} · Endstand {scoreUs} : {scoreThem ?? 0}
            </div>
          </div>
          {currentGame && gameDay && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                to={`/stats?scope=game&gameId=${currentGame.id}&view=batting`}
                className="block text-center px-4 py-3 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold text-sm cursor-pointer shadow-sm"
              >
                📊 Stats dieses Spiels
              </Link>
              <Link
                to={`/stats?scope=season&seasonId=${gameDay.seasonId}&view=batting`}
                className="block text-center px-4 py-3 rounded-lg border border-white/30 text-white hover:bg-white/10 font-bold text-sm cursor-pointer"
              >
                📊 Saison-Stats
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Diamond - kompakter */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 px-4 min-h-0">
        <div className="w-full max-w-[360px] sm:max-w-[420px]">
          <DiamondView
            baseState={displayBaseState}
            runners={displayRunners}
            onRunnerTap={halfInningOver ? undefined : handleRunnerTap}
            homerunRunner={homerunRunner}
          />
        </div>
      </div>

      {/* Batter Card - kompakt mit On-Deck-Preview + Lineup-Sheet-Button */}
      <div className="px-4 py-2 bg-white border-t border-gray-200">
        {scoreboard?.currentBatterId && !halfInningOver ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-navy-900 text-white font-bold px-1.5 py-0.5 rounded tabular-nums">
                #{scoreboard.currentBatterOrder ?? '?'}
              </span>
              <span className="font-bold text-base sm:text-lg text-gray-900 uppercase tracking-tight truncate">
                {scoreboard.currentBatterName}
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">⚾ am Schlag</span>
              <button
                onClick={() => setShowLineupSheet(true)}
                className="ml-auto text-[11px] text-navy-700 hover:text-navy-900 font-medium px-2 py-0.5 rounded-full border border-gray-200 hover:border-navy-400 cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                title="Kompletten Batting-Order anzeigen"
              >
                <ClipboardListIcon size={12} />
                Lineup
              </button>
            </div>
            {/* On-Deck Preview: nächste 3 Batters */}
            {(() => {
              const sorted = [...lineup].filter(e => e.battingOrder != null).sort((a, b) => a.battingOrder - b.battingOrder)
              if (sorted.length === 0) return null
              const currentIdx = sorted.findIndex(e => effectivePlayerForEntry(e).id === scoreboard.currentBatterId)
              if (currentIdx === -1) return null
              const next = Array.from({ length: 3 }, (_, i) => sorted[(currentIdx + i + 1) % sorted.length])
              return (
                <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                  <span className="text-gray-400">Nächste:</span>
                  {next.map((e, i) => {
                    const p = effectivePlayerForEntry(e)
                    return (
                      <span key={`${e.id}-${i}`} className="inline-flex items-center gap-0.5">
                        <span className="font-mono text-gray-400">#{e.battingOrder}</span>
                        <span className="font-medium text-gray-700">{p.name}</span>
                        {i < next.length - 1 && <span className="text-gray-300">·</span>}
                      </span>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        ) : halfInningOver ? (
          <div className="text-xs text-gray-500 text-center">Warte auf Inning-Wechsel</div>
        ) : (
          <div className="text-xs text-gray-500 text-center">Kein Schlagmann — bitte Lineup erstellen</div>
        )}
      </div>

      {/* Action Buttons — sticky Thumb-Zone */}
      <div className="px-3 pt-3 pb-2 bg-white border-t border-gray-200 sticky bottom-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <ActionButtons onRecord={handleRecord} disabled={submitting || !scoreboard?.currentBatterId || halfInningOver} />

        {/* Undo + Korrektur + Overthrow (bei Runnern). Overthrow nur sichtbar
            wenn mind. 1 Runner auf Base — sonst irrelevant. */}
        <div className={`grid gap-2 mt-2 ${displayRunners.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            onClick={handleUndo}
            disabled={atBats.length === 0 || submitting}
            className="h-10 rounded-lg bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ↶ Rückgängig
          </button>
          <button
            onClick={() => setShowCorrection(true)}
            disabled={submitting}
            className="h-10 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            ⚙ Korrigieren
          </button>
          {displayRunners.length > 0 && (
            <button
              onClick={handleOverthrow}
              disabled={submitting || atBats.length === 0}
              className="h-10 rounded-lg border border-navy-300 text-navy-700 bg-white hover:bg-navy-50 hover:border-navy-500 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              title="Dead Ball / Overthrow: alle Runner rücken eine Base weiter"
            >
              <BoltIcon size={14} />
              Overthrow
            </button>
          )}
        </div>
      </div>

      {/* Korrektur-Sheet */}
      <CorrectionSheet
        open={showCorrection}
        onClose={() => setShowCorrection(false)}
        baseState={displayBaseState}
        runners={displayRunners}
        recentlyScored={recentlyScored}
        context={
          atBats.length > 0 && atBats[atBats.length - 1]?.result === 'OUT'
            ? 'post-out'
            : 'manual'
        }
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
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto focus:outline-none">
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
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
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
                            <span className="text-[10px] font-bold text-navy-700 uppercase tracking-wider">⚾ am Schlag</span>
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
                  className="h-11 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer"
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
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
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
                                : 'border border-gray-300 text-gray-700 hover:border-softball-red-400 hover:bg-softball-red-50'
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
                                  : 'border border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
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
                  className="h-11 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer"
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
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[70vh] focus:outline-none">
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
                    className="w-full h-20 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span>⚡ Stolen Base</span>
                    <span className="text-xs font-normal opacity-90">
                      Läuft zur nächsten Base · Runner bewegt sich
                    </span>
                  </button>
                  <button
                    onClick={() => handleStealing('CAUGHT_STEALING')}
                    className="w-full h-20 rounded-xl bg-softball-red-600 hover:bg-softball-red-700 active:bg-softball-red-800 text-white font-bold text-base cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span>✕ Caught Stealing</span>
                    <span className="text-xs font-normal opacity-90">
                      Beim Klauen gefangen · Runner ist AUS (+1 Out)
                    </span>
                  </button>
                  <button
                    onClick={() => setStealingRunner(null)}
                    className="w-full h-11 rounded-xl border border-gray-300 text-gray-600 font-medium cursor-pointer"
                  >
                    Abbrechen
                  </button>
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Homerun Celebration */}
      <AnimatePresence>
        {homerunFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-gradient-to-b from-emerald-600/90 via-emerald-500/70 to-softball-red-500/80"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: -30 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="text-center"
            >
              <div className="text-7xl sm:text-9xl mb-2">🎉</div>
              <div className="text-4xl sm:text-6xl font-black text-white drop-shadow-2xl tracking-wider">
                HOME RUN!
              </div>
              <div className="text-lg sm:text-2xl font-bold text-white/90 mt-2">
                {homerunFlash}
              </div>
            </motion.div>
            {/* Konfetti-Partikel */}
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '50%',
                  background: ['#fbbf24', '#ef4444', '#10b981', '#3b82f6', '#fff'][i % 5],
                }}
                initial={{ y: 0, opacity: 1, scale: 0 }}
                animate={{
                  y: (Math.random() - 0.5) * 600,
                  x: (Math.random() - 0.5) * 300,
                  opacity: 0,
                  scale: 1,
                  rotate: Math.random() * 720,
                }}
                transition={{ duration: 1.8, ease: 'easeOut', delay: i * 0.03 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HBP "Aua"-Animation */}
      <AnimatePresence>
        {hbpFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
          >
            {/* Roter Flash im Hintergrund */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.35, 0] }}
              transition={{ duration: 0.4, times: [0, 0.3, 1] }}
              className="absolute inset-0 bg-softball-red-600"
            />
            {/* Tot-Drama */}
            <motion.div
              initial={{ scale: 0.3, rotate: -20 }}
              animate={{
                scale: [0.3, 1.4, 1, 1, 1],
                rotate: [-20, 15, -8, 5, -3],
                y: [0, -20, 10, -5, 0],
              }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="text-center flex flex-col items-center gap-2"
            >
              <div className="text-8xl sm:text-9xl drop-shadow-xl">💥</div>
              {/* Text in rotem Pill — bleibt lesbar auch wenn Flash-BG wegfadet */}
              <div className="bg-softball-red-600 rounded-2xl px-5 py-2 shadow-2xl -rotate-3 border-2 border-white/40">
                <div className="text-3xl sm:text-5xl font-black text-white">
                  AUA!
                </div>
              </div>
            </motion.div>
            {/* Schmerz-Sterne ✨ */}
            {['✨', '💢', '⚡', '✨', '💢'].map((emoji, i) => (
              <motion.div
                key={i}
                className="absolute text-3xl sm:text-4xl"
                style={{
                  left: `${30 + Math.random() * 40}%`,
                  top: `${35 + Math.random() * 30}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.5],
                  x: (Math.random() - 0.5) * 150,
                  y: (Math.random() - 0.5) * 150,
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 0.9, delay: i * 0.06 }}
              >
                {emoji}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overthrow — Top-Banner nach Dead-Ball-Advance */}
      <AnimatePresence>
        {overthrowFlash && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="bg-navy-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/30">
              <BoltIcon size={28} className="text-white" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Overthrow</div>
                <div className="text-base font-bold">{overthrowFlash}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk — entspannter Badge (häufig, nicht blockierend) */}
      <AnimatePresence>
        {walkFlash && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="bg-navy-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/30">
              <FootstepsIcon size={28} className="text-white" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Walk</div>
                <div className="text-base font-bold">{walkFlash} → 1B</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strikeout — kurzer Shake + "K" Chip (dramatisch aber schnell) */}
      <AnimatePresence>
        {strikeoutFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: [0.5, 1.2, 1, 1, 1],
              x: [0, -6, 6, -4, 4, 0],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="bg-softball-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/30">
              <span className="text-4xl font-black leading-none">K</span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Strikeout</div>
                <div className="text-base font-bold">{strikeoutFlash}</div>
              </div>
              <StrikeoutIcon size={26} className="text-white" />
              <SadFaceIcon size={26} className="text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home-Plate-Berührung — feiert scorende Runner (eine oder mehrere) */}
      <AnimatePresence>
        {scoredFlash && scoredFlash.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.7 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: [0.7, 1.15, 1],
            }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 260, damping: 18 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="bg-gradient-to-br from-navy-700 to-navy-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/40">
              <TrophyIcon size={30} className="text-white" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-90">
                  {scoredFlash.length === 1 ? 'Home!' : `+${scoredFlash.length} Runs`}
                </div>
                <div className="text-base font-bold">
                  {scoredFlash.length === 1
                    ? `${scoredFlash[0]} scort`
                    : scoredFlash.join(' · ')}
                </div>
              </div>
            </div>
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
          onConfirm={() => {
            setShowEndGameConfirm(false)
            setManualGameOver(true)
            if (currentGame) localStorage.setItem(`scoring-ended-${currentGame.id}`, '1')
            toast.show('Spiel beendet — Stats verfügbar', 'success')
          }}
          onCancel={() => setShowEndGameConfirm(false)}
        />
      )}

      {/* Top/Bottom Prompt — Wer schlägt zuerst? */}
      {showSidePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
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
