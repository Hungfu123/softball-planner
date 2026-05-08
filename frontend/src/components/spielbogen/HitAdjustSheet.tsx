import { useEffect, useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { BogenBaseStateDto, RunnerAdvanceEntry, SpielbogenSlotResponse, AtBatResult } from '@/types'
import { computeDefaultAdvances } from '@/utils/runnerAdvanceDefaults'

interface Props {
  open: boolean
  onClose: () => void
  /** State NACH dem Hit (optimistisch via computeBaseStateAdvance gesetzt). */
  baseStateAfter: BogenBaseStateDto
  /** State VOR dem Hit — wird für RunnerAdvance-Berechnung benötigt. */
  baseStateBefore: BogenBaseStateDto | null
  /** Vom Hit gezählte Runs (optimistisch). */
  initialRunsScored: number
  /** Hit-Type für Hint (Single/Double/Triple). */
  hitResult: 'SINGLE' | 'DOUBLE' | 'TRIPLE'
  /** Outs im aktuellen Inning VOR diesem Hit. Wird mit outsFromRunners
   *  kombiniert um Force-Play-3rd-Out-Regel zu prüfen. */
  outsBefore: number
  slots: SpielbogenSlotResponse[]
  onConfirm: (payload: {
    firstSlotId: number | null
    secondSlotId: number | null
    thirdSlotId: number | null
    runsScored: number
    runnerAdvances: RunnerAdvanceEntry[]
    /** Runner-SlotIds die als out markiert wurden (z.B. thrown-out an Home).
     *  Werden vom Parent als OUT_ON_PLAY-Events recorded für PDF-Notation. */
    outsFromRunners: { slotId: number; fromBase: 1 | 2 | 3 }[]
  }) => Promise<void>
}

type Position = 1 | 2 | 3 | 'home' | 'out'

interface Assignment {
  slotId: number
  name: string
  startBase: 1 | 2 | 3 | 'home-after-hit'
  position: Position
}

export function HitAdjustSheet({ open, onClose, baseStateAfter, baseStateBefore, initialRunsScored, hitResult, outsBefore, slots, onConfirm }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [scoredCount, setScoredCount] = useState(initialRunsScored)
  const [saving, setSaving] = useState(false)
  const [forceOutRule, setForceOutRule] = useState(false)

  // Initial state aus baseStateAfter — alle aktuell auf base + recently scored.
  // Batter wird ausgeschlossen (war nicht in baseStateBefore) — sein Reach via Hit
  // ist vorgegeben (1B/2B/3B), keine Anpassung nötig.
  useEffect(() => {
    if (!open) return
    const beforeSlotIds = new Set<number>([
      baseStateBefore?.firstSlotId,
      baseStateBefore?.secondSlotId,
      baseStateBefore?.thirdSlotId,
    ].filter((id): id is number => id != null))
    const onBase: Assignment[] = []
    const pairs: Array<{ slotId: number | null; base: 1 | 2 | 3 }> = [
      { slotId: baseStateAfter.firstSlotId, base: 1 },
      { slotId: baseStateAfter.secondSlotId, base: 2 },
      { slotId: baseStateAfter.thirdSlotId, base: 3 },
    ]
    for (const { slotId, base } of pairs) {
      if (slotId == null) continue
      if (!beforeSlotIds.has(slotId)) continue // skip Batter
      const slot = slots.find(s => s.id === slotId)
      if (!slot) continue
      onBase.push({ slotId, name: slot.name, startBase: base, position: base })
    }
    setAssignments(onBase)
    setScoredCount(initialRunsScored)
  }, [open, baseStateAfter.firstSlotId, baseStateAfter.secondSlotId, baseStateAfter.thirdSlotId, baseStateBefore?.firstSlotId, baseStateBefore?.secondSlotId, baseStateBefore?.thirdSlotId, initialRunsScored, slots])

  const cycle = (slotId: number) => {
    setAssignments(arr => arr.map(a => {
      if (a.slotId !== slotId) return a
      // Cycle: bleibt → +1 → +2 → Home → bleibt (immer ab startBase)
      if (a.startBase === 'home-after-hit') return a
      const start = a.startBase as 1 | 2 | 3
      const steps: Position[] = []
      for (let b = start; b <= 3; b++) steps.push(b as Position)
      steps.push('home')
      const idx = steps.indexOf(a.position)
      const next = steps[(idx + 1) % steps.length]
      return { ...a, position: next }
    }))
  }

  const toggleOut = (slotId: number) => {
    setAssignments(arr => arr.map(a => {
      if (a.slotId !== slotId) return a
      if (a.position === 'out') return { ...a, position: a.startBase === 'home-after-hit' ? 'home' : a.startBase }
      return { ...a, position: 'out' as Position }
    }))
  }

  const labelFor = (a: Assignment): string => {
    if (a.position === 'out') {
      return a.startBase === 'home-after-hit' ? 'Home (war)' : `bleibt ${a.startBase}B`
    }
    if (a.position === 'home') return '→ Home (Run!)'
    if (typeof a.position === 'number' && a.startBase !== 'home-after-hit' && a.position === a.startBase) {
      return `bleibt ${a.startBase}B`
    }
    if (typeof a.position === 'number') return `→ ${a.position}B`
    return 'bleibt'
  }

  const colorFor = (a: Assignment): string => {
    if (a.position === 'out') return 'bg-softball-red-50 border-softball-red-300 text-softball-red-800'
    if (a.position === 'home') return 'bg-softball-red-600 border-softball-red-700 text-white'
    if (typeof a.position === 'number' && a.startBase !== 'home-after-hit' && a.position !== a.startBase) {
      return 'bg-emerald-50 border-emerald-300 text-emerald-800'
    }
    return 'bg-cream-50 border-cream-300 text-gray-700'
  }

  // Compute new state from assignments
  const newState = (() => {
    const state: { firstSlotId: number | null; secondSlotId: number | null; thirdSlotId: number | null } = {
      firstSlotId: null, secondSlotId: null, thirdSlotId: null,
    }
    for (const a of assignments) {
      if (a.position === 1) state.firstSlotId = a.slotId
      else if (a.position === 2) state.secondSlotId = a.slotId
      else if (a.position === 3) state.thirdSlotId = a.slotId
    }
    return state
  })()

  // Validation: collision (zwei auf gleicher Base)
  const collidingBases = (() => {
    const counts: Record<number, number> = {}
    for (const a of assignments) {
      if (typeof a.position !== 'number') continue
      counts[a.position] = (counts[a.position] ?? 0) + 1
    }
    return Object.entries(counts)
      .filter(([, c]) => c > 1)
      .map(([b]) => Number(b) as 1 | 2 | 3)
  })()
  const hasCollision = collidingBases.length > 0

  const outsFromRunners = assignments
    .filter(a => a.position === 'out' && a.startBase !== 'home-after-hit')
    .map(a => ({
      slotId: a.slotId,
      fromBase: a.startBase as 1 | 2 | 3,
    }))

  // Runs = ursprüngliche scored (bereits beim Hit Home gegangen) + delta
  const baseRuns = (() => {
    let delta = 0
    for (const a of assignments) {
      if (a.position === 'home' && a.startBase !== 'home-after-hit') delta += 1
    }
    return scoredCount + delta
  })()

  // Force-Out-3rd-Out-Regel: wenn ein Runner-Out das 3. Out wird UND ein Run
  // gleichzeitig scort → bei Force-Out zählt Run NICHT (Inning endet vor Run).
  // Nur Tag-Out / non-force: Run zählt.
  const wouldBe3rdOutViaRunner = outsBefore + outsFromRunners.length >= 3 && outsFromRunners.length > 0
  const showForceOutOption = wouldBe3rdOutViaRunner && baseRuns > 0
  const finalRuns = showForceOutOption && forceOutRule ? 0 : baseRuns

  const handleConfirm = async () => {
    if (hasCollision) return
    setSaving(true)
    try {
      const advances = computeDefaultAdvances({
        abResult: hitResult,
        baseStateBefore,
        baseStateAfter: newState,
      })
      await onConfirm({
        firstSlotId: newState.firstSlotId,
        secondSlotId: newState.secondSlotId,
        thirdSlotId: newState.thirdSlotId,
        runsScored: Math.max(0, finalRuns),
        runnerAdvances: advances,
        outsFromRunners,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const hitLabel = hitResult === 'SINGLE' ? 'Single' : hitResult === 'DOUBLE' ? 'Double' : 'Triple'

  const footer = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 py-2 text-sm text-gray-600 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
      >
        Abbrechen
      </button>
      <button
        onClick={handleConfirm}
        disabled={saving || hasCollision}
        className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-softball-red-600 hover:bg-softball-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        ✓ Passt
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={`${hitLabel} — Runner anpassen?`} maxWidth="md" footer={footer}>
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500 font-body">
          Default: Runner advancen optimistisch. Korrigieren falls jemand thrown-out an Home wurde oder anders gelaufen ist.
        </p>
        {assignments.length > 0 && (
          <p className="text-[11px] text-gray-500 italic px-1">
            <span className="font-bold text-navy-800">Tipp</span> auf Pille = nächste Base · Tipp erneut für weitere
          </p>
        )}
        <div className="space-y-1.5">
          {assignments.map(a => (
            <div key={a.slotId} className="border border-cream-300 rounded-lg px-2 py-1.5 bg-cream-100 flex items-center gap-2">
              <div className="min-w-0 flex-shrink-0 w-20">
                <div className="text-sm font-bold text-gray-900 truncate leading-tight">{a.name}</div>
                <div className="text-[10px] text-gray-500 leading-tight">
                  {a.startBase === 'home-after-hit' ? 'gescort' : `war ${a.startBase}B`}
                </div>
              </div>
              <button
                onClick={() => cycle(a.slotId)}
                disabled={a.position === 'out'}
                className={`flex-1 px-2 py-2 rounded-md border text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorFor(a)}`}
              >
                {labelFor(a)}
              </button>
              <button
                onClick={() => toggleOut(a.slotId)}
                className={`px-2 py-2 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                  a.position === 'out'
                    ? 'bg-softball-red-600 border-softball-red-700 text-white'
                    : 'bg-white border-softball-red-200 text-softball-red-700 hover:bg-softball-red-50'
                }`}
              >
                {a.position === 'out' ? '✕ Aus' : 'Aus?'}
              </button>
            </div>
          ))}
        </div>
        {hasCollision && (
          <div className="bg-softball-red-50 border border-softball-red-300 rounded-lg p-2.5 text-xs text-softball-red-900 font-body">
            ⚠ <strong>Konflikt:</strong> Zwei Runner auf gleicher Base ({collidingBases.map(b => `${b}B`).join(', ')}). Anpassen.
          </div>
        )}
        {showForceOutOption && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-900 font-body space-y-2">
            <div>
              ⚠ <strong>3. Out durch Runner-Out + Run gleichzeitig.</strong>
              {' '}Bei <strong>Force-Out</strong> zählt der Run NICHT (Softball-Regel — Inning endet vor Run).
              {' '}Nur bei Tag-Out (non-force) zählt der Run.
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-amber-900">
              <input
                type="checkbox"
                checked={forceOutRule}
                onChange={e => setForceOutRule(e.target.checked)}
                className="w-4 h-4 rounded border-amber-400 accent-amber-700 cursor-pointer"
              />
              <span className="font-semibold">Force-Out — Run zählt nicht (auf 0 setzen)</span>
            </label>
          </div>
        )}
        <div className="text-[11px] text-gray-500 pt-1 border-t border-cream-300">
          Vorschau: {finalRuns} {finalRuns === 1 ? 'Run' : 'Runs'} · Bases: {' '}
          {newState.firstSlotId ? '1B' : '—'} / {newState.secondSlotId ? '2B' : '—'} / {newState.thirdSlotId ? '3B' : '—'}
        </div>
      </div>
    </ResponsiveSheet>
  )
}

// Re-export AtBatResult Hit-Subset for clarity
export type HitResult = Extract<AtBatResult, 'SINGLE' | 'DOUBLE' | 'TRIPLE'>
