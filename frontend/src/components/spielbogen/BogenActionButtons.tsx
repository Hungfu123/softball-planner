import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { AtBatResult, BogenSide, SpielbogenRecordAtBatRequest, SpielbogenRecordStealingRequest, BogenBaseStateDto, SpielbogenSlotResponse } from '@/types'
import { OutDetailDrawer } from './OutDetailDrawer'
import { CheatsheetDrawer } from './CheatsheetDrawer'
import { StealingDrawer } from './StealingDrawer'
import { PitchingEventDrawer } from './PitchingEventDrawer'
import { ErrorPickerDrawer } from './ErrorPickerDrawer'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { computeBaseStateAdvance } from '@/utils/bogenBaseAdvance'

interface Props {
  side: BogenSide
  currentSlotId: number | null
  inning: number
  outs: number
  baseStateAfter: BogenBaseStateDto | null
  slots: SpielbogenSlotResponse[]
  disabled?: boolean
  onRecord: (req: SpielbogenRecordAtBatRequest) => Promise<void>
  onRecordStealing: (req: SpielbogenRecordStealingRequest) => Promise<void>
  onSwitchSide: () => void
  onSubstitution: () => void
  onEndGame: () => void
  canEndGame: boolean
}

type Mode = 'idle' | 'hit-expanded'

const hasRunners = (bs: BogenBaseStateDto | null) =>
  bs != null && (bs.firstSlotId != null || bs.secondSlotId != null || bs.thirdSlotId != null)

