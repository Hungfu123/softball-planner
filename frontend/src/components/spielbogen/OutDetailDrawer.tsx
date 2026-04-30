import { useState } from 'react'
import { Drawer } from 'vaul'
import type { SpielbogenRecordAtBatRequest, BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  baseStateAfter: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
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

interface InfieldOptionsProps {
  fielder: number
  hasRunners: boolean
  baseState: BogenBaseStateDto
  onSubmit: (req: Partial<SpielbogenRecordAtBatRequest>) => void
  onDpPick: (fielder: number, defaultDpPartner: number) => void
  onBack: () => void
}

function InfieldOptionsView({ fielder, hasRunners, baseState, onSubmit, onDpPick, onBack }: InfieldOptionsProps) {
  const defaultThrow = 3
  const defaultDpPartner = fielder === 6 ? 4 : defaultThrow

  const handleDpClick = () => {
    const runnerCount =
      (baseState.firstSlotId != null ? 1 : 0) +
      (baseState.secondSlotId != null ? 1 : 0) +
      (baseState.thirdSlotId != null ? 1 : 0)

    if (runnerCount === 0) {
      // Should not happen (button is hidden), but guard defensively
      return
    }

    if (runnerCount === 1) {
      // Auto-pick the only runner — no picker needed
      const slotId = baseState.firstSlotId ?? baseState.secondSlotId ?? baseState.thirdSlotId
      const fromBase: 1 | 2 | 3 =
        baseState.firstSlotId != null ? 1 : baseState.secondSlotId != null ? 2 : 3
      const after: BogenBaseStateDto = {
        firstSlotId: fromBase === 1 ? null : baseState.firstSlotId,
        secondSlotId: fromBase === 2 ? null : baseState.secondSlotId,
        thirdSlotId: fromBase === 3 ? null : baseState.thirdSlotId,
      }
      onSubmit({
        result: 'OUT',
        outType: 'DOUBLE_PLAY',
        fielderChain: [fielder, defaultDpPartner, 3],
        runsScored: 0,
        rbi: 0,
        baseStateAfter: after,
      })
      // Suppress unused-var warning for slotId — it's intentionally unused here
      void slotId
    } else {
      // Multi-runner: open picker
      onDpPick(fielder, defaultDpPartner)
    }
  }

  const options: Array<{ label: string; description: string; action: () => void; primary?: boolean }> = [
    {
      label: `▶ Wirft zu 1B (${fielder}-3)`,
      description: 'Normale Groundout, Throw to 1B',
      primary: true,
      action: () => onSubmit({
        result: 'OUT',
        outType: 'GROUNDER',
        fielderChain: [fielder, defaultThrow],
      }),
    },
    {
      label: `Solo-Out (${fielder} unassisted)`,
      description: 'Fielder schafft Out alleine',
      action: () => onSubmit({
        result: 'OUT',
        outType: 'UNASSISTED',
        fielderChain: [fielder],
      }),
    },
    ...(hasRunners ? [{
      label: `Double Play (${fielder}-${defaultDpPartner}-3)`,
      description: 'Doppelspiel — Runner wählen',
      action: handleDpClick,
    }] : []),
    {
      label: `Error E${fielder}`,
      description: 'Fehler beim Fielder',
      action: () => onSubmit({
        result: 'OUT',
        isError: true,
        errorPosition: fielder,
      }),
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-sm font-display font-bold text-navy-900 uppercase tracking-wide mb-3">
        Feldposition {POSITION_NAMES[fielder]} ({fielder})
      </p>
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

interface RunnerOutPickerProps {
  fielder: number
  defaultDpPartner: number
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onPick: (out: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => void
  onBack: () => void
}

function RunnerOutPickerView({
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
        Double Play — welcher Runner ist out?
      </h3>
      <p className="text-xs text-gray-500 font-body">
        Batter ist immer out. Welcher Runner zusätzlich?
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

function FlyOutTagUpView({
  fielder,
  baseState,
  slots,
  onConfirm,
  onBack,
}: {
  fielder: number
  baseState: BogenBaseStateDto
  slots: SpielbogenSlotResponse[]
  onConfirm: (advances: { fromBase: 1 | 2 | 3; advance: boolean }[]) => void
  onBack: () => void
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

  const [advances, setAdvances] = useState<Record<1 | 2 | 3, boolean>>({ 1: false, 2: false, 3: false })

  const toggle = (b: 1 | 2 | 3) => setAdvances(prev => ({ ...prev, [b]: !prev[b] }))

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
        Fly Out F{fielder} — Tag Up?
      </h3>
      <p className="text-xs text-gray-500 font-body">
        Welche Runner sind nach dem Catch weitergelaufen?
      </p>
      <div className="space-y-2">
        {runners.map(r => {
          const targetBase = r.fromBase + 1
          const targetLabel = targetBase === 4 ? 'Home (Run!)' : `${targetBase}B`
          return (
            <button
              key={r.slotId}
              onClick={() => toggle(r.fromBase)}
              className={`w-full text-left px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                advances[r.fromBase]
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-cream-300 bg-white text-gray-700 hover:bg-cream-100'
              }`}
            >
              <div className="font-display font-bold text-sm flex items-center justify-between">
                <span>{r.name} (auf {r.fromBase}B)</span>
                <span className="text-xs">
                  {advances[r.fromBase] ? `→ ${targetLabel} ✓` : 'bleibt'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onBack}
          className="flex-1 py-2 text-sm text-gray-500 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
        >
          ← Zurück
        </button>
        <button
          onClick={() => onConfirm(
            ([1, 2, 3] as const).map(b => ({ fromBase: b, advance: advances[b] }))
          )}
          className="flex-1 py-2 font-display text-sm font-bold tracking-widest uppercase text-white bg-navy-800 hover:bg-navy-900 rounded-lg cursor-pointer"
        >
          Bestätigen
        </button>
      </div>
    </div>
  )
}

export function OutDetailDrawer({ open, onClose, onSubmit, baseStateAfter, slots }: Props) {
  const [selectedFielder, setSelectedFielder] = useState<number | null>(null)
  const [pendingDpRequest, setPendingDpRequest] = useState<{ fielder: number; defaultDpPartner: number } | null>(null)
  const [pendingFlyOutRequest, setPendingFlyOutRequest] = useState<{ fielder: number } | null>(null)

  const baseState: BogenBaseStateDto = baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }

  const runnersOnBase =
    baseState.firstSlotId != null ||
    baseState.secondSlotId != null ||
    baseState.thirdSlotId != null

  const handleFielderTap = (pos: number) => {
    if (pos >= 7) {
      // Outfielder — Fly Out. If runners on base, ask tag-up.
      const hasAnyRunner = baseStateAfter && (
        baseStateAfter.firstSlotId != null ||
        baseStateAfter.secondSlotId != null ||
        baseStateAfter.thirdSlotId != null
      )
      if (hasAnyRunner) {
        setPendingFlyOutRequest({ fielder: pos })
      } else {
        onSubmit({
          result: 'OUT',
          outType: 'FLY',
          fielderChain: [pos],
        })
      }
    } else {
      // Infield: switch to options state within the same drawer
      setSelectedFielder(pos)
    }
  }

  const handleFlyOutConfirm = (advances: { fromBase: 1 | 2 | 3; advance: boolean }[]) => {
    if (pendingFlyOutRequest == null) return
    const before = baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
    const after: BogenBaseStateDto = { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
    let runs = 0

    // Process advances in order 3B→Home, 2B→3B, 1B→2B (highest base first to avoid overwrite conflicts)
    // 3B advance
    const adv3 = advances.find(a => a.fromBase === 3)?.advance ?? false
    if (before.thirdSlotId != null) {
      if (adv3) runs += 1  // home
      else after.thirdSlotId = before.thirdSlotId
    }
    // 2B advance
    const adv2 = advances.find(a => a.fromBase === 2)?.advance ?? false
    if (before.secondSlotId != null) {
      if (adv2) {
        if (after.thirdSlotId != null) {
          // 3B occupied — can't advance to 3B; keep on 2B
          after.secondSlotId = before.secondSlotId
        } else {
          after.thirdSlotId = before.secondSlotId
        }
      } else {
        after.secondSlotId = before.secondSlotId
      }
    }
    // 1B advance
    const adv1 = advances.find(a => a.fromBase === 1)?.advance ?? false
    if (before.firstSlotId != null) {
      if (adv1) {
        if (after.secondSlotId != null) {
          after.firstSlotId = before.firstSlotId
        } else {
          after.secondSlotId = before.firstSlotId
        }
      } else {
        after.firstSlotId = before.firstSlotId
      }
    }

    onSubmit({
      result: 'OUT',
      outType: 'FLY',
      fielderChain: [pendingFlyOutRequest.fielder],
      runsScored: runs,
      rbi: runs,
      baseStateAfter: after,
    })
    setPendingFlyOutRequest(null)
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
    onClose()
  }

  const submitDp = (fielder: number, defaultDpPartner: number, runnerSlotId: number, runnerFromBase: 1 | 2 | 3) => {
    const after: BogenBaseStateDto = {
      firstSlotId: runnerFromBase === 1 ? null : baseState.firstSlotId,
      secondSlotId: runnerFromBase === 2 ? null : baseState.secondSlotId,
      thirdSlotId: runnerFromBase === 3 ? null : baseState.thirdSlotId,
    }
    onSubmit({
      result: 'OUT',
      outType: 'DOUBLE_PLAY',
      fielderChain: [fielder, defaultDpPartner, 3],
      runsScored: 0,
      rbi: 0,
      baseStateAfter: after,
    })
    // runnerSlotId is informational (passed in to identify which runner was picked)
    void runnerSlotId
    setPendingDpRequest(null)
    setSelectedFielder(null)
  }

  const handleDpRunnerOut = ({ runnerSlotId, fromBase }: { runnerSlotId: number; fromBase: 1 | 2 | 3 }) => {
    if (pendingDpRequest == null) return
    submitDp(pendingDpRequest.fielder, pendingDpRequest.defaultDpPartner, runnerSlotId, fromBase)
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
            {pendingFlyOutRequest != null ? (
              <FlyOutTagUpView
                fielder={pendingFlyOutRequest.fielder}
                baseState={baseState}
                slots={slots}
                onConfirm={handleFlyOutConfirm}
                onBack={() => setPendingFlyOutRequest(null)}
              />
            ) : pendingDpRequest != null ? (
              <RunnerOutPickerView
                fielder={pendingDpRequest.fielder}
                defaultDpPartner={pendingDpRequest.defaultDpPartner}
                baseState={baseState}
                slots={slots}
                onPick={handleDpRunnerOut}
                onBack={() => setPendingDpRequest(null)}
              />
            ) : selectedFielder != null ? (
              <InfieldOptionsView
                fielder={selectedFielder}
                hasRunners={runnersOnBase}
                baseState={baseState}
                onSubmit={handleInfieldSubmit}
                onDpPick={(fielder, defaultDpPartner) => setPendingDpRequest({ fielder, defaultDpPartner })}
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
                    <g key={pos} onClick={() => handleFielderTap(pos)} style={{ cursor: 'pointer' }}>
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
