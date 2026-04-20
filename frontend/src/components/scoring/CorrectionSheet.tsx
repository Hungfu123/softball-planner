import { useMemo, useState, useEffect } from 'react'
import { Drawer } from 'vaul'
import type { BaseStateDto, Player, RunnerOnBase } from '@/types'

type Position = 1 | 2 | 3 | 'home' | 'out'

interface RunnerAssignment {
  playerId: number
  playerName: string
  position: Position
  wasOnBase: 1 | 2 | 3 | null  // wo war er VORHER
}

interface Props {
  open: boolean
  onClose: () => void
  baseState?: BaseStateDto  // optional, reserviert für künftige Nutzung
  runners: RunnerOnBase[]
  availablePlayers: Player[]
  onSave: (data: { newState: BaseStateDto; extraRuns: number; outsFromRunners: number[] }) => void | Promise<void>
}

export function CorrectionSheet({ open, onClose, runners, availablePlayers, onSave }: Props) {
  const initial = useMemo<RunnerAssignment[]>(() => {
    return runners.map(r => ({
      playerId: r.playerId,
      playerName: r.playerName,
      position: r.base as 1 | 2 | 3,
      wasOnBase: r.base as 1 | 2 | 3,
    }))
  }, [runners])

  const [assignments, setAssignments] = useState<RunnerAssignment[]>(initial)
  const [saving, setSaving] = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)

  useEffect(() => {
    setAssignments(initial)
  }, [initial, open])

  const assignedIds = new Set(assignments.map(a => a.playerId))
  const candidates = availablePlayers.filter(p => !assignedIds.has(p.id))

  const setPosition = (playerId: number, pos: Position) => {
    setAssignments(arr => arr.map(a => a.playerId === playerId ? { ...a, position: pos } : a))
  }

  const removeAssignment = (playerId: number) => {
    setAssignments(arr => arr.filter(a => a.playerId !== playerId))
  }

  const addRunner = (player: Player, position: Position) => {
    setAssignments(arr => [...arr, {
      playerId: player.id,
      playerName: player.name,
      position,
      wasOnBase: null,
    }])
    setShowAddPicker(false)
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
    const extraRuns = assignments.filter(a => a.position === 'home').length
    const outsFromRunners = assignments
      .filter(a => a.position === 'out')
      .map(a => a.playerId)
    // Sheet sofort schließen (optimistic). Toast kommt vom Parent-Handler.
    onClose()
    setSaving(true)
    try {
      await onSave({ newState, extraRuns, outsFromRunners })
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
                <h2 className="text-lg font-bold text-gray-900">Runner anpassen</h2>
                <p className="text-[11px] text-gray-500">
                  Wo sind die Runner wirklich gelandet? Chips tippen.
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

            {!showAddPicker && candidates.length > 0 && (
              <button
                onClick={() => setShowAddPicker(true)}
                className="w-full h-11 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:border-navy-400 hover:text-navy-700 cursor-pointer"
              >
                + Runner hinzufügen
              </button>
            )}

            {showAddPicker && (
              <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-blue-50/40">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Spieler setzen auf…</h3>
                  <button
                    onClick={() => setShowAddPicker(false)}
                    className="text-gray-500 text-sm cursor-pointer"
                  >
                    Abbrechen
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Nützlich z.B. wenn Runner fälschlich als &quot;scored&quot; gezählt wurde aber eigentlich AUS war.
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {candidates.map(p => (
                    <div key={p.id} className="flex items-center gap-1 p-2 bg-white rounded-lg flex-wrap">
                      <span className="flex-1 min-w-0 text-sm font-medium truncate">{p.name}</span>
                      <button
                        onClick={() => addRunner(p, 1)}
                        className="px-2 py-1 text-xs bg-navy-100 text-navy-700 rounded cursor-pointer hover:bg-navy-200"
                      >1B</button>
                      <button
                        onClick={() => addRunner(p, 2)}
                        className="px-2 py-1 text-xs bg-navy-100 text-navy-700 rounded cursor-pointer hover:bg-navy-200"
                      >2B</button>
                      <button
                        onClick={() => addRunner(p, 3)}
                        className="px-2 py-1 text-xs bg-navy-100 text-navy-700 rounded cursor-pointer hover:bg-navy-200"
                      >3B</button>
                      <button
                        onClick={() => addRunner(p, 'home')}
                        className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded cursor-pointer hover:bg-emerald-200"
                        title="Home = scort"
                      >Home</button>
                      <button
                        onClick={() => addRunner(p, 'out')}
                        className="px-2 py-1 text-xs bg-softball-red-100 text-softball-red-700 rounded cursor-pointer hover:bg-softball-red-200"
                        title="Aus = Caught Stealing / Runner out"
                      >Aus</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasConflict && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2 text-center">
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
