import { useState } from 'react'
import { Drawer } from 'vaul'
import type { SpielbogenRecordAtBatRequest, BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'
import { computeForceDefaults } from '@/utils/bogenBaseAdvance'
import { HelpPopover } from '@/components/shared/HelpPopover'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  baseStateAfter: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
  batterSlotId: number | null
  /** Outs vor diesem AB (0/1/2). Bei 2 Outs zaehlt ein Fly-Catch nicht mehr Runs (Inning endet). */
  outs: number
}

const POSITION_NAMES: Record<number, string> = {
  1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS',
  7: 'LF', 8: 'CF', 9: 'RF',
}

// Rough positions in a 280x240 svg viewbox arranged like a field
const FIELD_POSITIONS: Array<{ pos: number; cx: number; cy: number }> = [
  { pos: 7, cx: 55,  cy: 45 },  // LF
  { pos: 8, cx: 140, cy: 25 },  // CF
  { pos: 9, cx: 225, cy: 45 },  // RF
  { pos: 5, cx: 72,  cy: 115 }, // 3B
  { pos: 6, cx: 108, cy: 100 }, // SS
  { pos: 4, cx: 168, cy: 100 }, // 2B
  { pos: 3, cx: 210, cy: 115 }, // 1B
  { pos: 1, cx: 140, cy: 130 }, // P
  { pos: 2, cx: 140, cy: 180 }, // C
]

