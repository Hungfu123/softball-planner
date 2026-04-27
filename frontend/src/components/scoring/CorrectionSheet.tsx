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
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Runner korrigieren</Drawer.Title>
          {/* Sticky top mit Drag-Handle + X-Close */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
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
              <div key={a.playerId} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-bold text-gray-900">{a.playerName}</div>
                    {a.wasOnBase && (
                      <div className="text-xs text-gray-500">war auf {a.wasOnBase}B</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeAssignment(a.playerId)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                    title="Eintrag entfernen"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {([1, 2, 3] as const).map(b => (
                    <Chip
                      key={b}
                      label={`${b}B`}
                      active={a.position === b}
                      onClick={() => setPosition(a.playerId, b)}
                    />
                  ))}
                  <Chip
                    label="Home ✓"
                    active={a.position === 'home'}
                    onClick={() => setPosition(a.playerId, 'home')}
                    color="emerald"
                  />
                  <Chip
                    label="✕ Aus"
                    active={a.position === 'out'}
                    onClick={() => setPosition(a.playerId, 'out')}
                    color="red"
                  />
                </div>
              </div>
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
                  className="h-11 rounded-lg border border-gray-300 text-gray-700 font-medium cursor-pointer hover:bg-gray-50"
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

function Chip({ label, active, onClick, color = 'navy' }: { label: string; active: boolean; onClick: () => void; color?: 'navy' | 'emerald' | 'red' }) {
  const base = 'px-3 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors'
  const variants = {
    navy: active ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 border border-navy-200 hover:bg-navy-50',
    emerald: active ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50',
    red: active ? 'bg-softball-red-600 text-white' : 'bg-white text-softball-red-700 border border-softball-red-200 hover:bg-softball-red-50',
  }
  return <button onClick={onClick} className={`${base} ${variants[color]}`}>{label}</button>
}
