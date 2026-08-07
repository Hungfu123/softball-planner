import { useState } from 'react'
import type { BogenSide, SpielbogenSlotResponse } from '@/types'
import { ChevronDown, ChevronRight, Pencil } from '@/icons'

export interface BogenLineupAccordionProps {
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeTeamName: string
  awayTeamName: string
  /** Fehlt der Handler, wird kein Stift gerendert — so läuft derselbe Block öffentlich. */
  onEditSlot?: (slot: SpielbogenSlotResponse) => void
}

/** Kollabierter Block unter dem Live-Feed. HEIM/GAST-Umschalter hält beide Listen im State. */
export function BogenLineupAccordion({
  homeLineup, awayLineup, homeTeamName, awayTeamName, onEditSlot,
}: BogenLineupAccordionProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeSide, setActiveSide] = useState<BogenSide>('HOME')

  const slots = activeSide === 'HOME' ? homeLineup : awayLineup

  return (
    <div className="border-b border-cream-300">
      <div className="flex items-center gap-2 px-5 py-2">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-2 font-display text-xs uppercase tracking-widest text-navy-700 cursor-pointer"
        >
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          Aufstellung
        </button>
        <div className="flex gap-1">
          {(['HOME', 'AWAY'] as BogenSide[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSide(s)}
              title={s === 'HOME' ? homeTeamName : awayTeamName}
              className={`font-display px-4 py-1 text-xs font-bold tracking-widest rounded-full uppercase transition-colors cursor-pointer
                ${activeSide === s
                  ? 'bg-navy-800 text-white'
                  : 'bg-white border border-cream-300 text-navy-600 hover:bg-cream-100'
                }`}
            >
              {s === 'HOME' ? 'Heim' : 'Gast'}
            </button>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-cream-200 bg-white">
          {slots.map(slot => (
            <div
              key={slot.id}
              className="flex items-center gap-2.5 px-5 py-1.5 text-sm border-b border-cream-100"
            >
              <span className="font-display text-xs text-navy-600 w-4 shrink-0">{slot.battingOrder}</span>
              <span className="flex-1 text-navy-900">{slot.name}</span>
              <span className="font-display text-xs tracking-wide text-gray-500 w-8 text-right shrink-0">
                {slot.position ?? '–'}
              </span>
              {onEditSlot && (
                <button
                  type="button"
                  onClick={() => onEditSlot(slot)}
                  aria-label={`${slot.name} bearbeiten`}
                  className="shrink-0 text-gray-400 hover:text-navy-700 cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
