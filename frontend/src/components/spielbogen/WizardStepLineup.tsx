import { useEffect } from 'react'
import { SlotEditor } from './SlotEditor'
import { Button } from '@/components/shared'
import { CopyFromGameDayModal } from './CopyFromGameDayModal'
import type { SetLineupRequest, BogenSide } from '@/types'
import { useState } from 'react'

interface Props {
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
  onChange: (side: BogenSide, slots: SetLineupRequest['slots']) => void
}

const EMPTY_LINEUP = (): SetLineupRequest['slots'] =>
  Array.from({ length: 10 }, (_, i) => ({
    slot: i + 1,
    name: '',
    position: null,
    battingOrder: i + 1,
  }))

export function WizardStepLineup({ homeLineup, awayLineup, onChange }: Props) {
  const [activeSide, setActiveSide] = useState<BogenSide>('HOME')
  const [showCopy, setShowCopy] = useState(false)

  const slots = activeSide === 'HOME' ? homeLineup : awayLineup

  // Initialize lineup for the active side when empty — must be in useEffect, not render body,
  // to avoid calling parent setState during render (React warning + potential infinite loops).
  // onChange is intentionally omitted: it's a new ref each render from the parent wizard,
  // and we only want to re-initialize when activeSide changes.
  useEffect(() => {
    if (slots.length === 0) {
      onChange(activeSide, EMPTY_LINEUP())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSide])

  const fillEmptyPlaceholders = () => {
    const filled = slots.map(s => {
      if (s.name.trim() === '' && s.slot <= 9) {
        return { ...s, name: `Spieler ${s.slot}` }
      }
      return s
    })
    onChange(activeSide, filled)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSide('HOME')}
          className={`flex-1 font-display py-2 rounded-lg text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer ${
            activeSide === 'HOME' ? 'bg-navy-900 text-white' : 'bg-cream-100 text-gray-500 hover:bg-cream-200'
          }`}
        >
          Heim {homeLineup.filter(s => s.name.trim()).length >= 9 && <span className="text-emerald-300">✓</span>}
        </button>
        <button
          onClick={() => setActiveSide('AWAY')}
          className={`flex-1 font-display py-2 rounded-lg text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer ${
            activeSide === 'AWAY' ? 'bg-navy-900 text-white' : 'bg-cream-100 text-gray-500 hover:bg-cream-200'
          }`}
        >
          Gast {awayLineup.filter(s => s.name.trim()).length >= 9 && <span className="text-emerald-300">✓</span>}
        </button>
      </div>

      <div className="flex gap-2 text-xs flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={fillEmptyPlaceholders}
        >
          ▶ Schnell befüllen
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCopy(true)}
        >
          Aus Spieltag laden
        </Button>
      </div>

      <SlotEditor slots={slots} onChange={(s) => onChange(activeSide, s)} />

      <CopyFromGameDayModal
        open={showCopy}
        onClose={() => setShowCopy(false)}
        onCopy={(slots) => onChange(activeSide, slots)}
      />
    </div>
  )
}
