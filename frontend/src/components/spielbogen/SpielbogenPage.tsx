import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Flag, RotateCcw } from 'lucide-react'
import { useSpielbogenScoring } from '@/hooks/useSpielbogenScoring'
import { useToastContext } from '@/components/layout/Layout'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { ChevronLeft } from '@/icons'
import { BogenSideToggle } from './BogenSideToggle'
import { BogenDiamondView } from './BogenDiamondView'
import { BogenActionButtons } from './BogenActionButtons'
import { BatterCard } from './BatterCard'
import { LastAtBatPreview } from './LastAtBatPreview'
import { RflSheetDrawer } from './RflSheetDrawer'
import { generateSpielbogenPdf } from '@/utils/spielbogenPdfExport'
import * as api from '@/api/client'
import type {
  SpielbogenRecordAtBatRequest,
  BogenSide,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  BogenBaseStateDto,
} from '@/types'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
function romanInning(n: number): string { return ROMAN[n] ?? String(n) }

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
 *  STRIKEOUT = 1 out, OUT = 1 out (DOUBLE_PLAY = 2, TRIPLE_PLAY = 3).
 *  Errors (isError=true) do NOT count as outs.
 *  CAUGHT_STEALING / OUT_ON_PLAY stealing events count as 1 out each.
 */
