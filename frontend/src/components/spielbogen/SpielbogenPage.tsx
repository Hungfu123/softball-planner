import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSpielbogenScoring } from '@/hooks/useSpielbogenScoring'
import { useToastContext } from '@/components/layout/Layout'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { BogenScoreboard } from './BogenScoreboard'
import { BogenSideToggle } from './BogenSideToggle'
import { BogenDiamondView } from './BogenDiamondView'
import { BogenActionButtons } from './BogenActionButtons'
import { LastAtBatPreview } from './LastAtBatPreview'
import { RflSheetDrawer } from './RflSheetDrawer'
import * as api from '@/api/client'
import type { SpielbogenRecordAtBatRequest, BogenSide, SpielbogenSlotResponse } from '@/types'

/** Compute outs from at-bats for the current inning + side. */
function computeOuts(
  atBats: import('@/types').SpielbogenAtBatResponse[],
  inning: number,
  side: BogenSide
): number {
  return atBats.filter(ab =>
    ab.inning === inning &&
    ab.side === side &&
    ab.result === 'OUT'
  ).length
}

/** Find the next batter slot (round-robin by battingOrder). */
function resolveCurrentSlot(
  slots: SpielbogenSlotResponse[],
  atBats: import('@/types').SpielbogenAtBatResponse[],
  inning: number,
  side: BogenSide
): SpielbogenSlotResponse | null {
  if (slots.length === 0) return null
  const sorted = [...slots].sort((a, b) => a.battingOrder - b.battingOrder)
  // Find the last at-bat for this inning+side
  const sideAtBats = atBats.filter(ab => ab.side === side && ab.inning === inning)
  if (sideAtBats.length === 0) {
    // Check previous innings to find where we left off in the rotation
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

export default function SpielbogenPage() {
  const { id: idParam } = useParams()
  const bogenId = idParam ? Number(idParam) : null
  const toast = useToastContext()

  const { sheet, loading, error, reload, recordAtBat, recordSubstitution, undoLast, switchSide } =
    useSpielbogenScoring(bogenId)

  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showSheet, setShowSheet] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [subSlotId, setSubSlotId] = useState<number | null>(null)
  const [subPlayerInName, setSubPlayerInName] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const outs = computeOuts(atBats, meta.currentInning, currentSide)

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

  const handleRecord = async (req: SpielbogenRecordAtBatRequest) => {
    try {
      await recordAtBat(req)
      // After 3 outs, toast a nudge to switch sides
      const newOuts = outs + (req.result === 'OUT' ? 1 : 0)
      if (newOuts >= 3) {
        toast.show('3 Outs — andere Mannschaft dran? Side wechseln!')
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

  return (
    <div className="flex flex-col min-h-screen bg-cream-50">
      {/* Nav header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-cream-100 border-b border-cream-300">
        <Link to="/spielbogen" className="text-navy-700 hover:text-navy-900 text-sm font-body">
          ← Spielbogen
        </Link>
        {isDone && (
          <span className="ml-auto font-display text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            Beendet
          </span>
        )}
        {isLive && (
          <span className="ml-auto font-display text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Live
          </span>
        )}
      </div>

      {/* Scoreboard */}
      <BogenScoreboard
        meta={meta}
        outs={outs}
        currentSlotName={currentSlot?.name ?? null}
        currentSlotPosition={currentSlot?.position ?? null}
        currentBattingOrder={currentSlot?.battingOrder ?? null}
      />

      {/* Side toggle */}
      <BogenSideToggle
        currentSide={currentSide}
        outs={outs}
        onSwitchSide={handleSideToggleClick}
        disabled={submitting || isDone}
      />

      {/* Diamond */}
      <BogenDiamondView
        baseState={baseStateAfter}
        slots={slots}
      />

      {/* Action buttons (only for LIVE) */}
      {isLive && (
        <BogenActionButtons
          side={currentSide}
          currentSlotId={currentSlot?.id ?? null}
          inning={meta.currentInning}
          baseStateAfter={baseStateAfter}
          disabled={submitting}
          onRecord={handleRecord}
          onSwitchSide={handleSideToggleClick}
          onSubstitution={() => {
            setSubSlotId(currentSlot?.id ?? null)
            setShowSubModal(true)
          }}
          onEndGame={() => setShowEndConfirm(true)}
          canEndGame={isLive}
        />
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
                  #{s.battingOrder} {s.name} ({s.position ?? '—'})
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
    </div>
  )
}
