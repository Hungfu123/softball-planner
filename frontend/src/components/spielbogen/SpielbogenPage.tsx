import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft as ChevronLeftLucide, Flag, RotateCcw, HelpCircle, ClipboardList, FileText } from 'lucide-react'
import { CheatsheetDrawer } from './CheatsheetDrawer'
import { useSpielbogenScoring } from '@/hooks/useSpielbogenScoring'
import { useToastContext } from '@/components/layout/Layout'
import { SpielbogenPageSkeleton } from './SpielbogenPageSkeleton'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { BogenSideToggle } from './BogenSideToggle'
import { BogenDiamondView } from './BogenDiamondView'
import { BogenActionButtons } from './BogenActionButtons'
import { BatterCard } from './BatterCard'
import { LastAtBatPreview } from './LastAtBatPreview'
import { CorrectionSheet } from './CorrectionSheet'
import { HitAdjustSheet } from './HitAdjustSheet'
import { BogenSheetDrawer } from './BogenSheetDrawer'
import { PositionSwapDrawer } from './PositionSwapDrawer'
import { BogenMetaEditModal } from './BogenMetaEditModal'
import { GameClockReadout, GameClockRule } from '@/components/shared/GameClock'
import { GameClockStartSheet } from '@/components/shared/GameClockStartSheet'
import { Pencil, DotsVertical } from '@/icons'
import { generateSpielbogenPdf } from '@/utils/spielbogenPdfExport'
import { abOutsAdded } from '@/utils/bogenSheetRenderer'
import * as api from '@/api/client'
import type {
  SpielbogenRecordAtBatRequest,
  BogenSide,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  BogenBaseStateDto,
  UpdateSlotRequest,
} from '@/types'

function computeUpcomingSlots(
  slots: SpielbogenSlotResponse[],
  currentSlot: SpielbogenSlotResponse | null,
  count: number = 3,
): SpielbogenSlotResponse[] {
  if (!currentSlot || slots.length === 0) return []
  const sorted = [...slots].sort((a, b) => a.battingOrder - b.battingOrder)
  const idx = sorted.findIndex(s => s.id === currentSlot.id)
  if (idx === -1) return []
  return Array.from({ length: count }, (_, i) => sorted[(idx + i + 1) % sorted.length])
}

/** Compute outs from at-bats + stealing events for the current inning + side.
 *  AB-Outs via abOutsAdded (STRIKEOUT/OUT/AUTOMATIC_OUT, DP=2, TP=3, Errors=0).
 *  CAUGHT_STEALING / OUT_ON_PLAY stealing events count as 1 out each.
 */
function computeOuts(
  atBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[],
  inning: number,
  side: BogenSide
): number {
  const atBatOuts = atBats
    .filter(ab => ab.inning === inning && ab.side === side)
    .reduce((sum, ab) => sum + abOutsAdded(ab), 0)
  const stealingOuts = stealings
    .filter(st => st.inning === inning && st.side === side
                  && (st.type === 'CAUGHT_STEALING' || st.type === 'OUT_ON_PLAY'))
    .length
  return atBatOuts + stealingOuts
}

/** Find the next batter slot (round-robin by battingOrder). */
function resolveCurrentSlot(
  slots: SpielbogenSlotResponse[],
  atBats: SpielbogenAtBatResponse[],
  inning: number,
  side: BogenSide
): SpielbogenSlotResponse | null {
  if (slots.length === 0) return null
  const sorted = [...slots].sort((a, b) => a.battingOrder - b.battingOrder)
  const sideAtBats = atBats.filter(ab => ab.side === side && ab.inning === inning)
  if (sideAtBats.length === 0) {
    const allSideAtBats = atBats.filter(ab => ab.side === side).sort((a, b) => a.sequence - b.sequence)
    if (allSideAtBats.length === 0) return sorted[0]
    const lastAb = allSideAtBats[allSideAtBats.length - 1]
    const lastSlotIdx = sorted.findIndex(s => s.id === lastAb.slotId)
    if (lastSlotIdx === -1) return sorted[0]
    return sorted[(lastSlotIdx + 1) % sorted.length]
  }
  const lastAb = sideAtBats[sideAtBats.length - 1]
  const lastSlotIdx = sorted.findIndex(s => s.id === lastAb.slotId)
  if (lastSlotIdx === -1) return sorted[0]
  return sorted[(lastSlotIdx + 1) % sorted.length]
}

/**
 * Apply stealing events that happened AFTER the last at-bat to produce a live diamond state.
 * Only stealings newer than the last at-bat's createdAt are applied.
 */
function computeDisplayBaseState(
  baseFromAtBat: BogenBaseStateDto | null,
  stealings: SpielbogenStealingResponse[],
  side: BogenSide,
  inning: number,
  lastAtBatCreatedAt: string | null,
): BogenBaseStateDto {
  let state: BogenBaseStateDto = baseFromAtBat ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
  const lastAtBatTime = lastAtBatCreatedAt ? new Date(lastAtBatCreatedAt).getTime() : 0
  const recentStealings = stealings
    .filter(s => s.side === side && s.inning === inning && new Date(s.createdAt).getTime() > lastAtBatTime)
    .sort((a, b) => a.id - b.id)

  for (const st of recentStealings) {
    const newState = { ...state }
    const removeFromBase = (b: number) => {
      if (b === 1) newState.firstSlotId = null
      else if (b === 2) newState.secondSlotId = null
      else if (b === 3) newState.thirdSlotId = null
    }
    const setBase = (b: number, id: number) => {
      if (b === 1) newState.firstSlotId = id
      else if (b === 2) newState.secondSlotId = id
      else if (b === 3) newState.thirdSlotId = id
    }
    if (st.type === 'STOLEN_BASE' || st.type === 'WILD_PITCH' || st.type === 'PASSED_BALL') {
      removeFromBase(st.fromBase)
      if (st.toBase < 4) setBase(st.toBase, st.slotId)
      // toBase===4 => runner home, no setBase
    } else if (st.type === 'CAUGHT_STEALING' || st.type === 'OUT_ON_PLAY') {
      removeFromBase(st.fromBase)
    }
    state = newState
  }
  return state
}

function deriveLastOutType(req: SpielbogenRecordAtBatRequest): 'strikeout' | 'fly' | 'grounder' | undefined {
  if (req.result === 'STRIKEOUT') return 'strikeout'
  if (req.result === 'OUT') {
    if (req.outType === 'FLY') return 'fly'
    if (req.outType === 'GROUNDER' || req.outType === 'UNASSISTED' ||
        req.outType === 'DOUBLE_PLAY' || req.outType === 'TRIPLE_PLAY' ||
        req.outType === 'FIELDERS_CHOICE') return 'grounder'
  }
  return undefined
}