// ---------------------------------------------------------------------------
// Shared helper: apply runner advances to a base state
// ---------------------------------------------------------------------------
function applyAdvances(
  before: BogenBaseStateDto | null,
  advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[],
): { baseStateAfter: BogenBaseStateDto; runsScored: number } {
  const b = before ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  const after: BogenBaseStateDto = { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  let runs = 0

  // Process highest base first to avoid overwrite conflicts
  const place = (slotId: number, target: 1 | 2 | 3 | 4) => {
    if (target === 4) { runs += 1; return }
    if (target === 3) {
      if (after.thirdSlotId == null) after.thirdSlotId = slotId
      else if (after.secondSlotId == null) after.secondSlotId = slotId
      else after.firstSlotId = slotId
      return
    }
    if (target === 2) {
      if (after.secondSlotId == null) after.secondSlotId = slotId
      else after.firstSlotId = slotId
      return
    }
    after.firstSlotId = slotId
  }

  if (b.thirdSlotId != null) {
    const t = advances.find(a => a.fromBase === 3)?.toBase ?? 3
    place(b.thirdSlotId, t)
  }
  if (b.secondSlotId != null) {
    const t = advances.find(a => a.fromBase === 2)?.toBase ?? 2
    place(b.secondSlotId, t)
  }
  if (b.firstSlotId != null) {
    const t = advances.find(a => a.fromBase === 1)?.toBase ?? 1
    place(b.firstSlotId, t)
  }

  return { baseStateAfter: after, runsScored: runs }
}

// ---------------------------------------------------------------------------
// InfieldOptionsView
// ---------------------------------------------------------------------------
interface InfieldOptionsProps {
  fielder: number
  hasRunners: boolean
  baseState: BogenBaseStateDto
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  onDpPick: (fielder: number, defaultDpPartner: number) => void
  onRunnerOutPick: (fielder: number) => void
  onAdvancePick: (fielder: number, throwTarget: 1 | 2 | 3 | 4, baseSubmit: Partial<SpielbogenRecordAtBatRequest>) => void
  onBack: () => void
}

// Force-Out-Detection: Runner an base B ist forced wenn alle bases 1..B-1
// vor dem Play besetzt waren (Batter zaehlt als garantiert auf 1B → forciert 1B-Runner).
// fromBase=1 → IMMER force (batter geht 1B). fromBase=2 → force iff 1B besetzt.
// fromBase=3 → force iff 1B UND 2B besetzt.
function isForceOutFromBase(before: BogenBaseStateDto, fromBase: 1 | 2 | 3): boolean {
  if (fromBase === 1) return true
  if (fromBase === 2) return before.firstSlotId != null
  return before.firstSlotId != null && before.secondSlotId != null
}

// Maps Infield-Fielder-Position → Base where they typically tag/throw
// (used for Smart-Default Runner-Advance). Outfielders go through Fly-Out path, not relevant here.
// P (1) typically pivots to 1B for unassisted plays.
const FIELDER_TO_BASE: Record<number, 1 | 2 | 3 | 4> = {
  1: 1, // P → 1B
  2: 4, // C → Home
  3: 1, // 1B → 1B
  4: 2, // 2B → 2B
  5: 3, // 3B → 3B
  6: 2, // SS → 2B
}

function InfieldOptionsView({
  fielder,
  hasRunners,
  baseState,
  onSubmit,
  onDpPick,
  onRunnerOutPick,
  onAdvancePick,
  onBack,
}: InfieldOptionsProps) {
  const defaultThrow = 3
  const defaultDpPartner = fielder === 6 ? 4 : defaultThrow
  const [isSacBunt, setIsSacBunt] = useState(false)

  const handleDpClick = () => {
    const runnerCount =
      (baseState.firstSlotId != null ? 1 : 0) +
      (baseState.secondSlotId != null ? 1 : 0) +
      (baseState.thirdSlotId != null ? 1 : 0)

    if (runnerCount === 0) return
    // Auch bei 1 Runner DpPicker öffnen — sonst kein Tap-Picker für Fielder-Chain.
    onDpPick(fielder, defaultDpPartner)
  }

  const handleGrounderOut = (
    outType: 'GROUNDER' | 'UNASSISTED',
    chain: number[],
  ) => {
    const baseSubmit: Partial<SpielbogenRecordAtBatRequest> = {
      result: 'OUT',
      outType,
      fielderChain: chain,
      ...(isSacBunt ? { sacrificeType: 'BUNT' as const } : {}),
    }
    if (hasRunners) {
      const lastFielder = chain[chain.length - 1]
      const throwTarget = FIELDER_TO_BASE[lastFielder] ?? 1
      onAdvancePick(fielder, throwTarget, baseSubmit)
      return
    }
    onSubmit(baseSubmit)
  }

  const options: Array<{ label: string; description: string; action: () => void; primary?: boolean }> = [
    {
      label: `▶ Wirft zu 1B (${fielder}-3)`,
      description: 'Normale Groundout, Throw to 1B',
      primary: true,
      action: () => handleGrounderOut('GROUNDER', [fielder, defaultThrow]),
    },
    {
      label: `Solo-Out (${fielder} unassisted)`,
      description: 'Fielder schafft Out alleine',
      action: () => handleGrounderOut('UNASSISTED', [fielder]),
    },
    ...(hasRunners ? [
      {
        label: `Double Play (${fielder}-${defaultDpPartner}-3)`,
        description: 'Doppelspiel — Runner wählen',
        action: handleDpClick,
      },
      {
        label: `Fielder's Choice — Runner out, Batter safe an 1B`,
        description: 'Z.B. Throw to Home: Runner an 3B getaggt, Batter erreicht 1B',
        action: () => onRunnerOutPick(fielder),
      },
    ] : []),
  ]

  return (
    <div className="space-y-2">
      <p className="text-sm font-display font-bold text-navy-900 uppercase tracking-wide mb-3">
        Feldposition {POSITION_NAMES[fielder]} ({fielder})
      </p>
      {hasRunners && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 pb-1">
          <input
            type="checkbox"
            checked={isSacBunt}
            onChange={e => setIsSacBunt(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-navy-800 cursor-pointer"
          />
          <span>Als Sacrifice Bunt werten (SH)</span>
          <HelpPopover
            title="Sacrifice Bunt (SH)"
            body={
              <>
                <p>Batter buntet absichtlich, damit Runner advancen kann. Batter wird out an 1B — opfert sich ("sacrifice").</p>
                <p><strong>Wann ankreuzen:</strong> Batter hat absichtlich gebuntet um Runner weiterzubringen.</p>
                <p><strong>Wirkung:</strong> AB zählt nicht für AVG → Batter-AVG bleibt geschützt.</p>
              </>
            }
          />
        </label>
      )}
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={opt.action}
          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
            opt.primary
              ? 'bg-navy-50 border-navy-300 text-navy-900 hover:bg-navy-100'
              : 'bg-white border-cream-300 text-gray-700 hover:bg-cream-100'
          }`}
        >
          <div className="text-sm font-semibold">{opt.label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
        </button>
      ))}
      <button
        onClick={onBack}
        className="w-full mt-2 py-2.5 text-sm font-display font-bold tracking-wide rounded-xl border border-cream-300 text-gray-600 bg-white hover:bg-cream-100 cursor-pointer"
      >
        ← Zurück
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RunnerOutPickerView — used for Double Play
// ---------------------------------------------------------------------------
interface RunnerOutPickerProps {
  fielder: number
  defaultDpPartner: number
  title: string
  subtitle: string
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onPick: (out: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => void
  onBack: () => void
}

function RunnerOutPickerView({
  title,
  subtitle,
  baseState,
  slots,
  onPick,
  onBack,
}: RunnerOutPickerProps) {
  const runners: Array<{ slotId: number; fromBase: 1 | 2 | 3; name: string }> = []

  if (baseState.firstSlotId != null) {
    const slot = slots.find(s => s.id === baseState.firstSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 1, name: slot.name })
  }
  if (baseState.secondSlotId != null) {
    const slot = slots.find(s => s.id === baseState.secondSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 2, name: slot.name })
  }
  if (baseState.thirdSlotId != null) {
    const slot = slots.find(s => s.id === baseState.thirdSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 3, name: slot.name })
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-xs text-gray-500 font-body">
        {subtitle}
      </p>
      <div className="space-y-2">
        {runners.map(r => (
          <button
            key={r.slotId}
            onClick={() => onPick({ runnerSlotId: r.slotId, fromBase: r.fromBase })}
            className="w-full text-left px-4 py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 cursor-pointer"
          >
            <div className="font-display font-bold text-navy-900 text-sm">
              {r.name}
            </div>
            <div className="text-xs text-gray-500">
              auf {r.fromBase}B (out beim Versuch nach {r.fromBase + 1 === 4 ? 'Home' : `${r.fromBase + 1}B`})
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="w-full mt-4 py-2 text-sm text-gray-500 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
      >
        ← Zurück
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RunnerAdvancePickerView — used for Fly Out tag-up
// ---------------------------------------------------------------------------
function RunnerAdvancePickerView({
  title,
  subtitle,
  baseState,
  slots,
  onConfirm,
  onBack,
  showSacFlyToggle,
  defaultTargets,
  force3rdOutHint,
}: {
  title: string
  subtitle: string
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onConfirm: (advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[], isSacFly: boolean) => void
  onBack: () => void
  showSacFlyToggle?: boolean
  defaultTargets?: Record<1 | 2 | 3, 1 | 2 | 3 | 4>
  force3rdOutHint?: boolean
}) {
  const runners: Array<{ slotId: number; fromBase: 1 | 2 | 3; name: string }> = []
  if (baseState.firstSlotId != null) {
    const slot = slots.find(s => s.id === baseState.firstSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 1, name: slot.name })
  }
  if (baseState.secondSlotId != null) {
    const slot = slots.find(s => s.id === baseState.secondSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 2, name: slot.name })
  }
  if (baseState.thirdSlotId != null) {
    const slot = slots.find(s => s.id === baseState.thirdSlotId)
    if (slot) runners.push({ slotId: slot.id, fromBase: 3, name: slot.name })
  }

  const [targets, setTargets] = useState<Record<1 | 2 | 3, 1 | 2 | 3 | 4>>(
    defaultTargets ?? { 1: 1, 2: 2, 3: 3 }
  )
  const [isSacFly, setIsSacFly] = useState(false)
  const cycle = (b: 1 | 2 | 3) =>
    setTargets(prev => {
      const curr = prev[b]
      const next = curr === 4 ? b : (curr + 1) as 1 | 2 | 3 | 4
      return { ...prev, [b]: next }
    })

  const labelFor = (from: 1 | 2 | 3, to: 1 | 2 | 3 | 4) => {
    if (to === from) return 'bleibt'
    if (to === 4) return '→ Home (Run!)'
    return `→ ${to}B`
  }

  // Validation: zwei Runner können nicht auf derselben Base landen.
  // Home (4) ist ausgenommen — beliebig viele scoren möglich.
  const collidingBases = (() => {
    const counts: Record<number, number> = {}
    for (const r of runners) {
      const t = targets[r.fromBase]
      if (t === 4) continue // Home unlimited
      counts[t] = (counts[t] ?? 0) + 1
    }
    return Object.entries(counts)
      .filter(([, c]) => c > 1)
      .map(([b]) => Number(b) as 1 | 2 | 3)
  })()
  const hasCollision = collidingBases.length > 0

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-xs text-gray-500 font-body">
        {subtitle} <span className="block mt-1 text-gray-400">Tipp zum Wechseln (bleibt → 2B → 3B → Home).</span>
      </p>
      {force3rdOutHint && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-900 font-body">
          ⚠ <strong>3rd-Out Force-Play</strong> — Run zählt nicht (Softball-Regel). Force-Out an 1B beendet Inning bevor Run gewertet wird.
        </div>
      )}
      <div className="space-y-2">
        {runners.map(r => {
          const t = targets[r.fromBase]
          const advanced = t !== r.fromBase
          const scored = t === 4
          const colliding = t !== 4 && collidingBases.includes(t as 1 | 2 | 3)
          return (
            <button
              key={r.slotId}
              onClick={() => cycle(r.fromBase)}
              className={`w-full text-left px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                colliding
                  ? 'border-softball-red-500 bg-softball-red-100 text-softball-red-900 ring-2 ring-softball-red-300'
                  : scored
                  ? 'border-softball-red-500 bg-softball-red-50 text-softball-red-900'
                  : advanced
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-cream-300 bg-white text-gray-700 hover:bg-cream-100'
              }`}
            >
              <div className="font-display font-bold text-sm flex items-center justify-between">
                <span>{r.name} (auf {r.fromBase}B)</span>
                <span className="text-xs">{labelFor(r.fromBase, t)}</span>
              </div>
            </button>
          )
        })}
      </div>
      {hasCollision && (
        <div className="bg-softball-red-50 border border-softball-red-300 rounded-lg p-2.5 text-xs text-softball-red-900 font-body">
          ⚠ <strong>Konflikt:</strong> Zwei Runner auf derselben Base ({collidingBases.map(b => `${b}B`).join(', ')}). Anpassen — ein Runner muss weiter advancen oder out sein.
        </div>
      )}
      {showSacFlyToggle && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 pt-1">
          <input
            type="checkbox"
            checked={isSacFly}
            onChange={e => setIsSacFly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-navy-800 cursor-pointer"
          />
          <span>Als Sacrifice Fly werten (SF)</span>
          <HelpPopover
            title="Sacrifice Fly (SF)"
            body={
              <>
                <p>Batter schlägt Fly Ball ins Outfield. Outfielder fängt → Batter out. Aber: Runner von 3B taggt up und scored.</p>
                <p><strong>Wann ankreuzen:</strong> Mindestens 1 Run wegen Tag-Up. Nur möglich bei &lt; 2 Outs.</p>
                <p><strong>Wirkung:</strong> AB zählt nicht für AVG.</p>
              </>
            }
          />
        </label>
      )}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onBack}
          className="flex-1 py-2 text-sm text-gray-500 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
        >
          ← Zurück
        </button>
        <button
          onClick={() => onConfirm(
            runners.map(r => ({ fromBase: r.fromBase, toBase: targets[r.fromBase] })),
            isSacFly
          )}
          disabled={hasCollision}
          className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Bestätigen
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChainPickerView — Mini-Field für Fielder-Chain bei FC/DP
// ---------------------------------------------------------------------------
interface ChainPickerProps {
  initialFielder: number
  onConfirm: (chain: number[]) => void
  onBack: () => void
}

function ChainPickerView({ initialFielder, onConfirm, onBack, isForceOut }: ChainPickerProps & { isForceOut?: boolean }) {
  const [chain, setChain] = useState<number[]>([initialFielder])

  const tap = (pos: number) => {
    // Append immer — Repetition erlaubt (z.B. 5-5-3 = solo-tag + throw). Max 5 Einträge (DP/TP genug).
    setChain(prev => prev.length >= 5 ? prev : [...prev, pos])
  }

  const undoLastTap = () => setChain(prev => prev.slice(0, -1))
  const reset = () => setChain([])

  const chainLabel = chain.length === 0
    ? '(Kein Fielder gewählt)'
    : chain.length === 1
    ? `Solo (${chain[0]} unassisted)`
    : chain.join('-')

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
        {isForceOut ? 'Force-Out — wer hat Base touched? Wer hat geworfen?' : 'Wer hat den Runner getaggt? Wer hat geworfen?'}
      </h3>
      <p className="text-xs text-gray-500 font-body">
        {isForceOut
          ? 'Kein Tag nötig — Fielder muss nur Base berühren. Erster Tap = wer touched, weitere Taps = Werfer (in Wurf-Reihenfolge). Doppel-Tap auf Fielder = solo-touch + throw (z.B. 5-5-3). Default: Solo.'
          : 'Erster Tap = Tagger. Weitere Taps fügen Assister hinzu (in Reihenfolge des Wurfs). Doppel-Tap auf Fielder = solo + throw. Default: Solo.'}
      </p>
      <div className="bg-navy-50 border border-navy-300 rounded-lg p-2 text-center">
        <div className="text-[10px] tracking-widest uppercase text-gray-500 font-bold">Chain</div>
        <div className="font-display text-lg font-extrabold text-navy-900 tabular-nums">{chainLabel}</div>
      </div>
      <svg viewBox="0 0 280 220" className="w-full max-w-xs mx-auto block">
        <path d="M 30 200 Q 140 20 250 200" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M 140 175 L 210 120 L 140 65 L 70 120 Z" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 2" />
        {FIELD_POSITIONS.map(({ pos, cx, cy }) => {
          const isInChain = chain.includes(pos)
          const orderIndices = chain.map((c, i) => c === pos ? (i + 1) : null).filter((v): v is number => v != null)
          const orderLabel = orderIndices.join(',')
          return (
            <g key={pos} role="button" aria-label={`Feldposition ${pos} ${POSITION_NAMES[pos]}`}
               onClick={() => tap(pos)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r="22"
                fill={isInChain ? '#1e3a5f' : (pos >= 7 ? '#dbeafe' : '#f0f4f8')}
                stroke={isInChain ? '#0f1f33' : (pos >= 7 ? '#3b82f6' : '#6b7280')}
                strokeWidth="1.5" />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={isInChain ? 'white' : '#1e3a5f'}>{pos}</text>
              <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill={isInChain ? 'white' : '#374151'}>{POSITION_NAMES[pos]}</text>
              {isInChain && (
                <text x={cx + 16} y={cy - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#CC2936">{orderLabel}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex gap-2 mt-2">
        <button
          onClick={undoLastTap}
          disabled={chain.length === 0}
          className="flex-1 py-2 text-sm rounded-lg border border-cream-300 text-gray-600 hover:bg-cream-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶ Letzter Tap
        </button>
        <button
          onClick={reset}
          className="flex-1 py-2 text-sm rounded-lg border border-cream-300 text-gray-600 hover:bg-cream-100 cursor-pointer"
        >
          Reset
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-2 text-sm rounded-lg border border-cream-300 text-gray-600 hover:bg-cream-100 cursor-pointer"
        >
          ← Zurück
        </button>
        <button
          onClick={() => onConfirm(chain.length === 0 ? [initialFielder] : chain)}
          className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer"
        >
          Bestätigen
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OutDetailDrawer
//
// Known Limitation: Triple Play (TRIPLE_PLAY) hat keinen UI-Pfad. Sehr seltenes
// Event (statistisch <1 / Saison). Backend akzeptiert outType=TRIPLE_PLAY via API,
// aber Spielbogen-UI bietet aktuell nur Single-Out + Double-Play. Workaround:
// User kann via correctLastAtBat (Korrektur-Sheet) outType nachträglich anpassen.
// ---------------------------------------------------------------------------
export function OutDetailDrawer({ open, onClose, onSubmit, baseStateAfter, slots, batterSlotId, outs }: Props) {
  const [selectedFielder, setSelectedFielder] = useState<number | null>(null)
  const [pendingDpRequest, setPendingDpRequest] = useState<{ fielder: number; defaultDpPartner: number } | null>(null)
  const [pendingFlyOutRequest, setPendingFlyOutRequest] = useState<{ fielder: number } | null>(null)
  const [pendingRunnerOutRequest, setPendingRunnerOutRequest] = useState<{ fielder: number } | null>(null)
  const [pendingAdvancePicker, setPendingAdvancePicker] = useState<null | {
    baseRequest: Partial<SpielbogenRecordAtBatRequest>
    title: string
    defaultTargets: Record<1 | 2 | 3, 1 | 2 | 3 | 4>
  }>(null)
  const [pendingChainPicker, setPendingChainPicker] = useState<null | {
    initialFielder: number
    baseRequest: Partial<SpielbogenRecordAtBatRequest>
    baseStateAfter: BogenBaseStateDto
    isForceOut?: boolean
  }>(null)

  const baseState: BogenBaseStateDto = baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }

  const runnersOnBase =
    baseState.firstSlotId != null ||
    baseState.secondSlotId != null ||
    baseState.thirdSlotId != null

  const handleFielderTap = (pos: number) => {
    if (pos >= 7) {
      // Outfielder — Fly Out. If runners on base AND <2 outs, ask tag-up.
      // Bei 2 Outs beendet der Catch das Inning — Tag-Up-Runs zaehlen nicht, Picker ueberspringen.
      const hasAnyRunner = baseStateAfter && (
        baseStateAfter.firstSlotId != null ||
        baseStateAfter.secondSlotId != null ||
        baseStateAfter.thirdSlotId != null
      )
      if (hasAnyRunner && outs < 2) {
        setPendingFlyOutRequest({ fielder: pos })
      } else {
        onSubmit({
          result: 'OUT',
          outType: 'FLY',
          fielderChain: [pos],
          runsScored: 0,
          rbi: 0,
        })
      }
    } else {
      setSelectedFielder(pos)
    }
  }

  const handleFlyOutConfirm = (advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[], isSacFly: boolean) => {
    if (pendingFlyOutRequest == null) return
    const { baseStateAfter: after, runsScored: rawRuns } = applyAdvances(baseStateAfter, advances)
    // Bei 2 Outs beendet der Catch das Inning — Runs zaehlen nicht mehr, Sac-Fly nicht moeglich
    const runs = outs >= 2 ? 0 : rawRuns
    onSubmit({
      result: 'OUT',
      outType: 'FLY',
      ...(isSacFly && outs < 2 ? { sacrificeType: 'FLY' as const } : {}),
      fielderChain: [pendingFlyOutRequest.fielder],
      runsScored: runs,
      rbi: runs,
      baseStateAfter: after,
    })
    setPendingFlyOutRequest(null)
  }

  const handleAdvancePick = (
    fielder: number,
    throwTarget: 1 | 2 | 3 | 4,
    baseRequest: Partial<SpielbogenRecordAtBatRequest>,
  ) => {
    const defaults = computeForceDefaults(
      baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null },
      throwTarget,
    )
    // 3rd-Out: Runner-Advance egal (Inning endet, Runs zählen nicht). Skip Picker, auto-confirm mit Default.
    if (outs >= 2) {
      const advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[] = []
      for (const fromBase of [1, 2, 3] as const) {
        const toBase = defaults[fromBase]
        if (toBase !== fromBase) advances.push({ fromBase, toBase })
      }
      const { baseStateAfter: after } = applyAdvances(baseStateAfter, advances)
      onSubmit({
        ...baseRequest,
        runsScored: 0,
        rbi: 0,
        baseStateAfter: after,
      })
      setSelectedFielder(null)
      return
    }
    const chain = baseRequest.fielderChain
    const last = chain && chain.length > 1 ? chain[chain.length - 1] : null
    const titleSuffix = last != null ? `${fielder}-${last}` : `${fielder}`
    setPendingAdvancePicker({
      baseRequest,
      title: `Out ${titleSuffix} — Runner-Advance`,
      defaultTargets: defaults,
    })
  }

  const handleAdvancePickerConfirm = (advances: { fromBase: 1 | 2 | 3; toBase: 1 | 2 | 3 | 4 }[]) => {
    if (pendingAdvancePicker == null) return
    const { baseStateAfter: after, runsScored: rawRuns } = applyAdvances(baseStateAfter, advances)
    // Force-Out 3rd-Out: Run zählt nicht (Softball/Baseball-Regel) — Grounder/Unassisted = +1 Out
    const runs = outs >= 2 ? 0 : rawRuns
    onSubmit({
      ...pendingAdvancePicker.baseRequest,
      runsScored: runs,
      rbi: runs,
      baseStateAfter: after,
    })
    setPendingAdvancePicker(null)
    setSelectedFielder(null)
  }

  const handleSkip = () => {
    onSubmit({ result: 'OUT' })
  }

  const handleFoulOut = () => {
    onSubmit({ result: 'OUT', outType: 'FOUL' })
  }

  const handleInfieldSubmit = (req: Partial<SpielbogenRecordAtBatRequest>) => {
    setSelectedFielder(null)
    onSubmit(req)
  }

  const handleClose = () => {
    setSelectedFielder(null)
    setPendingDpRequest(null)
    setPendingFlyOutRequest(null)
    setPendingRunnerOutRequest(null)
    setPendingAdvancePicker(null)
    setPendingChainPicker(null)
    onClose()
  }

  const handleRunnerOutPick = ({ runnerSlotId, fromBase }: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => {
    if (pendingRunnerOutRequest == null || batterSlotId == null) return
    const fielder = pendingRunnerOutRequest.fielder

    const before = baseState
    const newFirstSlot: number | null = batterSlotId  // batter takes 1B
    let newSecondSlot: number | null = before.secondSlotId
    let newThirdSlot: number | null = before.thirdSlotId

    if (fromBase === 1) {
      // 1B runner out — batter takes 1B
    } else if (fromBase === 2) {
      newSecondSlot = null
      if (before.firstSlotId != null) {
        newSecondSlot = before.firstSlotId
      }
    } else if (fromBase === 3) {
      newThirdSlot = null
      if (before.secondSlotId != null) {
        newThirdSlot = before.secondSlotId
        newSecondSlot = before.firstSlotId
      } else if (before.firstSlotId != null) {
        newSecondSlot = before.firstSlotId
      }
    }

    void runnerSlotId
    setPendingRunnerOutRequest(null)
    setPendingChainPicker({
      initialFielder: fielder,
      baseRequest: {
        result: 'OUT',
        outType: 'FIELDERS_CHOICE',
        runsScored: 0,
        rbi: 0,
      },
      baseStateAfter: {
        firstSlotId: newFirstSlot,
        secondSlotId: newSecondSlot,
        thirdSlotId: newThirdSlot,
      },
      isForceOut: isForceOutFromBase(before, fromBase),
    })
  }

  const handleDpRunnerOut = ({ runnerSlotId, fromBase }: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => {
    if (pendingDpRequest == null) return
    const after: BogenBaseStateDto = {
      firstSlotId: fromBase === 1 ? null : baseState.firstSlotId,
      secondSlotId: fromBase === 2 ? null : baseState.secondSlotId,
      thirdSlotId: fromBase === 3 ? null : baseState.thirdSlotId,
    }
    void runnerSlotId
    setPendingDpRequest(null)
    setPendingChainPicker({
      initialFielder: pendingDpRequest.fielder,
      baseRequest: {
        result: 'OUT',
        outType: 'DOUBLE_PLAY',
        runsScored: 0,
        rbi: 0,
      },
      baseStateAfter: after,
      isForceOut: isForceOutFromBase(baseState, fromBase),
    })
  }

  const handleChainPickerConfirm = (chain: number[]) => {
    if (pendingChainPicker == null) return
    onSubmit({
      ...pendingChainPicker.baseRequest,
      fielderChain: chain,
      baseStateAfter: pendingChainPicker.baseStateAfter,
    })
    setPendingChainPicker(null)
    setSelectedFielder(null)
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) { handleClose() } }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[80vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Out-Detail</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
          <div className="px-5 py-3 border-b border-cream-200 flex items-center justify-between shrink-0">
            <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
              Aus — Detail wählen
            </h2>
            <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {pendingChainPicker != null ? (
              <ChainPickerView
                initialFielder={pendingChainPicker.initialFielder}
                onConfirm={handleChainPickerConfirm}
                onBack={() => setPendingChainPicker(null)}
                isForceOut={pendingChainPicker.isForceOut}
              />
            ) : pendingRunnerOutRequest != null ? (
              <RunnerOutPickerView
                fielder={pendingRunnerOutRequest.fielder}
                defaultDpPartner={3}
                title="Fielder's Choice — welcher Runner ist out?"
                subtitle="Batter ist safe an 1B. Welcher Runner wurde getaggt?"
                baseState={baseState}
                slots={slots}
                onPick={handleRunnerOutPick}
                onBack={() => setPendingRunnerOutRequest(null)}
              />
            ) : pendingFlyOutRequest != null ? (
              <RunnerAdvancePickerView
                title={`Fly Out F${pendingFlyOutRequest.fielder} — Tag Up?`}
                subtitle={
                  outs >= 2
                    ? 'Catch ist 3rd Out — Runs zählen nicht (Inning beendet)'
                    : 'Welche Runner sind nach dem Catch weitergelaufen?'
                }
                baseState={baseState}
                slots={slots}
                onConfirm={handleFlyOutConfirm}
                onBack={() => setPendingFlyOutRequest(null)}
                showSacFlyToggle={outs < 2}
              />
            ) : pendingDpRequest != null ? (
              <RunnerOutPickerView
                fielder={pendingDpRequest.fielder}
                defaultDpPartner={pendingDpRequest.defaultDpPartner}
                title="Double Play — welcher Runner ist out?"
                subtitle="Batter ist immer out. Welcher Runner zusätzlich?"
                baseState={baseState}
                slots={slots}
                onPick={handleDpRunnerOut}
                onBack={() => setPendingDpRequest(null)}
              />
            ) : pendingAdvancePicker != null ? (
              <RunnerAdvancePickerView
                title={pendingAdvancePicker.title}
                subtitle="Smart-Default basierend auf Throw-Target — anpassen wenn Runner anders gelaufen ist."
                baseState={baseState}
                slots={slots}
                defaultTargets={pendingAdvancePicker.defaultTargets}
                onConfirm={handleAdvancePickerConfirm}
                onBack={() => setPendingAdvancePicker(null)}
                force3rdOutHint={outs >= 2}
              />
            ) : selectedFielder != null ? (
              <InfieldOptionsView
                fielder={selectedFielder}
                hasRunners={runnersOnBase}
                baseState={baseState}
                onSubmit={handleInfieldSubmit}
                onDpPick={(fielder, defaultDpPartner) => setPendingDpRequest({ fielder, defaultDpPartner })}
                onRunnerOutPick={(fielder) => setPendingRunnerOutRequest({ fielder })}
                onAdvancePick={handleAdvancePick}
                onBack={() => setSelectedFielder(null)}
              />
            ) : (
              <>
                <p className="text-xs text-gray-500 text-center mb-3 font-body">
                  Tippe auf die Feldposition, die den Out gemacht hat
                </p>
                {/* Mini field SVG */}
                <svg viewBox="0 0 280 220" className="w-full max-w-xs mx-auto block">
                  {/* Fair territory arc */}
                  <path
                    d="M 30 200 Q 140 20 250 200"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Infield square */}
                  <path
                    d="M 140 175 L 210 120 L 140 65 L 70 120 Z"
                    fill="none"
                    stroke="#d1d5db"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />

                  {FIELD_POSITIONS.map(({ pos, cx, cy }) => (
                    <g key={pos} role="button" aria-label={`Feldposition ${pos} ${POSITION_NAMES[pos]}`} onClick={() => handleFielderTap(pos)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="22"
                        fill={pos >= 7 ? '#dbeafe' : '#f0f4f8'}
                        stroke={pos >= 7 ? '#3b82f6' : '#6b7280'}
                        strokeWidth="1.5"
                      />
                      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e3a5f">
                        {pos}
                      </text>
                      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#374151">
                        {POSITION_NAMES[pos]}
                      </text>
                    </g>
                  ))}
                </svg>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleFoulOut}
                    className="flex-1 py-2.5 text-sm font-display font-bold tracking-widest uppercase rounded-xl border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                  >
                    Foul Out
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-2.5 text-sm font-display font-bold tracking-widest uppercase rounded-xl border border-cream-300 text-gray-600 bg-white hover:bg-cream-100 cursor-pointer"
                  >
                    Skip (nur AUS)
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Abbrechen
                </button>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