function computeOuts(
  atBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[],
  inning: number,
  side: BogenSide
): number {
  const atBatOuts = atBats
    .filter(ab => ab.inning === inning && ab.side === side && !ab.isError)
    .reduce((sum, ab) => {
      if (ab.result === 'STRIKEOUT') return sum + 1
      if (ab.result === 'OUT') {
        if (ab.outType === 'DOUBLE_PLAY') return sum + 2
        if (ab.outType === 'TRIPLE_PLAY') return sum + 3
        return sum + 1
      }
      return sum
    }, 0)
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
    if (st.type === 'STOLEN_BASE') {
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

export default function SpielbogenPage() {
  const { id: idParam } = useParams()
  const bogenId = idParam ? Number(idParam) : null
  const toast = useToastContext()

  const { sheet, loading, error, reload, recordAtBat, recordStealing, recordSubstitution, undoLast, switchSide } =
    useSpielbogenScoring(bogenId)

  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showSheet, setShowSheet] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [subSlotId, setSubSlotId] = useState<number | null>(null)
  const [subPlayerInName, setSubPlayerInName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Inning-switch flash banner
  const [inningSwitchFlash, setInningSwitchFlash] = useState<{ newSide: BogenSide } | null>(null)

  // Flash animations (ported from ScoringPage)
  const [homerunFlash, setHomerunFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  const [homerunRunner, setHomerunRunner] = useState<{ slotId: number; name: string; battingOrder: number } | null>(null)
  const [hbpFlash, setHbpFlash] = useState<string | null>(null)
  const [walkFlash, setWalkFlash] = useState<{ batter: string; runsScored: number } | null>(null)
  const [strikeoutFlash, setStrikeoutFlash] = useState<string | null>(null)
  const [scoredFlash, setScoredFlash] = useState<{ runners: string[]; hitLabel: string | null } | null>(null)

  // Auto-open sheet drawer when game transitions to DONE
  const prevStatusRef = useRef<string | null>(null)
  useEffect(() => {
    if (sheet?.meta.status === 'DONE' && prevStatusRef.current === 'LIVE') {
      setShowSheet(true)
    }
    if (sheet?.meta.status) prevStatusRef.current = sheet.meta.status
  }, [sheet?.meta.status])

  if (loading && !sheet) return <LoadingSkeleton />

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

  const handleRecord = async (req: SpielbogenRecordAtBatRequest) => {
    // Capture batter name BEFORE reload changes it
    const batterName = currentSlot?.name ?? 'Batter'
    const batterOrder = currentSlot?.battingOrder ?? 0
    const batterSlotId = currentSlot?.id ?? 0

    try {
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
        } else if (req.result === 'STRIKEOUT') {
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
          const hitLabel = req.result === 'SINGLE' ? 'Single' : req.result === 'DOUBLE' ? 'Double' : req.result === 'TRIPLE' ? 'Triple' : null
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
            setScoredFlash({
              runners: scoredNames.length > 0 ? scoredNames : (runsScored > 0 ? [`${runsScored} Run${runsScored > 1 ? 's' : ''}`] : []),
              hitLabel: isHit && hadRunners && scoredNames.length === 0 ? hitLabel : null,
            })
            setTimeout(() => setScoredFlash(null), 2200)
          }
        }
      }

      // Auto-switch after 3 outs
      let increment = 0
      if (req.result === 'STRIKEOUT') {
        increment = 1
      } else if (req.result === 'OUT' && !req.isError) {
        if (req.outType === 'DOUBLE_PLAY') increment = 2
        else if (req.outType === 'TRIPLE_PLAY') increment = 3
        else increment = 1
      }
      const projectedOuts = outs + increment
      if (projectedOuts >= 3) {
        try {
          await switchSide()
          const newSide = currentSide === 'HOME' ? 'AWAY' : 'HOME'
          setInningSwitchFlash({ newSide })
          setTimeout(() => setInningSwitchFlash(null), 2500)
        } catch {
          // Backend rejected; ignore silently
        }
      }
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
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

  const isDone = meta.status === 'DONE'
  const isLive = meta.status === 'LIVE'

  const upcomingSlots = computeUpcomingSlots(slots, currentSlot)

  return (
    <div className="flex flex-col min-h-screen bg-cream-50">
      {/* Inning-switch flash banner */}
      <AnimatePresence>
        {inningSwitchFlash && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-0 left-0 right-0 z-50 bg-navy-800 text-white py-3 text-center font-display text-base font-extrabold tracking-widest uppercase shadow-lg"
          >
            Inning-Wechsel · {inningSwitchFlash.newSide === 'HOME' ? 'HEIM' : 'GAST'} schlägt
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav header */}
      <header className="bg-navy-900 text-white sticky top-0 z-50 shadow-md border-b-[3px] border-softball-red-600">
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
          <Link to="/spielbogen" className="p-1 hover:bg-navy-700 rounded-lg" aria-label="Zurück">
            <ChevronLeft size={22} />
          </Link>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/deadsox.jpeg" alt="Dead Sox" className="w-7 h-7 rounded" />
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {isLive && (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={submitting}
                className="p-1.5 hover:bg-navy-700 rounded-lg text-white/80 hover:text-white text-sm font-medium disabled:opacity-30 cursor-pointer inline-flex items-center gap-1"
                title="Spiel beenden"
              >
                <Flag size={14} /> Beenden
              </button>
            )}
            {isDone && (
              <button
                onClick={handleReopenGame}
                disabled={submitting}
                className="p-1.5 hover:bg-navy-700 rounded-lg text-white/80 hover:text-white text-sm font-medium disabled:opacity-30 cursor-pointer inline-flex items-center gap-1"
                title="Spiel wieder öffnen"
              >
                <RotateCcw size={14} /> Reopen
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Live-State-Strip */}
      <div className="bg-navy-900 text-white px-4 py-2 flex items-center justify-between border-b-[3px] border-softball-red-600">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white/80">Inning</span>
          <span className="font-display text-2xl font-extrabold leading-none">{romanInning(meta.currentInning)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white/80">Outs</span>
          <span className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < outs ? 'bg-softball-red-500' : 'bg-white/20'}`} />
            ))}
          </span>
        </div>
      </div>

      {/* Score-Block */}
      <div className="px-4 py-3 bg-cream-50 flex items-center justify-center gap-3 border-b border-cream-300">
        <span className="font-display text-sm font-bold text-gray-500 uppercase tracking-widest">{meta.homeTeamName}</span>
        <span className="font-display text-3xl font-extrabold text-navy-800 tabular-nums">{meta.homeRuns}</span>
        <span className="text-gray-400 text-2xl">—</span>
        <span className="font-display text-3xl font-extrabold text-softball-red-600 tabular-nums">{meta.awayRuns}</span>
        <span className="font-display text-sm font-bold text-gray-500 uppercase tracking-widest">{meta.awayTeamName}</span>
      </div>

      {/* Side toggle */}
      <BogenSideToggle
        currentSide={currentSide}
        outs={outs}
        onSwitchSide={handleSideToggleClick}
        disabled={submitting || isDone}
      />

      {/* Diamond */}
      <BogenDiamondView
        baseState={displayBaseState}
        slots={slots}
        homerunRunner={homerunRunner}
      />

      {/* Batter card — cream bg, below diamond, above action buttons */}
      {isLive && (
        <BatterCard currentSlot={currentSlot} upcomingSlots={upcomingSlots} />
      )}

      {/* Action buttons (only for LIVE) */}
      {isLive && (
        <BogenActionButtons
          side={currentSide}
          currentSlotId={currentSlot?.id ?? null}
          inning={meta.currentInning}
          baseStateAfter={displayBaseState}
          slots={slots}
          disabled={submitting}
          onRecord={handleRecord}
          onRecordStealing={recordStealing}
          onSwitchSide={handleSideToggleClick}
          onSubstitution={() => {
            setSubSlotId(currentSlot?.id ?? null)
            setShowSubModal(true)
          }}
          onEndGame={() => setShowEndConfirm(true)}
          canEndGame={isLive}
        />
      )}

      {/* Game-End-Card (only for DONE) */}
      {!isLive && isDone && (
        <div className="mx-4 my-4 bg-cream-50 border border-cream-300 rounded-2xl p-6 space-y-4 text-center">
          <h2 className="font-display text-2xl font-extrabold tracking-wide uppercase text-navy-900">
            Spiel beendet
          </h2>
          <div className="font-display text-3xl font-extrabold text-navy-900">
            <span>{meta.homeTeamName}</span>
            <span className="text-softball-red-600 mx-2">{meta.homeRuns}</span>
            <span className="text-gray-400">:</span>
            <span className="text-softball-red-600 mx-2">{meta.awayRuns}</span>
            <span>{meta.awayTeamName}</span>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setShowSheet(true)}
              className="w-full font-display py-3 rounded-xl bg-navy-800 text-white font-extrabold tracking-widest uppercase hover:bg-navy-900 cursor-pointer"
            >
              📋 Spielbogen anzeigen
            </button>
            <button
              onClick={() => generateSpielbogenPdf(sheet)}
              className="w-full font-display py-3 rounded-xl bg-cream-100 border border-cream-300 text-navy-800 font-bold tracking-widest uppercase hover:bg-cream-200 cursor-pointer"
            >
              📄 Als PDF exportieren
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
      )}

      {/* Last at-bat + Undo */}
      <LastAtBatPreview
        lastAtBat={lastAtBat}
        slots={[...homeLineup, ...awayLineup]}
        onUndo={undoLast}
        submitting={submitting}
      />

      {/* FAB: Spielbogen */}
      <div className="fixed bottom-6 right-4 z-40">
        <button
          onClick={() => setShowSheet(true)}
          className="w-14 h-14 rounded-full bg-navy-800 text-white shadow-lg flex items-center justify-center text-xl hover:bg-navy-900 transition-colors cursor-pointer"
          aria-label="Spielbogen anzeigen"
        >
          📋
        </button>
      </div>

      {/* RFL Sheet Drawer */}
      {showSheet && (
        <RflSheetDrawer
          open={showSheet}
          onClose={() => setShowSheet(false)}
          sheet={sheet}
          onEndGame={isLive ? () => { setShowSheet(false); setShowEndConfirm(true) } : undefined}
          onReopenGame={isDone ? handleReopenGame : undefined}
          onReload={reload}
        />
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
                <div className="font-display mt-3 text-xl sm:text-3xl font-bold text-navy-900 uppercase tracking-widest">
                  {homerunFlash.batter}
                </div>
                <div className="font-display mt-1 text-sm sm:text-lg font-bold text-softball-red-700 uppercase tracking-widest">
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
              <div className="font-display mt-2 text-base sm:text-xl font-bold text-navy-900 uppercase tracking-widest">
                Hit by Pitch
              </div>
              <div className="font-display mt-1 text-xl sm:text-2xl font-bold text-navy-900 uppercase tracking-widest">
                {hbpFlash} <span className="text-softball-red-700">→ 1B</span>
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
              <div className="font-display mt-2 text-xl sm:text-2xl font-bold text-navy-900 uppercase tracking-widest">
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
                  {scoredFlash.runners.length > 0 ? scoredFlash.runners.join(' · ') : 'Runner anders?'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