export default function SpielbogenPage() {
  const { id: idParam } = useParams()
  const bogenId = idParam ? Number(idParam) : null
  const toast = useToastContext()

  const {
    sheet, loading, error, reload, recordAtBat, recordStealing, recordSubstitution, recordPositionSwap,
    undoLast, undoLastStealing, switchSide, resetScoring, correctLastAtBat, setCurrentSide, updateMeta,
    updateSlot, startClock, pauseClock, resumeClock, resetClock,
  } = useSpielbogenScoring(bogenId)

  const [showCorrection, setShowCorrection] = useState(false)
  const [showSidePicker, setShowSidePicker] = useState(false)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showAutoOutConfirm, setShowAutoOutConfirm] = useState(false)
  const [showClockStartSheet, setShowClockStartSheet] = useState(false)
  const [showSheet, setShowSheet] = useState(false)
  const [showCheatsheet, setShowCheatsheet] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [showMetaEdit, setShowMetaEdit] = useState(false)
  const [undoAnimSkip, setUndoAnimSkip] = useState(false)
  const [showPositionSwapDrawer, setShowPositionSwapDrawer] = useState(false)
  const [subSlotId, setSubSlotId] = useState<number | null>(null)
  const [quickStealingRunner, setQuickStealingRunner] = useState<{ slotId: number; name: string; base: 1 | 2 | 3 } | null>(null)
  const [showHitAdjust, setShowHitAdjust] = useState<null | { result: 'SINGLE' | 'DOUBLE' | 'TRIPLE'; baseStateBefore: BogenBaseStateDto; isError?: boolean }>(null)
  const [subPlayerInName, setSubPlayerInName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 3-Out / Side-Switch Center-Flash overlay
  const [sideSwitchFlash, setSideSwitchFlash] = useState<{
    newSide: BogenSide
    lastOutType?: 'strikeout' | 'fly' | 'grounder' | 'caughtStealing'
  } | null>(null)
  // Ref: bei Auto-Switch via handleRecord/handleRecordStealing setzen, useEffect liest beim Side-Change
  const lastOutTypeRef = useRef<'strikeout' | 'fly' | 'grounder' | 'caughtStealing' | null>(null)

  // Flash animations (ported from ScoringPage)
  const [homerunFlash, setHomerunFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  const [homerunRunner, setHomerunRunner] = useState<{ slotId: number; name: string; battingOrder: number } | null>(null)
  const [hbpFlash, setHbpFlash] = useState<string | null>(null)
  const [walkFlash, setWalkFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  const [strikeoutFlash, setStrikeoutFlash] = useState<string | null>(null)
  const [scoredFlash, setScoredFlash] = useState<{ runners: string[]; hitLabel: string | null } | null>(null)
  const [advanceFlash, setAdvanceFlash] = useState<{ runners: string[]; targets: string[] } | null>(null)
  const [outSlotIds, setOutSlotIds] = useState<ReadonlySet<number>>(() => new Set())

  // Auto-open sheet drawer when game transitions to DONE
  const prevStatusRef = useRef<string | null>(null)
  useEffect(() => {
    if (sheet?.meta.status === 'DONE' && prevStatusRef.current === 'LIVE') {
      setShowSheet(true)
    }
    if (sheet?.meta.status) prevStatusRef.current = sheet.meta.status
  }, [sheet?.meta.status])

  // Detect auto-switch: when backend changes currentSide show inning-switch banner
  const prevSideRef = useRef<BogenSide | null>(null)
  const currentSideForEffect = sheet?.meta.currentSide ?? null
  useEffect(() => {
    if (prevSideRef.current !== null && currentSideForEffect !== null && prevSideRef.current !== currentSideForEffect) {
      const reducedMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const lastOutType = lastOutTypeRef.current ?? undefined
      setSideSwitchFlash({ newSide: currentSideForEffect, lastOutType })
      setTimeout(() => setSideSwitchFlash(null), 1200)
      // Toast skipped — Center-Flash zeigt bereits Inning + Side + lastOutType.
      if (!reducedMotion && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 100, 50, 200]) } catch { /* not supported */ }
      }
      lastOutTypeRef.current = null
    }
    prevSideRef.current = currentSideForEffect
  }, [currentSideForEffect])

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (loading && !sheet) return <SpielbogenPageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4">
        <p className="text-softball-red-600 font-body text-sm">{error}</p>
        <button onClick={reload} className="text-navy-700 underline text-sm cursor-pointer">Neu laden</button>
        <Link to="/spielbogen" className="text-gray-500 text-xs hover:underline">← Zurück zur Liste</Link>
      </div>
    )
  }

  if (!sheet) return null

  const { meta, homeLineup, awayLineup, homeAtBats, awayAtBats } = sheet
  // PWA cacht API-GETs NetworkFirst (5s Timeout, 7 Tage) unter einem Cache-Namen, der Deploys
  // überlebt — bei schlechtem Empfang am Feld kann eine Vor-Deploy-Response ohne `clock`
  // ausgeliefert werden. Fallback statt Destructure-Crash, exakt wie in ScoringPage.tsx.
  const clock = sheet.clock ?? { elapsedSeconds: 0, running: false, started: false, limitMinutes: null, overLimit: false }

  const currentSide = meta.currentSide
  const slots = currentSide === 'HOME' ? homeLineup : awayLineup
  const atBats = currentSide === 'HOME' ? homeAtBats : awayAtBats
  const allAtBats = [...homeAtBats, ...awayAtBats]

  const outs = computeOuts(atBats, sheet.stealingEvents, meta.currentInning, currentSide)

  // Current batter
  const currentSlot = resolveCurrentSlot(slots, atBats, meta.currentInning, currentSide)

  // Last at-bat for preview
  const lastAtBat = allAtBats.length > 0
    ? allAtBats.reduce((a, b) => a.sequence > b.sequence ? a : b)
    : null

  // Latest action on current side + inning (for Undo dispatch). AB or Stealing.
  const currentInningAtBats = atBats.filter(ab => ab.side === currentSide && ab.inning === meta.currentInning)
  const currentInningStealings = sheet.stealingEvents.filter(s => s.side === currentSide && s.inning === meta.currentInning)
  const latestCurrentAB = currentInningAtBats.length > 0
    ? currentInningAtBats.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null
  const latestCurrentStealing = currentInningStealings.length > 0
    ? currentInningStealings.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null
  const latestAction: { type: 'AB' | 'STEALING' | 'AB_PREVIOUS'; side: BogenSide } | null = (() => {
    if (latestCurrentAB && latestCurrentStealing) {
      return new Date(latestCurrentAB.createdAt) > new Date(latestCurrentStealing.createdAt)
        ? { type: 'AB' as const, side: currentSide }
        : { type: 'STEALING' as const, side: currentSide }
    }
    if (latestCurrentAB) return { type: 'AB' as const, side: currentSide }
    if (latestCurrentStealing) return { type: 'STEALING' as const, side: currentSide }
    if (lastAtBat) return { type: 'AB_PREVIOUS' as const, side: lastAtBat.side }
    return null
  })()

  // Base state from last at-bat of the current side + inning
  const currentSideAtBats = atBats
    .filter(ab => ab.inning === meta.currentInning)
    .sort((a, b) => a.sequence - b.sequence)
  const lastSideAtBat = currentSideAtBats[currentSideAtBats.length - 1]
  const baseStateAfter = lastSideAtBat?.baseStateAfter ?? null

  // Live diamond state: apply recent stealings (after last at-bat) client-side
  const displayBaseState = computeDisplayBaseState(
    baseStateAfter,
    sheet.stealingEvents,
    currentSide,
    meta.currentInning,
    lastSideAtBat?.createdAt ?? null,
  )

  const handleRecordStealing = async (req: import('@/types').SpielbogenRecordStealingRequest) => {
    // Bei stealing-induced 3rd-Out lastOutType setzen, damit useEffect Center-Flash mit Kontext zeigt
    if ((req.type === 'CAUGHT_STEALING' || req.type === 'OUT_ON_PLAY') && outs + 1 >= 3) {
      lastOutTypeRef.current = 'caughtStealing'
    }
    // Mark slot as OUT for diamond exit-animation (in-place fade, kein Lauf zu Home)
    if (req.type === 'CAUGHT_STEALING' || req.type === 'OUT_ON_PLAY') {
      setOutSlotIds(prev => new Set([...prev, req.slotId]))
      setTimeout(() => setOutSlotIds(prev => {
        const next = new Set(prev)
        next.delete(req.slotId)
        return next
      }), 1500)
    }
    await recordStealing(req)
  }

  const handleRecord = async (req: SpielbogenRecordAtBatRequest) => {
    // Capture batter name BEFORE reload changes it
    const batterName = currentSlot?.name ?? 'Batter'
    const batterOrder = currentSlot?.battingOrder ?? 0
    const batterSlotId = currentSlot?.id ?? 0
    const beforeBaseState = displayBaseState

    // projectedOuts vor Flash-Block — wird genutzt um Strikeout-Flash bei 3rd-Out zu skippen
    let increment = 0
    if (req.result === 'STRIKEOUT' || req.result === 'AUTOMATIC_OUT') {
      increment = 1
    } else if (req.result === 'OUT' && !req.isError) {
      if (req.outType === 'DOUBLE_PLAY') increment = 2
      else if (req.outType === 'TRIPLE_PLAY') increment = 3
      else increment = 1
    }
    const projectedOuts = outs + increment

    try {
      // Detect runners die als OUT verschwinden (DP/FC/Force-Out): vorher
      // auf Base, nachher nicht mehr UND nicht gescort. Markieren für
      // in-place fade-Exit statt Lauf zu Home.
      if (req.baseStateAfter && beforeBaseState) {
        const before = beforeBaseState
        const after = req.baseStateAfter
        const beforeRunners: Array<{ slotId: number; base: 1 | 2 | 3 }> = []
        if (before.firstSlotId != null) beforeRunners.push({ slotId: before.firstSlotId, base: 1 })
        if (before.secondSlotId != null) beforeRunners.push({ slotId: before.secondSlotId, base: 2 })
        if (before.thirdSlotId != null) beforeRunners.push({ slotId: before.thirdSlotId, base: 3 })
        const afterSet = new Set<number>()
        if (after.firstSlotId != null) afterSet.add(after.firstSlotId)
        if (after.secondSlotId != null) afterSet.add(after.secondSlotId)
        if (after.thirdSlotId != null) afterSet.add(after.thirdSlotId)
        // Disappeared by base-DESC (3B → 2B → 1B), die ersten N=runsScored sind scored
        const disappeared = beforeRunners
          .filter(r => !afterSet.has(r.slotId))
          .sort((a, b) => b.base - a.base)
        const runs = req.runsScored ?? 0
        const outRunners = disappeared.slice(runs).map(r => r.slotId)
        if (outRunners.length > 0) {
          setOutSlotIds(prev => new Set([...prev, ...outRunners]))
          setTimeout(() => setOutSlotIds(prev => {
            const next = new Set(prev)
            for (const id of outRunners) next.delete(id)
            return next
          }), 1500)
        }
      }

      await recordAtBat(req)

      const reducedMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Flash animations
      if (!reducedMotion) {
        if (req.result === 'HOMERUN') {
          setHomerunFlash({ batter: batterName, runsScored: req.runsScored ?? 0 })
          setTimeout(() => setHomerunFlash(null), 2200)
          setHomerunRunner({ slotId: batterSlotId, name: batterName, battingOrder: batterOrder })
          setTimeout(() => setHomerunRunner(null), 1600)
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([80, 60, 80, 60, 200]) } catch { /* not supported */ }
          }
        } else if (req.result === 'HIT_BY_PITCH') {
          setHbpFlash(batterName)
          setTimeout(() => setHbpFlash(null), 1500)
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([30, 30, 30]) } catch { /* not supported */ }
          }
        } else if (req.result === 'WALK') {
          setWalkFlash({ batter: batterName, runsScored: req.runsScored ?? 0 })
          setTimeout(() => setWalkFlash(null), 1700)
        } else if (req.result === 'STRIKEOUT' && projectedOuts < 3) {
          setStrikeoutFlash(batterName)
          setTimeout(() => setStrikeoutFlash(null), 1600)
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([40, 40, 80]) } catch { /* not supported */ }
          }
        }

        // Scored flash for hits with runs
        if (req.result !== 'HOMERUN' && req.result !== 'HIT_BY_PITCH' && req.result !== 'WALK') {
          const runsScored = req.runsScored ?? 0
          const isHit = req.result === 'SINGLE' || req.result === 'DOUBLE' || req.result === 'TRIPLE'
          const hadRunners = displayBaseState.firstSlotId != null || displayBaseState.secondSlotId != null || displayBaseState.thirdSlotId != null
          if (runsScored > 0 || (isHit && hadRunners)) {
            // Build scored runner names from previous base state
            const scoredNames: string[] = []
            if (req.result === 'SINGLE' && displayBaseState.thirdSlotId != null) {
              const s = slots.find(sl => sl.id === displayBaseState.thirdSlotId)
              if (s) scoredNames.push(s.name)
            } else if (req.result === 'DOUBLE') {
              if (displayBaseState.secondSlotId != null) {
                const s = slots.find(sl => sl.id === displayBaseState.secondSlotId)
                if (s) scoredNames.push(s.name)
              }
              if (displayBaseState.thirdSlotId != null) {
                const s = slots.find(sl => sl.id === displayBaseState.thirdSlotId)
                if (s) scoredNames.push(s.name)
              }
            } else if (req.result === 'TRIPLE') {
              for (const id of [displayBaseState.firstSlotId, displayBaseState.secondSlotId, displayBaseState.thirdSlotId]) {
                if (id != null) {
                  const s = slots.find(sl => sl.id === id)
                  if (s) scoredNames.push(s.name)
                }
              }
            }
            // Nur Flash zeigen wenn tatsächlich Runs scored — keine Dead-End-Frage bei 0 Runs
            if (scoredNames.length > 0 || runsScored > 0) {
              setScoredFlash({
                runners: scoredNames.length > 0 ? scoredNames : [`${runsScored} Run${runsScored > 1 ? 's' : ''}`],
                hitLabel: null,
              })
              setTimeout(() => setScoredFlash(null), 2200)
            }
          }
        }

        // Runner-Advance-Flash (Diff vor/nach Play)
        if (req.baseStateAfter) {
          const before = beforeBaseState
          const after = req.baseStateAfter
          const advanced: string[] = []
          const targets: string[] = []
          // Runner1B → 2B
          if (before.firstSlotId != null && after.secondSlotId === before.firstSlotId) {
            const s = slots.find(sl => sl.id === before.firstSlotId)
            if (s) { advanced.push(s.name); targets.push('2B') }
          }
          // Runner1B → 3B
          if (before.firstSlotId != null && after.thirdSlotId === before.firstSlotId) {
            const s = slots.find(sl => sl.id === before.firstSlotId)
            if (s) { advanced.push(s.name); targets.push('3B') }
          }
          // Runner2B → 3B
          if (before.secondSlotId != null && after.thirdSlotId === before.secondSlotId) {
            const s = slots.find(sl => sl.id === before.secondSlotId)
            if (s) { advanced.push(s.name); targets.push('3B') }
          }
          // Skip wenn bereits Run scored (scoredFlash) oder HR/Hit (hat eigenen Flash)
          const hasOwnFlash = req.result === 'HOMERUN' || req.result === 'HIT_BY_PITCH' ||
                              req.result === 'WALK' || req.result === 'STRIKEOUT' ||
                              ((req.runsScored ?? 0) > 0)
          if (advanced.length > 0 && !hasOwnFlash) {
            setAdvanceFlash({ runners: advanced, targets })
            setTimeout(() => setAdvanceFlash(null), 1200)
          }
        }
      }

      // Auto-switch after 3 outs happens SERVER-side via maybeAutoSwitchSide.
      // recordAtBat() already reloads sheet with new side. Just set lastOutType
      // for the side-switch Flash (useEffect detects currentSide change and
      // triggers Center-Flash with lastOutType context).
      if (projectedOuts >= 3) {
        lastOutTypeRef.current = deriveLastOutType(req) ?? null
      }

      // Auto-Open Hit-Adjust-Sheet (Tap-Cycle) bei SINGLE/DOUBLE/TRIPLE mit
      // Runnern — computeBaseStateAdvance ist optimistisch. User cyclet
      // Runner zur tatsächlichen End-Position. Skip bei 3rd-Out.
      const hadRunnersBefore = beforeBaseState != null
        && (beforeBaseState.firstSlotId != null
          || beforeBaseState.secondSlotId != null
          || beforeBaseState.thirdSlotId != null)
      // Modal nur wenn ≥1 Runner-from-before noch auf Base nach AB (= adjustable).
      // Wenn alle scoren / batter is alone → nichts zu tun, skip Modal.
      const beforeIds = beforeBaseState ? [
        beforeBaseState.firstSlotId,
        beforeBaseState.secondSlotId,
        beforeBaseState.thirdSlotId,
      ].filter((id): id is number => id != null) : []
      const afterIds = req.baseStateAfter ? [
        req.baseStateAfter.firstSlotId,
        req.baseStateAfter.secondSlotId,
        req.baseStateAfter.thirdSlotId,
      ].filter((id): id is number => id != null) : []
      const adjustableRunners = beforeIds.filter(id => afterIds.includes(id))
      const isHit = req.result === 'SINGLE' || req.result === 'DOUBLE' || req.result === 'TRIPLE'
      // Reach-on-Error: Batter safe via Fehler (result=OUT + isError). Runner-Advance ist
      // optimistisch — wie beim Single soll der Scorer Runner-Positionen anpassen können.
      // (Legacy öffnet das CorrectionSheet ebenfalls bei Error mit Runnern.)
      const isErrorReach = req.result === 'OUT' && req.isError === true
      if ((isHit || isErrorReach) && hadRunnersBefore && adjustableRunners.length > 0 && projectedOuts < 3) {
        setShowHitAdjust({
          result: isHit ? (req.result as 'SINGLE' | 'DOUBLE' | 'TRIPLE') : 'SINGLE',
          baseStateBefore: beforeBaseState,
          isError: isErrorReach,
        })
      }
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  /**
   * Automatisches Out (fehlende Spielerin). Läuft über den normalen AB-Pfad,
   * damit Out-Zählung, 3rd-Out-Auto-Switch, Out-Index und Undo identisch greifen.
   * Base-State bleibt unverändert — es hat niemand geschlagen.
   */
  const handleAutomaticOut = async () => {
    setShowAutoOutConfirm(false)
    if (!currentSlot) return
    await handleRecord({
      side: currentSide,
      slotId: currentSlot.id,
      inning: meta.currentInning,
      result: 'AUTOMATIC_OUT',
      runsScored: 0,
      rbi: 0,
      baseStateAfter: displayBaseState,
    })
  }

  const handleSideToggleClick = () => {
    if (outs >= 3) {
      setShowSwitchConfirm(true)
    } else {
      toast.show(`Inning noch nicht zu Ende (${outs}/3 Outs)`)
    }
  }

  const handleSwitchConfirm = async () => {
    setShowSwitchConfirm(false)
    setSubmitting(true)
    try {
      await switchSide()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEndGame = async () => {
    setShowEndConfirm(false)
    if (!bogenId) return
    setSubmitting(true)
    try {
      await api.endSpielbogen(bogenId, {
        homeRuns: meta.homeRuns,
        awayRuns: meta.awayRuns,
      })
      await reload()
      toast.show('Spiel beendet', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReopenGame = async () => {
    if (!bogenId) return
    setSubmitting(true)
    try {
      await api.reopenSpielbogen(bogenId)
      await reload()
      toast.show('Spiel wieder geöffnet', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Tippen auf die Uhr: noch nie gestartet → Start-Dialog; sonst pausiert/setzt fort.
  // Gleiche Bedienung wie in der Legacy-ScoringPage (Task 5) — geteilter Dialog, siehe unten.
  const handleClockPress = () => {
    if (!clock.started) {
      setShowClockStartSheet(true)
      return
    }
    if (clock.running) {
      void handlePauseClock()
    } else {
      void handleResumeClock()
    }
  }

  const handleStartClock = async (limitMinutes: number | null) => {
    try {
      await startClock(limitMinutes)
      setShowClockStartSheet(false)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handlePauseClock = async () => {
    try {
      await pauseClock()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleResumeClock = async () => {
    try {
      await resumeClock()
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleResetClock = async () => {
    try {
      await resetClock()
      setShowClockStartSheet(false)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleSubstitutionSubmit = async () => {
    if (!subSlotId || !subPlayerInName.trim()) return
    setSubmitting(true)
    try {
      await recordSubstitution({
        side: currentSide,
        slotId: subSlotId,
        inning: meta.currentInning,
        playerInName: subPlayerInName.trim(),
      })
      setShowSubModal(false)
      setSubSlotId(null)
      setSubPlayerInName('')
      toast.show('Auswechslung gespeichert', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSlotUpdate = async (slotId: number, req: UpdateSlotRequest) => {
    await updateSlot(slotId, req)
    toast.show('Slot aktualisiert', 'success')
  }

  const handleUndo = async () => {
    if (!latestAction) return
    setUndoAnimSkip(true)
    try {
      if (latestAction.type === 'STEALING') {
        await undoLastStealing(latestAction.side)
      } else {
        await undoLast(latestAction.side)
      }
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      // Reset after one frame so subsequent runner-changes animate normally.
      setTimeout(() => setUndoAnimSkip(false), 500)
    }
  }

  const isDone = meta.status === 'DONE'
  const isLive = meta.status === 'LIVE'

  const upcomingSlots = computeUpcomingSlots(slots, currentSlot)

  return (
    <div className="flex flex-col min-h-screen bg-cream-50">
      {/* 3-Out / Side-Switch Center-Flash */}
      <AnimatePresence>
        {sideSwitchFlash && (
          <motion.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-softball-red-700/85 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 20 }}
              className="text-center text-white px-6"
            >
              <div className="font-display text-6xl sm:text-7xl font-extrabold tracking-widest mb-2">
                3 OUTS
              </div>
              <div className="font-display text-xl sm:text-2xl font-extrabold tracking-widest uppercase">
                {sideSwitchFlash.lastOutType === 'strikeout' ? 'Strikeout · Seitenwechsel'
                  : sideSwitchFlash.lastOutType === 'fly' ? 'Fly Out · Seitenwechsel'
                  : sideSwitchFlash.lastOutType === 'grounder' ? 'Grounder Out · Seitenwechsel'
                  : sideSwitchFlash.lastOutType === 'caughtStealing' ? 'Caught Stealing · Seitenwechsel'
                  : 'Seitenwechsel'}
              </div>
              <div className="font-body text-base sm:text-lg mt-2 opacity-95">
                {sideSwitchFlash.newSide === 'HOME' ? 'Heim' : 'Gast'} schlägt jetzt
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav header */}
      <header className="bg-band text-band-ink sticky top-0 z-50 shadow-md">
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
          <Link to="/spielbogen" className="p-1 hover:bg-navy-700 rounded-lg" aria-label="Zurück">
            <ChevronLeftLucide size={22} />
          </Link>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/deadsox.svg" alt="Dead Sox" className="w-7 h-7 rounded" />
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCheatsheet(true)}
              className="p-1.5 hover:bg-navy-700 rounded-lg text-white/80 hover:text-white text-sm font-medium cursor-pointer inline-flex items-center gap-1"
              title="Notation-Cheatsheet"
              aria-label="Hilfe / Cheatsheet"
            >
              <HelpCircle size={14} /> <span className="hidden sm:inline">Hilfe</span>
            </button>
            {isLive && (
              <>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={submitting}
                  className="p-1.5 hover:bg-navy-700 rounded-lg text-white/80 hover:text-white text-sm font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                  title="Scoring zurücksetzen"
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  onClick={() => setShowEndConfirm(true)}
                  disabled={submitting}
                  className="p-1.5 hover:bg-navy-700 rounded-lg text-white/80 hover:text-white text-sm font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                  title="Spiel beenden"
                >
                  <Flag size={14} /> Beenden
                </button>
              </>
            )}
            {isDone && (
              <button
                onClick={handleReopenGame}
                disabled={submitting}
                className="p-1.5 hover:bg-navy-700 rounded-lg text-white/80 hover:text-white text-sm font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                title="Spiel wieder öffnen"
              >
                <RotateCcw size={14} /> Reopen
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Live-State-Strip */}
      <div className="bg-band text-band-ink px-4 py-2 flex items-center gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white/80">Inning</span>
          <span className="font-display text-2xl font-extrabold leading-none tabular-nums">{meta.currentInning}</span>
          <button
            type="button"
            onClick={() => isLive && setShowSidePicker(true)}
            disabled={!isLive}
            className="font-display inline-flex items-center text-[10px] px-2 py-0.5 border border-white/20 rounded-full text-white/85 tracking-widest uppercase hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title={isLive ? 'Top/Btm tauschen' : ''}
          >
            {meta.currentSide === 'AWAY' ? '↑ Top' : '↓ Btm'}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <GameClockReadout
            elapsedSeconds={clock.elapsedSeconds}
            limitMinutes={clock.limitMinutes}
            running={clock.running}
            started={clock.started}
            estimatedTotalMinutes={clock.durationEstimate?.totalMinutes}
            onPress={handleClockPress}
          />
          {clock.started && (
            <button
              type="button"
              onClick={() => setShowClockStartSheet(true)}
              className="text-white/45 hover:text-white/80 cursor-pointer transition-colors"
              aria-label="Uhr-Optionen"
              title="Uhr zurücksetzen"
            >
              <DotsVertical size={14} />
            </button>
          )}
        </div>
        {/* Tap auf die Out-Punkte bucht ein Automatisches Out (Legacy-Parität,
            gleicher Handler wie der MEHR-Menu-Eintrag). */}
        <button
          type="button"
          onClick={() => setShowAutoOutConfirm(true)}
          disabled={!isLive || submitting || outs >= 3 || !currentSlot}
          className="flex items-center gap-2 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
          title="Automatisches Out buchen (fehlende Spielerin) — zählt als Out im Inning"
          aria-label="Automatisches Out"
        >
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white/80 group-hover:text-white transition-colors">Outs</span>
          <span className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < outs ? 'bg-softball-red-500' : 'bg-white/20 group-hover:bg-white/35'}`} />
            ))}
          </span>
        </button>
      </div>
      <GameClockRule
        elapsedSeconds={clock.elapsedSeconds}
        limitMinutes={clock.limitMinutes}
        running={clock.running}
        started={clock.started}
      />

      {/* Score-Block */}
      <div className="px-4 py-3 bg-cream-50 flex items-center justify-center gap-3 border-b border-cream-300">
        <span className="font-display text-sm font-bold text-gray-500 uppercase tracking-widest">{meta.homeTeamName}</span>
        <span className="font-display text-3xl font-extrabold text-navy-800 tabular-nums">{meta.homeRuns}</span>
        <span className="text-gray-400 text-2xl">—</span>
        <span className="font-display text-3xl font-extrabold text-softball-red-600 tabular-nums">{meta.awayRuns}</span>
        <span className="font-display text-sm font-bold text-gray-500 uppercase tracking-widest">{meta.awayTeamName}</span>
        <button
          onClick={() => setShowMetaEdit(true)}
          className="p-1 text-gray-400 hover:text-navy-700 cursor-pointer"
          aria-label="Spielbogen bearbeiten"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Side toggle */}
      <BogenSideToggle
        currentSide={currentSide}
        outs={outs}
        homeTeamName={meta.homeTeamName}
        awayTeamName={meta.awayTeamName}
        onSwitchSide={handleSideToggleClick}
        disabled={submitting || isDone}
      />

      {/* Diamond */}
      <BogenDiamondView
        baseState={displayBaseState}
        slots={slots}
        homerunRunner={homerunRunner}
        onRunnerTap={isLive ? (r) => setQuickStealingRunner({ slotId: r.slotId, name: r.name, base: r.base }) : undefined}
        outSlotIds={outSlotIds}
        skipExitToHome={undoAnimSkip}
      />
      {isLive && displayBaseState && (displayBaseState.firstSlotId != null || displayBaseState.secondSlotId != null || displayBaseState.thirdSlotId != null) && (
        <p className="text-[11px] text-gray-500 text-center -mt-1 mb-1">
          <span className="font-bold text-navy-800">Tipp</span> auf Runner für{' '}
          <span className="font-bold text-emerald-700">Stolen Base</span>
          {' / '}
          <span className="font-bold text-softball-red-600">Caught Stealing</span>
        </p>
      )}

      {/* Batter card — cream bg, below diamond, above action buttons */}
      {isLive && (
        <BatterCard currentSlot={currentSlot} upcomingSlots={upcomingSlots} pending={submitting} />
      )}

      {/* Action buttons (only for LIVE) */}
      {isLive && (
        <BogenActionButtons
          side={currentSide}
          currentSlotId={currentSlot?.id ?? null}
          inning={meta.currentInning}
          outs={outs}
          baseStateAfter={displayBaseState}
          slots={slots}
          disabled={submitting}
          onRecord={handleRecord}
          onRecordStealing={handleRecordStealing}
          onSwitchSide={handleSideToggleClick}
          onSubstitution={() => {
            setSubSlotId(currentSlot?.id ?? null)
            setShowSubModal(true)
          }}
          onPositionSwap={() => setShowPositionSwapDrawer(true)}
          onAutomaticOut={() => setShowAutoOutConfirm(true)}
          canAutomaticOut={isLive && outs < 3 && currentSlot != null}
          onEndGame={() => setShowEndConfirm(true)}
          canEndGame={isLive}
        />
      )}

      {/* Game-End-Card (only for DONE) */}
      {!isLive && isDone && (() => {
        const homeWon = meta.homeRuns > meta.awayRuns
        const awayWon = meta.awayRuns > meta.homeRuns
        const tied = meta.homeRuns === meta.awayRuns
        return (
          <div className="mx-4 my-4 bg-cream-50 border border-cream-300 rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-wide uppercase text-navy-900 text-center">
              Spiel beendet
            </h2>

            {/* Score-Grid: Team-Name links (truncate), Score rechts (tabular-nums) */}
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 items-center">
              <div className="min-w-0">
                <div className="text-[10px] font-display tracking-widest uppercase text-gray-500 font-bold">
                  Heim {homeWon && <span className="text-softball-red-600 ml-1">★ Sieg</span>}
                </div>
                <div className={`font-display text-base sm:text-lg font-extrabold uppercase truncate ${homeWon ? 'text-navy-900' : 'text-gray-700'}`} title={meta.homeTeamName}>
                  {meta.homeTeamName}
                </div>
              </div>
              <div className={`font-display text-4xl sm:text-5xl font-extrabold tabular-nums leading-none ${homeWon ? 'text-softball-red-600' : tied ? 'text-gray-700' : 'text-gray-400'}`}>
                {meta.homeRuns}
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-display tracking-widest uppercase text-gray-500 font-bold">
                  Gast {awayWon && <span className="text-softball-red-600 ml-1">★ Sieg</span>}
                </div>
                <div className={`font-display text-base sm:text-lg font-extrabold uppercase truncate ${awayWon ? 'text-navy-900' : 'text-gray-700'}`} title={meta.awayTeamName}>
                  {meta.awayTeamName}
                </div>
              </div>
              <div className={`font-display text-4xl sm:text-5xl font-extrabold tabular-nums leading-none ${awayWon ? 'text-softball-red-600' : tied ? 'text-gray-700' : 'text-gray-400'}`}>
                {meta.awayRuns}
              </div>
            </div>

            {tied && (
              <div className="text-center text-xs font-display tracking-widest uppercase text-gray-500 font-bold">
                Unentschieden
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => setShowSheet(true)}
                className="w-full font-display py-3 rounded-xl bg-navy-800 text-white font-extrabold tracking-widest uppercase hover:bg-navy-900 cursor-pointer flex items-center justify-center gap-2"
              >
                <ClipboardList size={18} /> Spielbogen anzeigen
              </button>
              <button
                onClick={() => generateSpielbogenPdf(sheet)}
                className="w-full font-display py-3 rounded-xl bg-cream-100 border border-cream-300 text-navy-800 font-bold tracking-widest uppercase hover:bg-cream-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <FileText size={18} /> Als PDF exportieren
              </button>
              <button
                onClick={handleReopenGame}
                disabled={submitting}
                className="w-full font-display py-2 rounded-xl text-gray-500 text-xs font-bold tracking-widest uppercase hover:text-gray-700 cursor-pointer disabled:opacity-50"
              >
                ↻ Spiel wieder öffnen
              </button>
            </div>
          </div>
        )
      })()}

      {/* Last at-bat + Undo + Korrektur — nur bei LIVE-Game */}
      {isLive && (
        <LastAtBatPreview
          lastAtBat={lastAtBat}
          slots={[...homeLineup, ...awayLineup]}
          onUndo={handleUndo}
          onCorrect={() => setShowCorrection(true)}
          submitting={submitting}
          disabled={!latestAction}
        />
      )}

      {/* Korrektur-Sheet */}
      {showCorrection && lastSideAtBat && (
        <CorrectionSheet
          open={showCorrection}
          onClose={() => setShowCorrection(false)}
          baseState={lastSideAtBat.baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
          slots={slots}
          initialRunsScored={lastSideAtBat.runsScored}
          outsAfter={outs}
          onSave={async (payload) => {
            try {
              await correctLastAtBat(currentSide, payload)
              toast.show('Korrektur gespeichert', 'success')
            } catch (e) {
              toast.show((e as Error).message, 'error')
            }
          }}
        />
      )}

      {/* FAB: Spielbogen */}
      <div className="fixed bottom-6 right-4 z-40">
        <button
          onClick={() => setShowSheet(true)}
          className="w-14 h-14 rounded-full bg-navy-800 text-white shadow-lg flex items-center justify-center hover:bg-navy-900 transition-colors cursor-pointer"
          aria-label="Spielbogen anzeigen"
        >
          <ClipboardList size={22} />
        </button>
      </div>

      {/* Spielbogen-Drawer: Live-Feed statt RFL-Gitter */}
      {showSheet && (
        <BogenSheetDrawer
          open={showSheet}
          onClose={() => setShowSheet(false)}
          sheet={sheet}
          onEndGame={isLive ? () => { setShowSheet(false); setShowEndConfirm(true) } : undefined}
          onReopenGame={isDone ? handleReopenGame : undefined}
          onReload={reload}
          onSlotUpdate={handleSlotUpdate}
          currentBatterName={isLive ? currentSlot?.name : undefined}
        />
      )}

      {/* Side Picker — manuell Top/Btm korrigieren */}
      {showSidePicker && (
        <ResponsiveSheet
          open={showSidePicker}
          onClose={() => setShowSidePicker(false)}
          title="Welche Mannschaft schlägt jetzt?"
          maxWidth="sm"
        >
          <div className="p-4 space-y-2">
            <p className="text-xs text-gray-500 font-body">
              Falls du dich beim Start verwählt hast — wähle die richtige Seite. Bisherige AtBats bleiben unverändert.
            </p>
            <button
              onClick={async () => {
                setShowSidePicker(false)
                try {
                  await setCurrentSide('AWAY')
                  toast.show('Top — Gastmannschaft schlägt', 'success')
                } catch (e) {
                  toast.show((e as Error).message, 'error')
                }
              }}
              disabled={meta.currentSide === 'AWAY'}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 cursor-pointer disabled:opacity-50 text-left"
            >
              <div className="font-display font-bold text-navy-900 text-sm uppercase tracking-wide">↑ Top — Gast schlägt</div>
              <div className="text-xs text-gray-500 mt-0.5">{meta.awayTeamName}</div>
            </button>
            <button
              onClick={async () => {
                setShowSidePicker(false)
                try {
                  await setCurrentSide('HOME')
                  toast.show('Btm — Heimmannschaft schlägt', 'success')
                } catch (e) {
                  toast.show((e as Error).message, 'error')
                }
              }}
              disabled={meta.currentSide === 'HOME'}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 cursor-pointer disabled:opacity-50 text-left"
            >
              <div className="font-display font-bold text-navy-900 text-sm uppercase tracking-wide">↓ Btm — Heim schlägt</div>
              <div className="text-xs text-gray-500 mt-0.5">{meta.homeTeamName}</div>
            </button>
          </div>
        </ResponsiveSheet>
      )}

      {/* Confirm: switch side */}
      {showSwitchConfirm && (
        <ConfirmModal
          title="Side wechseln?"
          message={`Inning mit ${outs} Outs zu Ende. Die andere Mannschaft schlägt jetzt.`}
          confirmLabel="Side wechseln"
          cancelLabel="Abbrechen"
          onConfirm={handleSwitchConfirm}
          onCancel={() => setShowSwitchConfirm(false)}
        />
      )}

      {/* Confirm: automatisches Out */}
      {showAutoOutConfirm && (
        <ConfirmModal
          title="Automatisches Out?"
          message={`${currentSlot?.name ?? 'Slot'} (#${currentSlot?.battingOrder ?? '?'}) fehlt. Wird als Out im Inning gezählt (${outs}/3 → ${Math.min(outs + 1, 3)}/3), aber nicht als At-Bat.`}
          confirmLabel="Out buchen"
          cancelLabel="Abbrechen"
          onConfirm={handleAutomaticOut}
          onCancel={() => setShowAutoOutConfirm(false)}
        />
      )}

      {/* Confirm: end game */}
      {showEndConfirm && (
        <ConfirmModal
          title="Spiel beenden?"
          message={`Endstand: ${meta.homeTeamName} ${meta.homeRuns} : ${meta.awayRuns} ${meta.awayTeamName}. Spielbogen auf DONE setzen?`}
          confirmLabel="Spiel beenden"
          cancelLabel="Abbrechen"
          onConfirm={handleEndGame}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      {/* Confirm: reset scoring */}
      {showResetConfirm && (
        <ConfirmModal
          title="Scoring zurücksetzen?"
          message="Alle AtBats, Stealings und Substitutions werden gelöscht. Score → 0:0, Inning → I. Lineup bleibt erhalten."
          confirmLabel="Zurücksetzen"
          cancelLabel="Abbrechen"
          onConfirm={async () => {
            setShowResetConfirm(false)
            try {
              await resetScoring()
              toast.show('Scoring zurückgesetzt', 'success')
            } catch (e) {
              toast.show((e as Error).message, 'error')
            }
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {/* Position Swap Drawer */}
      {sheet && (
        <PositionSwapDrawer
          open={showPositionSwapDrawer}
          onClose={() => setShowPositionSwapDrawer(false)}
          side={sheet.meta.currentSide}
          slots={sheet.meta.currentSide === 'HOME' ? sheet.homeLineup : sheet.awayLineup}
          currentInning={sheet.meta.currentInning}
          onSubmit={async ({ inning, changes }) => {
            await recordPositionSwap({ side: sheet.meta.currentSide, inning, changes })
            toast.show('Positionen getauscht', 'success')
          }}
        />
      )}

      {/* BogenMeta Edit Modal */}
      {sheet && (
        <BogenMetaEditModal
          open={showMetaEdit}
          onClose={() => setShowMetaEdit(false)}
          meta={sheet.meta}
          onSubmit={async (req) => {
            await updateMeta(req)
            toast.show('Spielbogen aktualisiert', 'success')
          }}
        />
      )}

      {/* Substitution modal */}
      <ResponsiveSheet
        open={showSubModal}
        onClose={() => { setShowSubModal(false); setSubPlayerInName('') }}
        title="Auswechslung"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => { setShowSubModal(false); setSubPlayerInName('') }}
              className="flex-1 py-2 text-sm text-gray-600 rounded-lg border border-cream-300 hover:bg-cream-100 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubstitutionSubmit}
              disabled={!subPlayerInName.trim() || submitting}
              className="flex-1 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Speichern
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide font-display">
              Slot (ausgewechselter Spieler)
            </label>
            <select
              value={subSlotId ?? ''}
              onChange={e => setSubSlotId(Number(e.target.value))}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy-400"
            >
              <option value="">Slot wählen…</option>
              {slots.map(s => (
                <option key={s.id} value={s.id}>
                  #{s.battingOrder} {s.name} ({s.position ?? '—'}){s.id === currentSlot?.id ? ' — am Schlag' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide font-display">
              Neuer Spieler (Name)
            </label>
            <input
              type="text"
              value={subPlayerInName}
              onChange={e => setSubPlayerInName(e.target.value)}
              placeholder="Name des neuen Spielers"
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
            />
          </div>
        </div>
      </ResponsiveSheet>

      {/* ===== FLASH ANIMATIONS (ported from ScoringPage) ===== */}

      {/* Homerun Flash */}
      <AnimatePresence>
        {homerunFlash && (() => {
          const runs = homerunFlash.runsScored
          const isGrandSlam = runs >= 4
          const typeLabel = runs === 1 ? 'SOLO HR' : runs === 2 ? '2-RUN HR' : runs === 3 ? '3-RUN HR' : 'GRAND SLAM'
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                x: [0, -16, 14, -12, 10, -6, 4, -2, 0],
                y: [0, 8, -5, 6, -4, 3, -2, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/95"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0.3, 0] }}
                transition={{ duration: 0.5, times: [0, 0.1, 0.4, 1] }}
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at 50% 50%, #FFD93D 0%, rgba(204,41,54,0.55) 22%, transparent 55%)' }}
              />
              {[0, 0.1, 0.22].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute w-40 h-40 rounded-full border-[6px] border-softball-red-600"
                  initial={{ scale: 0, opacity: 0.9 }}
                  animate={{ scale: [0, 6], opacity: [0.9, 0] }}
                  transition={{ duration: 1.0, ease: 'easeOut', delay }}
                />
              ))}
              <svg className="absolute pointer-events-none" width="900" height="900" viewBox="-300 -300 600 600">
                {[...Array(16)].map((_, i) => {
                  const angle = (i * 360) / 16
                  const rad = (angle * Math.PI) / 180
                  return (
                    <motion.line
                      key={i}
                      x1={Math.cos(rad) * 80} y1={Math.sin(rad) * 80}
                      x2={Math.cos(rad) * 290} y2={Math.sin(rad) * 290}
                      stroke={i % 2 === 0 ? '#CC2936' : '#0A0F5C'}
                      strokeWidth="7" strokeLinecap="round"
                      initial={{ opacity: 0, pathLength: 0 }}
                      animate={{ opacity: [0, 0.75, 0], pathLength: [0, 1, 1] }}
                      transition={{ duration: 1.0, delay: 0.3 + i * 0.012, ease: 'easeOut' }}
                    />
                  )
                })}
              </svg>
              <motion.div
                initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
                animate={{ scale: [0.2, 1.4, 0.95, 1.05, 1, 1], rotate: [-25, 10, -6, 4, -4, -4], opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
                transition={{ duration: 0.6, ease: [0.16, 1.4, 0.3, 1] }}
                className="text-center relative z-10"
              >
                <div
                  className="font-display font-black text-softball-red-600 leading-none tracking-tight"
                  style={{
                    fontSize: 'clamp(100px, 28vw, 280px)',
                    textShadow: '8px 8px 0 rgba(10,15,92,0.3), -3px -3px 0 rgba(255,251,243,0.7)',
                    WebkitTextStroke: '2.5px var(--color-softball-red-700)',
                  }}
                >
                  HR<span className="text-navy-900">!</span>
                </div>
                <motion.div
                  initial={{ scale: 0, rotate: 30 }}
                  animate={{ scale: [0, 1.3, 1], rotate: isGrandSlam ? 12 : 8 }}
                  transition={{ duration: 0.45, delay: 0.3, ease: 'backOut' }}
                  className={`absolute -top-3 -right-2 sm:-right-12 font-display font-black text-base sm:text-2xl px-3 py-1 rounded-md tracking-wider shadow-lg border-2 border-cream-50 ${
                    isGrandSlam ? 'bg-amber-400 text-navy-900' : 'bg-navy-900 text-white'
                  }`}
                >
                  {typeLabel}
                </motion.div>
                <div className="font-display mt-3 text-xl sm:text-3xl font-extrabold text-navy-900 uppercase tracking-widest">
                  {homerunFlash.batter}
                </div>
                <div className="font-display mt-1 text-sm sm:text-lg font-extrabold text-softball-red-700 uppercase tracking-widest">
                  {runs} {runs === 1 ? 'Run' : 'Runs'} · → HOME
                </div>
              </motion.div>
              {[...Array(12)].map((_, i) => {
                const colors = ['bg-softball-red-600', 'bg-navy-900', 'bg-cream-300']
                const sizes = ['w-2 h-3', 'w-3 h-2', 'w-1.5 h-4', 'w-2 h-2']
                return (
                  <motion.div
                    key={`rain-${i}`}
                    className={`absolute ${colors[i % colors.length]} ${sizes[i % sizes.length]} rounded-sm`}
                    style={{ left: `${Math.random() * 100}%`, top: '-5%' }}
                    initial={{ y: 0, rotate: 0, opacity: 0 }}
                    animate={{ y: '110vh', rotate: Math.random() * 720 - 360, x: (Math.random() - 0.5) * 100, opacity: [0, 1, 1, 0.6] }}
                    transition={{ duration: 2.0 + Math.random() * 0.5, ease: 'easeIn', delay: 0.6 + i * 0.04 }}
                  />
                )
              })}
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* HBP Flash */}
      <AnimatePresence>
        {hbpFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, -14, 12, -10, 8, -5, 3, 0], y: [0, 6, -4, 5, -3, 2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/95"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0.15, 0] }}
              transition={{ duration: 0.5, times: [0, 0.15, 0.5, 1] }}
              className="absolute inset-0 bg-softball-red-600"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: [0, 4], opacity: [0.8, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-40 h-40 rounded-full border-[6px] border-softball-red-600"
            />
            <motion.div
              initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
              animate={{ scale: [0.2, 1.5, 0.95, 1.05, 1, 1], rotate: [-25, 12, -8, 5, -6, -6], opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
              transition={{ duration: 0.55, ease: [0.16, 1.4, 0.3, 1] }}
              className="text-center relative"
            >
              <div
                className="font-display font-black text-softball-red-600 leading-none tracking-tight"
                style={{
                  fontSize: 'clamp(140px, 42vw, 380px)',
                  textShadow: '6px 6px 0 rgba(10,15,92,0.25), -2px -2px 0 rgba(255,251,243,0.6)',
                  WebkitTextStroke: '2.5px var(--color-softball-red-700)',
                }}
              >
                HBP!
              </div>
              <motion.div
                initial={{ scale: 0, rotate: 25 }}
                animate={{ scale: [0, 1.2, 1], rotate: 12 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="absolute -top-4 -right-2 sm:-right-12 bg-softball-red-600 text-white font-display font-black text-xl sm:text-3xl px-3 py-1 rounded-md tracking-wider rotate-12 shadow-lg border-2 border-cream-50"
              >
                AUTSCH!
              </motion.div>
              <div className="font-display mt-2 text-base sm:text-xl font-extrabold text-navy-900 uppercase tracking-widest">
                Hit by Pitch
              </div>
              <div className="font-display mt-1 text-xl sm:text-2xl font-extrabold text-navy-900 uppercase tracking-widest">
                {hbpFlash} <span className="text-softball-red-700">→ 1B</span>
              </div>
              <div className="font-display mt-2 text-sm sm:text-base font-bold text-softball-red-700 italic tracking-wide">
                Einen fürs Team mitgenommen
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Walk Flash */}
      <AnimatePresence>
        {walkFlash && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="relative bg-navy-900 text-white pl-3 pr-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/15 overflow-hidden">
              <motion.span
                className="font-display font-black text-3xl text-cream-50 leading-none relative"
                style={{ WebkitTextStroke: '1px var(--color-softball-red-500)' }}
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.15, 1, 1.05, 1] }}
                transition={{ duration: 0.9, times: [0, 0.2, 0.45, 0.7, 1], ease: 'easeOut' }}
              >
                BB
              </motion.span>
              <div className="relative">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60">Base on Balls</div>
                <div className="font-display text-base font-bold tracking-wider uppercase">{walkFlash.batter}</div>
              </div>
              {walkFlash.runsScored > 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: 30, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], rotate: 12, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.4, ease: 'backOut' }}
                  className="bg-softball-red-600 text-white font-display font-black text-sm px-2 py-1 rounded-md tracking-wider shadow-lg border border-cream-50/30 relative"
                >
                  +{walkFlash.runsScored} {walkFlash.runsScored === 1 ? 'RUN' : 'RUNS'}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strikeout Flash */}
      <AnimatePresence>
        {strikeoutFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-cream-50/90"
          >
            <motion.div
              initial={{ scale: 0.3, rotate: 20, opacity: 0 }}
              animate={{ scale: [0.3, 1.3, 1, 1, 1], rotate: [20, -15, -12, -12, -12], x: [0, -8, 6, -4, 0], opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0, rotate: -30 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center relative"
            >
              <div
                className="font-display font-black text-softball-red-600 leading-none"
                style={{
                  fontSize: 'clamp(180px, 50vw, 440px)',
                  textShadow: '5px 5px 0 rgba(10,15,92,0.2)',
                  WebkitTextStroke: '3px var(--color-softball-red-700)',
                }}
              >
                K!
              </div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400" preserveAspectRatio="none">
                <motion.path
                  d="M 30 350 Q 200 50 380 320"
                  fill="none" stroke="var(--color-softball-red-700)" strokeWidth="6" strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
                />
              </svg>
              <div className="font-display mt-2 text-xl sm:text-2xl font-extrabold text-navy-900 uppercase tracking-widest">
                {strikeoutFlash} · Strikeout
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scored/Hit Flash pill */}
      <AnimatePresence>
        {scoredFlash && (scoredFlash.runners.length > 0 || scoredFlash.hitLabel) && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.45, type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="bg-cream-50 border-2 border-softball-red-600 text-navy-900 px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3">
              {scoredFlash.runners.length > 0 ? (
                <span
                  className="font-display font-black text-4xl text-softball-red-600 leading-none"
                  style={{ WebkitTextStroke: '0.5px var(--color-softball-red-700)' }}
                >
                  +{scoredFlash.runners.length}
                </span>
              ) : (
                <span
                  className="font-display font-black text-3xl text-softball-red-600 leading-none"
                  style={{ WebkitTextStroke: '0.5px var(--color-softball-red-700)' }}
                >
                  {scoredFlash.hitLabel === 'Single' ? '1B' : scoredFlash.hitLabel === 'Double' ? '2B' : '3B'}
                </span>
              )}
              <div className="text-left">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-500">
                  {scoredFlash.runners.length > 0
                    ? (scoredFlash.runners.length === 1 ? 'Run' : 'Runs')
                    : scoredFlash.hitLabel}
                </div>
                <div className="font-display text-base font-bold tracking-wider uppercase truncate max-w-[200px]">
                  {scoredFlash.runners.join(' · ')}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Runner-Advance-Flash */}
      <AnimatePresence>
        {advanceFlash && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-44 left-1/2 -translate-x-1/2 z-50 bg-cream-50 border-2 border-emerald-400 px-4 py-2 rounded-xl shadow-xl pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div className="font-display text-xs font-bold tracking-widest uppercase text-emerald-700 mb-0.5">
              Läufer vorgerückt
            </div>
            <div className="text-sm text-navy-900 font-semibold">
              {advanceFlash.runners.map((r, i) => `${r} → ${advanceFlash.targets[i]}`).join(' · ')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cheatsheet drawer */}
      <CheatsheetDrawer open={showCheatsheet} onClose={() => setShowCheatsheet(false)} />

      {/* Hit-Adjust-Sheet — Tap-Cycle nach SINGLE/DOUBLE/TRIPLE mit Runnern */}
      {showHitAdjust && lastSideAtBat && (
        <HitAdjustSheet
          open={true}
          onClose={() => setShowHitAdjust(null)}
          baseStateAfter={lastSideAtBat.baseStateAfter ?? { firstSlotId: null, secondSlotId: null, thirdSlotId: null }}
          baseStateBefore={showHitAdjust.baseStateBefore}
          initialRunsScored={lastSideAtBat.runsScored}
          hitResult={showHitAdjust.result}
          isError={showHitAdjust.isError}
          outsBefore={outs}
          slots={slots}
          onConfirm={async ({ outsFromRunners, runnerAdvances, ...payload }) => {
            setUndoAnimSkip(true)
            try {
              await correctLastAtBat(currentSide, { ...payload, runnerAdvances })
              // Runner-Outs als OUT_ON_PLAY-Events recorden für PDF-Notation
              for (const out of outsFromRunners) {
                await handleRecordStealing({
                  side: currentSide,
                  slotId: out.slotId,
                  inning: meta.currentInning,
                  type: 'OUT_ON_PLAY',
                  fromBase: out.fromBase,
                  toBase: (out.fromBase + 1) as 2 | 3 | 4,
                })
              }
              if (outsFromRunners.length > 0) {
                toast.show(`${outsFromRunners.length} Runner-Out auf Hit erfasst`, 'success')
              }
            } catch (e) {
              toast.show((e as Error).message, 'error')
            } finally {
              setTimeout(() => setUndoAnimSkip(false), 500)
            }
          }}
        />
      )}

      {/* Quick-Stealing Sheet — Tap-on-Runner-Pattern (vom Old Scoring portiert).
          Schneller als StealingDrawer-via-MEHR-Pill für Live-Tempo. */}
      <ResponsiveSheet
        open={quickStealingRunner !== null}
        onClose={() => setQuickStealingRunner(null)}
        title="Base Running"
      >
        {quickStealingRunner && (
          <div className="px-4 pt-2 pb-6 space-y-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <h3 className="text-base font-bold text-gray-900 text-center">
              {quickStealingRunner.name} auf {quickStealingRunner.base}B
            </h3>
            <p className="text-xs text-gray-500 text-center">
              Was ist zwischen den Pitches passiert?
            </p>
            <button
              onClick={async () => {
                const r = quickStealingRunner
                setQuickStealingRunner(null)
                try {
                  await handleRecordStealing({
                    side: currentSide,
                    slotId: r.slotId,
                    inning: meta.currentInning,
                    type: 'STOLEN_BASE',
                    fromBase: r.base,
                    toBase: (r.base + 1) as 2 | 3 | 4,
                  })
                  toast.show(`${r.name} stiehlt Base`, 'success')
                } catch (e) {
                  toast.show(`Stolen Base fehlgeschlagen: ${(e as Error).message}`, 'error')
                }
              }}
              className="font-display w-full h-16 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-base tracking-widest uppercase cursor-pointer flex flex-col items-center justify-center gap-0.5"
            >
              <span>✓ Stolen Base</span>
              <span className="font-body text-[10px] font-normal opacity-90 tracking-normal normal-case">
                Läuft zur nächsten Base
              </span>
            </button>
            <button
              onClick={async () => {
                const r = quickStealingRunner
                setQuickStealingRunner(null)
                try {
                  await handleRecordStealing({
                    side: currentSide,
                    slotId: r.slotId,
                    inning: meta.currentInning,
                    type: 'CAUGHT_STEALING',
                    fromBase: r.base,
                    toBase: (r.base + 1) as 2 | 3 | 4,
                  })
                  toast.show(`${r.name} caught stealing — Out`, 'success')
                } catch (e) {
                  toast.show(`Caught Stealing fehlgeschlagen: ${(e as Error).message}`, 'error')
                }
              }}
              className="font-display w-full h-16 rounded-xl bg-softball-red-600 hover:bg-softball-red-700 active:bg-softball-red-800 text-white font-extrabold text-base tracking-widest uppercase cursor-pointer flex flex-col items-center justify-center gap-0.5"
            >
              <span>✕ Caught Stealing</span>
              <span className="font-body text-[10px] font-normal opacity-90 tracking-normal normal-case">
                Beim Klauen gefangen · +1 Out
              </span>
            </button>
            <button
              onClick={() => setQuickStealingRunner(null)}
              className="w-full h-11 rounded-xl border border-cream-300 text-gray-600 font-medium cursor-pointer hover:bg-cream-100"
            >
              Abbrechen
            </button>
          </div>
        )}
      </ResponsiveSheet>

      {/* Uhr-Start-/Optionen-Sheet: geteilt mit der Legacy-ScoringPage (GameClockStartSheet) */}
      <GameClockStartSheet
        open={showClockStartSheet}
        onClose={() => setShowClockStartSheet(false)}
        onStart={handleStartClock}
        onReset={handleResetClock}
        hasStarted={clock.started}
        durationEstimate={clock.durationEstimate}
      />
    </div>
  )
}
