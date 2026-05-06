import { useMemo, useState, useEffect } from 'react'
import { Drawer } from 'vaul'
import type { BaseStateDto, RunnerOnBase } from '@/types'

type Position = 1 | 2 | 3 | 'home' | 'out'

interface RunnerAssignment {
  playerId: number
  playerName: string
  position: Position
  wasOnBase: 1 | 2 | 3 | null  // wo war er VORHER
}

/**
 * Context: 'manual' — User hat "Korrigieren"-Button gedrückt, generische Runner-Anpassung
 *          'post-out' — Automatisch nach Out-Play geöffnet, zeigt Grounder/Fly-kontextuelle Texte.
 *                       onSave interpretiert outsFromRunners als OUT_ON_PLAY statt CAUGHT_STEALING.
 */
export type CorrectionContext = 'manual' | 'post-out'

interface Props {
  open: boolean
  onClose: () => void
  baseState?: BaseStateDto  // optional, reserviert für künftige Nutzung
  runners: RunnerOnBase[]
  recentlyScored?: { playerId: number; playerName: string }[]
  context?: CorrectionContext
  onSave: (data: {
    newState: BaseStateDto
    extraRuns: number
    outsFromRunners: number[]
    unscoredPlayerIds: number[]  // Spieler die VORHER 'home' waren, jetzt nicht mehr → Runs abziehen
    context: CorrectionContext
  }) => void | Promise<void>
}

