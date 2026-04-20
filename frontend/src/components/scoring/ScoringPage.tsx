import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Drawer } from 'vaul'
import { useScoring } from '@/hooks/useScoring'
import { useToastContext } from '@/components/layout/Layout'
import { ChevronLeft } from '@/icons'
import { DiamondView } from './DiamondView'
import { ActionButtons } from './ActionButtons'
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

  const currentInning = scoreboard?.currentInning ?? 1

  const handleRecord = async (result: AtBatResult) => {
    if (!scoreboard || !scoreboard.currentBatterId) {
      toast.show('Kein Schlagmann gesetzt — bitte Lineup erstellen', 'error')
      return
    }
    setSubmitting(true)
    try {
      const nextState = advanceBases(scoreboard.baseState, result, scoreboard.currentBatterId)
      const runsScored = countScored(scoreboard.baseState, nextState, result, scoreboard.currentBatterId)
      await recordAtBat({
        batterId: scoreboard.currentBatterId,
        result,
        inning: currentInning,
        baseStateAfter: nextState,
        runsScored,
        rbi: runsScored, // V1: RBI = Runs Scored (Vereinfachung)
      })
      if (result === 'HOMERUN') toast.show('🎉 HOME RUN!', 'success')
      else if (runsScored > 0) toast.show(`${runsScored} Run${runsScored > 1 ? 's' : ''} gescort!`, 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
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
    try {
      await recordStealingEvent({
        runnerId: stealingRunner.playerId,
        type,
        inning: currentInning,
      })
      // Bei STOLEN_BASE Runner-Position im BaseState weitersetzen via neuem AtBat-Update nicht —
      // V1 trackt den Event nur als Stat, Base-State bleibt unverändert bis zum nächsten AtBat.
      // Für Polish V2: Base-State auch aktualisieren.
      toast.show(type === 'STOLEN_BASE' ? `⚡ ${stealingRunner.playerName} klaut!` : `${stealingRunner.playerName} gefangen`, 'success')
      setStealingRunner(null)
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
  const outs = scoreboard?.outsInCurrentInning ?? 0

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
          <div className="w-16" />
        </div>
      </header>

      {/* Scoreboard Strip */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-navy-900 tabular-nums">{scoreUs}</span>
            <span className="text-xl text-gray-400">:</span>
            <span className="text-3xl font-black text-gray-600 tabular-nums">{scoreThem}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-700">{currentInning}. Inning</div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${i < outs ? 'bg-softball-red-600' : 'bg-gray-200'}`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1 tabular-nums">{outs} Aus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diamond */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 px-4">
        <DiamondView
          baseState={scoreboard?.baseState ?? { first: null, second: null, third: null }}
          runners={scoreboard?.runners ?? []}
          onRunnerTap={handleRunnerTap}
        />
      </div>

      {/* Batter Card */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        {scoreboard?.currentBatterId ? (
          <div className="flex items-center gap-3">
            <span className="text-xs bg-navy-900 text-white font-bold px-2 py-1 rounded-lg tabular-nums">
              #{scoreboard.currentBatterOrder ?? '?'}
            </span>
            <span className="font-bold text-lg text-gray-900 uppercase tracking-wide">
              {scoreboard.currentBatterName}
            </span>
            <span className="text-sm text-gray-500 ml-auto">⚾ am Schlag</span>
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-1">
            Kein Schlagmann — bitte zuerst Lineup erstellen
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-4 bg-white border-t border-gray-200 sticky bottom-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <ActionButtons onRecord={handleRecord} disabled={submitting || !scoreboard?.currentBatterId} />

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={atBats.length === 0 || submitting}
          className="w-full mt-3 h-11 rounded-lg bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          ↶ Letzte Aktion rückgängig
        </button>
      </div>

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
                  <button
                    onClick={() => handleStealing('STOLEN_BASE')}
                    className="w-full h-16 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base cursor-pointer shadow-sm"
                  >
                    ⚡ Stolen Base
                    <div className="text-xs font-normal opacity-90">Base geklaut</div>
                  </button>
                  <button
                    onClick={() => handleStealing('CAUGHT_STEALING')}
                    className="w-full h-16 rounded-xl bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold text-base cursor-pointer shadow-sm"
                  >
                    ❌ Caught Stealing
                    <div className="text-xs font-normal opacity-90">Beim Klauen gefangen</div>
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

      {/* Debug: reload silently wenn nötig */}
      <button onClick={reload} className="hidden" aria-hidden />
    </div>
  )
}

// --- Smart-Advance-Defaults für Runner ---
function advanceBases(state: BaseStateDto, result: AtBatResult, batterId: number): BaseStateDto {
  let advance = 0
  switch (result) {
    case 'SINGLE': advance = 1; break
    case 'DOUBLE': advance = 2; break
    case 'TRIPLE': advance = 3; break
    case 'HOMERUN': advance = 4; break
    case 'WALK':
    case 'HIT_BY_PITCH': {
      // Force-advance nur wenn Bases besetzt sind vor Batter
      const next: BaseStateDto = { first: batterId, second: state.second, third: state.third }
      if (state.first != null) {
        next.second = state.first
        if (state.second != null) {
          next.third = state.second
          // third läuft Home — V1 verzichtet auf Zählung, User kann korrigieren
        }
      }
      return next
    }
    case 'STRIKEOUT':
    case 'OUT':
      return state
  }
  // Hit: Smart-Default (Runner auf 2B oder 3B rennen Home bei Single/Double)
  if (result === 'SINGLE') {
    return {
      first: batterId,
      second: state.first,
      third: null, // 2B → Home (Standard-Vorschlag)
      // 3B → Home, 2B → Home: beide erledigt (raus aus diamond)
    }
  }
  if (result === 'DOUBLE') {
    return {
      first: null,
      second: batterId,
      third: state.first, // 1B → 3B
      // 2B, 3B → Home
    }
  }
  if (result === 'TRIPLE') {
    return {
      first: null,
      second: null,
      third: batterId, // alle anderen Home
    }
  }
  if (result === 'HOMERUN') {
    return { first: null, second: null, third: null }
  }
  // fallback via advance-count
  void advance
  return state
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
