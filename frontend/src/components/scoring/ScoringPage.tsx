import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Drawer } from 'vaul'
import { useScoring } from '@/hooks/useScoring'
import { useToastContext } from '@/components/layout/Layout'
import { ChevronLeft } from '@/icons'
import { DiamondView } from './DiamondView'
import { ActionButtons } from './ActionButtons'
import { CorrectionSheet } from './CorrectionSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import * as api from '@/api/client'
import type { AtBatResult, BaseStateDto, GameDayResponse, RunnerOnBase } from '@/types'

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
  const [hbpFlash, setHbpFlash] = useState<string | null>(null)
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
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([80, 60, 80, 60, 200]) } catch { /* vibrate not supported */ }
        }
      } else if (result === 'HIT_BY_PITCH') {
        setHbpFlash(batterNameSnapshot)
        setTimeout(() => setHbpFlash(null), 1500)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([30, 30, 30]) } catch { /* vibrate not supported */ }
        }
      }
      else if (runsScored > 0) toast.show(`${runsScored} Run${runsScored > 1 ? 's' : ''} gescort!`, 'success')
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

  const handleReopenGame = () => {
    setManualGameOver(false)
    if (currentGame) localStorage.removeItem(`scoring-ended-${currentGame.id}`)
    toast.show('Spiel wieder offen — Editieren möglich', 'success')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 text-white sticky top-0 z-40 shadow-md">
        <div className="px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/gameday/${gameDayId}`)}
            className="p-1 hover:bg-navy-700 rounded-lg flex items-center gap-1"
          >
            <ChevronLeft size={24} />
            <span className="text-sm font-medium">Zurück</span>
          </button>
          <div className="text-sm font-semibold">
            Dead Sox <span className="text-white/60">vs.</span> {opponentName}
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
            <div className="text-xs sm:text-sm font-semibold text-gray-700">
              {displayInning}. Inning
              {battingSide === 'top' && <span className="ml-1 text-[10px] text-gray-500">↑ Oben</span>}
              {battingSide === 'bottom' && <span className="ml-1 text-[10px] text-gray-500">↓ Unten</span>}
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
          <button
            onClick={handleReopenGame}
            className="block w-full text-center px-4 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 text-sm cursor-pointer"
          >
            ↺ Spiel wieder öffnen (weiter editieren)
          </button>
        </div>
      )}

      {/* Diamond - kompakter */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 px-4 min-h-0">
        <div className="w-full max-w-[220px] sm:max-w-[260px]">
          <DiamondView
            baseState={displayBaseState}
            runners={displayRunners}
            onRunnerTap={halfInningOver ? undefined : handleRunnerTap}
          />
        </div>
      </div>

      {/* Batter Card - kompakt, einzeilig */}
      <div className="px-4 py-2 bg-white border-t border-gray-200">
        {scoreboard?.currentBatterId && !halfInningOver ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-navy-900 text-white font-bold px-1.5 py-0.5 rounded tabular-nums">
              #{scoreboard.currentBatterOrder ?? '?'}
            </span>
            <span className="font-bold text-base sm:text-lg text-gray-900 uppercase tracking-tight truncate">
              {scoreboard.currentBatterName}
            </span>
            <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">⚾ am Schlag</span>
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

        {/* Undo + Korrektur - kompakter */}
        <div className="grid grid-cols-2 gap-2 mt-2">
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
        </div>
      </div>

      {/* Korrektur-Sheet */}
      <CorrectionSheet
        open={showCorrection}
        onClose={() => setShowCorrection(false)}
        baseState={displayBaseState}
        runners={displayRunners}
        recentlyScored={recentlyScored}
        availablePlayers={gameDay.availablePlayers}
        onSave={async ({ newState, extraRuns, outsFromRunners, unscoredPlayerIds }) => {
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
            // Runner-Outs als CaughtStealing-Events (für Stats-Tracking)
            for (const runnerId of outsFromRunners) {
              await api.recordStealingEvent(currentGame.id, {
                runnerId,
                type: 'CAUGHT_STEALING',
                inning: currentInning,
              })
            }
            // "Unscored" Spieler (vorher Home, jetzt nicht mehr) auch als CS zählen wenn position='out'
            const unscoredAsOut = unscoredPlayerIds.filter(id => outsFromRunners.includes(id))
            for (const runnerId of unscoredPlayerIds.filter(id => !unscoredAsOut.includes(id))) {
              // Spieler wurde zurück auf eine Base gesetzt — kein CS, nur Run-Abzug (schon erledigt)
              void runnerId
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
              className="text-center"
            >
              <div className="text-8xl sm:text-9xl drop-shadow-xl">💥</div>
              <div className="text-3xl sm:text-5xl font-black text-white drop-shadow-2xl mt-2 -rotate-3">
                AUA!
              </div>
              <div className="text-sm sm:text-lg font-bold text-white/90 mt-1">
                Hit-by-Pitch — {hbpFlash}
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
            <button
              onClick={() => setShowSidePrompt(false)}
              className="w-full h-9 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Überspringen
            </button>
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
