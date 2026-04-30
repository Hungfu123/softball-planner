import { useState } from 'react'
import { SlotEditor } from './SlotEditor'
import { Button } from '@/components/shared'
import type { SetLineupRequest, BogenSide } from '@/types'

type Mode = 'manual' | 'fast'

interface Props {
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
  onChange: (side: BogenSide, slots: SetLineupRequest['slots']) => void
}

const FAST_DEFAULT = (): SetLineupRequest['slots'] =>
  Array.from({ length: 9 }, (_, i) => ({
    slot: i + 1,
    name: `Spieler ${i + 1}`,
    position: null,
    battingOrder: i + 1,
  }))

const EMPTY_LINEUP = (): SetLineupRequest['slots'] =>
  Array.from({ length: 10 }, (_, i) => ({
    slot: i + 1,
    name: '',
    position: null,
    battingOrder: i + 1,
  }))

export function WizardStepLineup({ homeLineup, awayLineup, onChange }: Props) {
  const [activeSide, setActiveSide] = useState<BogenSide>('HOME')
  const [mode, setMode] = useState<Record<BogenSide, Mode>>({ HOME: 'manual', AWAY: 'manual' })

  const slots = activeSide === 'HOME' ? homeLineup : awayLineup

  if (slots.length === 0) {
    const initial = mode[activeSide] === 'fast' ? FAST_DEFAULT() : EMPTY_LINEUP()
    onChange(activeSide, initial)
  }

  const setFastMode = () => {
    setMode(m => ({ ...m, [activeSide]: 'fast' }))
    onChange(activeSide, FAST_DEFAULT())
  }

  const setManualMode = () => {
    setMode(m => ({ ...m, [activeSide]: 'manual' }))
    onChange(activeSide, EMPTY_LINEUP())
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

      <div className="flex gap-2 text-xs">
        <Button
          variant={mode[activeSide] === 'manual' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={setManualMode}
        >
          Manuell
        </Button>
        <Button
          variant={mode[activeSide] === 'fast' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={setFastMode}
        >
          Schnell-Modus
        </Button>
      </div>

      <SlotEditor slots={slots} onChange={(s) => onChange(activeSide, s)} />
    </div>
  )
}

export function lineupIsValid(homeLineup: SetLineupRequest['slots'], awayLineup: SetLineupRequest['slots']): boolean {
  const filledHome = homeLineup.filter(s => s.name.trim()).length
  const filledAway = awayLineup.filter(s => s.name.trim()).length
  return filledHome >= 9 && filledAway >= 9
}