export function CorrectionSheet({ open, onClose, runners, recentlyScored = [], context = 'manual', onSave }: Props) {
  const initial = useMemo<RunnerAssignment[]>(() => {
    const onBase = runners.map(r => ({
      playerId: r.playerId,
      playerName: r.playerName,
      position: r.base as 1 | 2 | 3,
      wasOnBase: r.base as 1 | 2 | 3,
    } as RunnerAssignment))
    const scored = recentlyScored.map(s => ({
      playerId: s.playerId,
      playerName: s.playerName,
      position: 'home' as Position,
      wasOnBase: null,
    }))
    return [...onBase, ...scored]
  }, [runners, recentlyScored])

  const [assignments, setAssignments] = useState<RunnerAssignment[]>(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAssignments(initial)
  }, [initial, open])

  const setPosition = (playerId: number, pos: Position) => {
    setAssignments(arr => arr.map(a => a.playerId === playerId ? { ...a, position: pos } : a))
  }

  const removeAssignment = (playerId: number) => {
    setAssignments(arr => arr.filter(a => a.playerId !== playerId))
  }

  /**
   * Quick-Action: alle Runner um eine Base weiter.
   * Typisch bei Grounder-Out (force-play) — 3B scort, 2B→3B, 1B→2B.
   * User kann danach einzelne Runner noch korrigieren (z.B. einer war Aus).
   */
  const advanceAllOneBase = () => {
    setAssignments(arr => arr.map(a => {
      if (a.position === 'home' || a.position === 'out') return a
      if (a.position === 3) return { ...a, position: 'home' as Position }
      if (a.position === 2) return { ...a, position: 3 as Position }
      if (a.position === 1) return { ...a, position: 2 as Position }
      return a
    }))
  }

  // Build new base state
  // Conflict-Resolution: last assignment wins. User sollte nicht zwei Runner auf gleiche Base packen.
  const hasConflict = useMemo(() => {
    const bases = assignments.filter(a => a.position === 1 || a.position === 2 || a.position === 3)
    const first = bases.filter(a => a.position === 1).length
    const second = bases.filter(a => a.position === 2).length
    const third = bases.filter(a => a.position === 3).length
    return first > 1 || second > 1 || third > 1
  }, [assignments])

  const handleSave = async () => {
    if (hasConflict) return
    const newState: BaseStateDto = {
      first: assignments.find(a => a.position === 1)?.playerId ?? null,
      second: assignments.find(a => a.position === 2)?.playerId ?? null,
      third: assignments.find(a => a.position === 3)?.playerId ?? null,
    }
    // NEU home: Spieler die vorher NICHT 'home' waren, jetzt schon → +Run
    // UnScored: Spieler die vorher 'home' waren (recentlyScored), jetzt nicht → -Run
    const recentlyScoredIds = new Set(recentlyScored.map(r => r.playerId))
    const newHomeAssignments = assignments.filter(a => a.position === 'home' && !recentlyScoredIds.has(a.playerId))
    const extraRuns = newHomeAssignments.length
    const unscoredPlayerIds = recentlyScored
      .filter(rs => {
        const a = assignments.find(a => a.playerId === rs.playerId)
        return a && a.position !== 'home'
      })
      .map(rs => rs.playerId)
    const outsFromRunners = assignments
      .filter(a => a.position === 'out')
      .map(a => a.playerId)
    // Sheet sofort schließen (optimistic). Toast kommt vom Parent-Handler.
    onClose()
    setSaving(true)
    try {
      await onSave({ newState, extraRuns, outsFromRunners, unscoredPlayerIds, context })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Runner korrigieren</Drawer.Title>
          {/* Sticky top mit Drag-Handle + X-Close */}
          <div className="sticky top-0 bg-cream-50 z-10 border-b border-cream-300">
            <div className="w-12 h-1.5 bg-cream-300 rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {context === 'post-out' ? 'Runner weitergelaufen?' : 'Runner anpassen'}
                </h2>
                <p className="text-[11px] text-gray-500">
                  {context === 'post-out'
                    ? 'Bei Grounder/Fly: wohin sind die Runner gelaufen?'
                    : 'Wo sind die Runner wirklich gelandet? Chips tippen.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-700 cursor-pointer"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="px-4 pt-3 pb-6 space-y-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

            {/* Quick-Action: alle +1 Base — nur bei post-out (Grounder-Force).
                Nach Hit (manual) sind Runner bereits via Default-Advance verschoben,
                Button würde sie nochmal weiterschieben → meist falsch. */}
            {context === 'post-out' && assignments.some(a => a.position === 1 || a.position === 2 || a.position === 3) && (
              <button
                onClick={advanceAllOneBase}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-navy-300 bg-navy-50 text-navy-800 text-sm font-semibold cursor-pointer hover:bg-navy-100 hover:border-navy-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                title="Alle Runner rücken eine Base weiter (typisch bei Grounder-Force)"
              >
                <span>Alle Runner +1 Base</span>
                <span className="text-xs font-normal opacity-70">(danach fein-korrigieren)</span>
              </button>
            )}

            {assignments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Kein Runner auf Base.</p>
            )}

            {assignments.map(a => (
              <RunnerCard
                key={a.playerId}
                assignment={a}
                onCycle={() => setPosition(a.playerId, nextCyclePosition(a))}
                onToggleOut={() => setPosition(a.playerId, a.position === 'out' ? (a.wasOnBase ?? 'home') : 'out')}
                onToggleHome={() => setPosition(a.playerId, a.position === 'home' ? (a.wasOnBase ?? 'home') : 'home')}
                onRemove={() => removeAssignment(a.playerId)}
              />
            ))}


            {hasConflict && (
              <div className="text-xs text-softball-red-600 bg-softball-red-50 rounded-lg p-2 text-center">
                Zwei Runner auf derselben Base — bitte prüfen.
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-gray-500 mb-2">
                Vorschau: {baseStateSummary(
                  {
                    first: assignments.find(a => a.position === 1)?.playerId ?? null,
                    second: assignments.find(a => a.position === 2)?.playerId ?? null,
                    third: assignments.find(a => a.position === 3)?.playerId ?? null,
                  },
                  assignments
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onClose}
                  className="h-11 rounded-lg border border-cream-300 text-gray-700 font-medium cursor-pointer hover:bg-cream-100"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || hasConflict}
                  className="h-11 rounded-lg bg-softball-red-600 text-white font-bold cursor-pointer hover:bg-softball-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Speichern…' : '✓ Speichern'}
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function baseStateSummary(state: BaseStateDto, assignments: RunnerAssignment[]): string {
  const parts: string[] = []
  if (state.first) {
    const a = assignments.find(x => x.playerId === state.first)
    if (a) parts.push(`1B: ${a.playerName}`)
  }
  if (state.second) {
    const a = assignments.find(x => x.playerId === state.second)
    if (a) parts.push(`2B: ${a.playerName}`)
  }
  if (state.third) {
    const a = assignments.find(x => x.playerId === state.third)
    if (a) parts.push(`3B: ${a.playerName}`)
  }
  const home = assignments.filter(a => a.position === 'home').length
  const outs = assignments.filter(a => a.position === 'out').length
  if (home > 0) parts.push(`${home} scort`)
  if (outs > 0) parts.push(`${outs} Aus`)
  if (parts.length === 0) return 'Bases leer'
  return parts.join(' · ')
}

/**
 * Cycle: bleibt → +1 Base → +2 Bases → Home → bleibt.
 * Range basiert auf Start-Base (1B-Runner: 1→2→3→Home; 2B: 2→3→Home; 3B: 3→Home).
 * Kein Rückwärts-Cycle (Runner kann nicht zu vorheriger Base laufen).
 */
function nextCyclePosition(a: RunnerAssignment): Position {
  const from = a.wasOnBase ?? 'home'
  if (from === 'home') {
    // Recently-scored Runner — Toggle zwischen home ↔ ausgangs-base unmöglich, daher Cycle ist No-op.
    // Hat eigene UI in RunnerCard (Home-Toggle).
    return a.position
  }
  // Cycle steps abhängig vom Start
  const steps: Position[] = []
  for (let b = from; b <= 3; b++) steps.push(b as Position)
  steps.push('home')
  // Wenn aktuell out: zurück zur Start-Base
  if (a.position === 'out') return from
  const idx = steps.indexOf(a.position)
  if (idx === -1) return from
  return steps[(idx + 1) % steps.length]
}

function cycleLabel(a: RunnerAssignment): string {
  if (a.position === 'out') return '✕ Aus'
  if (a.position === 'home') return '→ Home (Run!)'
  if (a.wasOnBase != null && a.position === a.wasOnBase) return `bleibt ${a.wasOnBase}B`
  if (typeof a.position === 'number') return `→ ${a.position}B`
  return 'bleibt'
}

function cycleColor(a: RunnerAssignment): string {
  if (a.position === 'out') return 'bg-softball-red-50 border-softball-red-300 text-softball-red-800'
  if (a.position === 'home') return 'bg-softball-red-600 border-softball-red-700 text-white'
  if (a.wasOnBase != null && a.position !== a.wasOnBase) {
    return 'bg-emerald-100 border-emerald-400 text-emerald-900'
  }
  return 'bg-cream-50 border-cream-300 text-gray-700'
}

interface RunnerCardProps {
  assignment: RunnerAssignment
  onCycle: () => void
  onToggleOut: () => void
  onToggleHome: () => void
  onRemove: () => void
}

function RunnerCard({ assignment: a, onCycle, onToggleOut, onToggleHome, onRemove }: RunnerCardProps) {
  const fromHome = a.wasOnBase == null
  return (
    <div className="border border-cream-300 rounded-xl p-3 bg-cream-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-bold text-gray-900">{a.playerName}</div>
          {a.wasOnBase != null && (
            <div className="text-xs text-gray-500">war auf {a.wasOnBase}B</div>
          )}
          {fromHome && (
            <div className="text-xs text-gray-500">war Home (gescort)</div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-600 text-sm"
          title="Eintrag entfernen"
        >
          ✕
        </button>
      </div>
      <div className="flex items-stretch gap-2">
        {fromHome ? (
          // Recently-scored Runner: Toggle zwischen Home und (kein Run)
          <button
            onClick={onToggleHome}
            className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer transition-colors ${
              a.position === 'home'
                ? 'bg-softball-red-600 border-softball-red-700 text-white'
                : 'bg-cream-50 border-cream-300 text-gray-700 hover:bg-cream-200'
            }`}
          >
            {a.position === 'home' ? '✓ Home (Run!)' : '✕ doch nicht gescort'}
          </button>
        ) : (
          <button
            onClick={onCycle}
            disabled={a.position === 'out'}
            className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cycleColor(a)}`}
          >
            {cycleLabel(a)}
          </button>
        )}
        <button
          onClick={onToggleOut}
          className={`px-3 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
            a.position === 'out'
              ? 'bg-softball-red-600 border-softball-red-700 text-white'
              : 'bg-white border-softball-red-200 text-softball-red-700 hover:bg-softball-red-50'
          }`}
          title={a.position === 'out' ? 'Wieder auf Base' : 'Als Out markieren'}
        >
          {a.position === 'out' ? '✕ Aus' : 'Aus?'}
        </button>
      </div>
    </div>
  )
}