export function BogenActionButtons({
  side,
  currentSlotId,
  inning,
  outs,
  baseStateAfter,
  slots,
  disabled,
  onRecord,
  onRecordStealing,
  onSubstitution,
  onEndGame,
  canEndGame,
}: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [showOutDrawer, setShowOutDrawer] = useState(false)
  const [showStealing, setShowStealing] = useState(false)
  const [showPitching, setShowPitching] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showCheatsheet, setShowCheatsheet] = useState(false)
  const [showErrorDrawer, setShowErrorDrawer] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleErrorPick = async (errorPosition: number) => {
    if (!currentSlotId) return
    setSubmitting(true)
    try {
      const advance = computeBaseStateAdvance({
        before: baseStateAfter,
        result: 'OUT',
        isError: true,
        batterSlotId: currentSlotId,
      })
      await onRecord({
        side,
        slotId: currentSlotId,
        inning,
        result: 'OUT',
        isError: true,
        errorPosition,
        runsScored: advance.runsScored,
        rbi: 0,
        baseStateAfter: advance.baseStateAfter,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const noSlot = currentSlotId == null

  const handleRecord = async (result: AtBatResult, extra?: Partial<SpielbogenRecordAtBatRequest>) => {
    if (!currentSlotId) return
    setMode('idle')
    setSubmitting(true)
    try {
      const advance = computeBaseStateAdvance({
        before: baseStateAfter,
        result,
        outType: extra?.outType,
        batterSlotId: currentSlotId,
      })
      await onRecord({
        side,
        slotId: currentSlotId,
        inning,
        result,
        runsScored: advance.runsScored,
        rbi: advance.runsScored,
        baseStateAfter: advance.baseStateAfter,
        ...extra,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOutSubmit = async (req: Partial<SpielbogenRecordAtBatRequest>) => {
    setShowOutDrawer(false)
    if (!currentSlotId) return
    setSubmitting(true)
    try {
      let resolvedBaseState = req.baseStateAfter
      let runsScored = req.runsScored ?? 0
      let rbi = req.rbi ?? 0
      if (!resolvedBaseState) {
        const outResult = (req.result ?? 'OUT') as AtBatResult
        const advance = computeBaseStateAdvance({
          before: baseStateAfter,
          result: outResult,
          outType: req.outType,
          isError: req.isError ?? false,
          batterSlotId: currentSlotId,
        })
        resolvedBaseState = advance.baseStateAfter
        runsScored = advance.runsScored
        // ROE: run is unearned, no RBI — Run scored aber Batter kriegt kein RBI
        rbi = req.isError ? 0 : advance.runsScored
      }
      await onRecord({
        side,
        slotId: currentSlotId,
        inning,
        result: 'OUT',
        runsScored,
        rbi,
        baseStateAfter: resolvedBaseState,
        ...req,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isDisabled = disabled || submitting || noSlot

  const runnersPresent = hasRunners(baseStateAfter)

  return (
    <>
      <div className="px-4 py-3 space-y-2">
        <AnimatePresence mode="wait">
          {mode === 'idle' ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.12 }}
              className="space-y-2"
            >
              {/* Tier 1: Big buttons */}
              <div className="grid grid-cols-3 gap-2">
                <BigButton label="TREFFER" color="navy" onClick={() => setMode('hit-expanded')} disabled={isDisabled} />
                <BigButton label="STRIKEOUT" color="red" onClick={() => handleRecord('STRIKEOUT')} disabled={isDisabled} />
                <BigButton label="AUS" color="gray" subtitle="Grounder / Fly" onClick={() => setShowOutDrawer(true)} disabled={isDisabled} />
              </div>
              {/* Tier 2: Medium buttons */}
              <div className="grid grid-cols-3 gap-2">
                <MedButton label="WALK" color="emerald" onClick={() => handleRecord('WALK')} disabled={isDisabled} />
                <MedButton label="HBP" subtitle="Hit-by-Pitch" color="amber" onClick={() => handleRecord('HIT_BY_PITCH')} disabled={isDisabled} />
                <MedButton label="ERROR" subtitle="Batter safe" color="errorAmber" onClick={() => setShowErrorDrawer(true)} disabled={isDisabled} />
              </div>
              {/* Tier 3: Small pills */}
              <div className="flex gap-2">
                <SmallPill
                  label="STEALING"
                  onClick={() => setShowStealing(true)}
                  disabled={isDisabled || !runnersPresent}
                />
                <SmallPill
                  label="WP/PB"
                  onClick={() => setShowPitching(true)}
                  disabled={isDisabled || !runnersPresent}
                />
                <SmallPill label="···" onClick={() => setShowMore(true)} disabled={submitting} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="hit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.12 }}
              className="space-y-2"
            >
              <div className="grid grid-cols-4 gap-2">
                <HitSub label="Single" onClick={() => handleRecord('SINGLE')} />
                <HitSub label="Double" onClick={() => handleRecord('DOUBLE')} />
                <HitSub label="Triple" onClick={() => handleRecord('TRIPLE')} />
                <HitSub label="HR" onClick={() => handleRecord('HOMERUN')} accent />
              </div>
              <button
                onClick={() => setMode('idle')}
                className="w-full h-11 rounded-lg border border-cream-300 text-gray-600 text-sm font-medium hover:bg-cream-200 cursor-pointer"
              >
                ← Abbrechen
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {noSlot && (
          <p className="text-center text-xs text-gray-500 font-body">
            Kein Lineup-Slot — bitte erst Spielbogen-Lineup befüllen
          </p>
        )}
      </div>

      {/* Out-Detail drawer */}
      <OutDetailDrawer
        open={showOutDrawer}
        onClose={() => setShowOutDrawer(false)}
        onSubmit={handleOutSubmit}
        baseStateAfter={baseStateAfter}
        slots={slots}
        batterSlotId={currentSlotId}
        outs={outs}
      />

      {/* Stealing drawer */}
      <StealingDrawer
        open={showStealing}
        onClose={() => setShowStealing(false)}
        baseState={baseStateAfter}
        slots={slots}
        side={side}
        inning={inning}
        onSubmit={onRecordStealing}
      />

      {/* WP/PB drawer */}
      <PitchingEventDrawer
        open={showPitching}
        onClose={() => setShowPitching(false)}
        baseState={baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
        slots={slots}
        onSubmit={async (events) => {
          setSubmitting(true)
          try {
            for (const e of events) {
              await onRecordStealing({ side, slotId: e.slotId, inning, type: e.type, fromBase: e.fromBase, toBase: e.toBase })
            }
          } finally {
            setSubmitting(false)
          }
        }}
      />

      {/* Error picker drawer */}
      <ErrorPickerDrawer
        open={showErrorDrawer}
        onClose={() => setShowErrorDrawer(false)}
        onPick={handleErrorPick}
      />

      {/* Cheatsheet drawer */}
      <CheatsheetDrawer open={showCheatsheet} onClose={() => setShowCheatsheet(false)} />

      {/* More menu */}
      <ResponsiveSheet
        open={showMore}
        onClose={() => setShowMore(false)}
        title="Mehr Aktionen"
      >
        <div className="p-4 space-y-2">
          <button
            onClick={() => { setShowMore(false); onSubstitution() }}
            className="w-full text-left px-4 py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 cursor-pointer"
          >
            <div className="font-display font-bold text-navy-800 text-sm uppercase tracking-wide">Auswechseln</div>
            <div className="text-xs text-gray-500 mt-0.5">Spieler wechseln</div>
          </button>
          {canEndGame && (
            <button
              onClick={() => { setShowMore(false); onEndGame() }}
              className="w-full text-left px-4 py-3 rounded-xl border border-softball-red-300 bg-softball-red-50 hover:bg-softball-red-100 cursor-pointer"
            >
              <div className="font-display font-bold text-softball-red-700 text-sm uppercase tracking-wide">Spiel beenden</div>
              <div className="text-xs text-softball-red-500 mt-0.5">Status auf DONE setzen</div>
            </button>
          )}
          <button
            onClick={() => { setShowMore(false); setShowCheatsheet(true) }}
            className="w-full text-left px-4 py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 cursor-pointer"
          >
            <div className="font-display font-bold text-navy-800 text-sm uppercase tracking-wide">Cheatsheet</div>
            <div className="text-xs text-gray-500 mt-0.5">Notation-Übersicht</div>
          </button>
        </div>
      </ResponsiveSheet>
    </>
  )
}

/*
 * Button-Farben nach Outcome-Semantik (WCAG-AA auf weißem Text):
 *   navy-800    → TREFFER (Brand-Haupt, aktives Positives)
 *   emerald-600 → WALK (free base, entspanntes Positives)
 *   softball-red-600 → STRIKEOUT (Out, negativ)
 *   gray-500    → AUS (neutral, Grounder/Fly)
 *   amber-600   → HBP (Warn/Schmerz — dunkler als -500 für AA-Kontrast mit white)
 */
const COLOR_CLASSES = {
  navy:    'bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white',
  red:     'bg-softball-red-600 hover:bg-softball-red-700 active:bg-softball-red-800 text-white',
  gray:    'bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
  amber:   'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
  errorAmber: 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white',
} as const

type Color = keyof typeof COLOR_CLASSES

function BigButton({ label, color, subtitle, onClick, disabled }: {
  label: string; color: Color; subtitle?: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-display h-16 sm:h-[72px] rounded-xl font-extrabold text-base sm:text-lg tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5 ${COLOR_CLASSES[color]}`}
    >
      <span>{label}</span>
      {subtitle && <span className="font-body text-[9px] sm:text-[10px] font-medium opacity-85 tracking-normal normal-case">{subtitle}</span>}
    </button>
  )
}

function MedButton({ label, color, subtitle, onClick, disabled }: {
  label: string; color: Color; subtitle?: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-display h-12 sm:h-[60px] rounded-xl font-extrabold text-sm sm:text-base tracking-widest uppercase cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-0.5 ${COLOR_CLASSES[color]}`}
    >
      <span>{label}</span>
      {subtitle && <span className="font-body text-[9px] sm:text-[10px] font-medium opacity-85 tracking-normal normal-case">{subtitle}</span>}
    </button>
  )
}

function SmallPill({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-display px-4 h-9 rounded-full border border-cream-300 bg-cream-50 text-navy-700 text-xs font-bold tracking-widest uppercase hover:bg-navy-50 hover:border-navy-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

function HitSub({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  const cls = accent
    ? 'bg-gradient-to-br from-navy-700 to-softball-red-600 text-white'
    : 'bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white'
  return (
    <button
      onClick={onClick}
      className={`font-display h-16 sm:h-[72px] rounded-xl font-extrabold text-base sm:text-lg tracking-widest uppercase cursor-pointer transition-colors ${cls}`}
    >
      {label}
    </button>
  )
}
