import { useState } from 'react'
import { SquarePen } from 'lucide-react'
import type { SpielbogenAtBatResponse, SpielbogenSlotResponse } from '@/types'
import { renderCells, cellKey } from '@/utils/bogenSheetRenderer'

interface Props {
  lastAtBat: SpielbogenAtBatResponse | null
  slots: SpielbogenSlotResponse[]
  onUndo: () => Promise<void>
  onCorrect?: () => void
  submitting?: boolean
  disabled?: boolean
}

const KLARTEXT: Record<string, string> = {
  '1B': 'Single',
  '2B': 'Double',
  '3B': 'Triple',
  'HR': 'Homerun!',
  'BB': 'Walk (Base on Balls)',
  'HP': 'Hit by Pitch (getroffen)',
  'K': 'Strikeout',
  'OUT': 'Out (kein Detail)',
  'F7': 'Fly Out, LF',
  'F8': 'Fly Out, CF',
  'F9': 'Fly Out, RF',
  'FOUL': 'Foul Out',
}

const POS_NAMES: Record<string, string> = {
  '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', '6': 'SS',
  '7': 'LF', '8': 'CF', '9': 'RF',
}

function klartext(label: string): string {
  if (!label) return ''
  // Exact match
  if (KLARTEXT[label]) return KLARTEXT[label]
  // Fly Out patterns: F1–F9
  if (/^F[1-9]$/.test(label)) {
    const pos = label[1]
    return `Fly Out, gefangen von ${POS_NAMES[pos] ?? `Pos ${pos}`}`
  }
  // Error patterns: E3, E6 etc.
  if (/^E[1-9]$/.test(label)) return `Error bei Position ${label.slice(1)}`
  // Triple play
  if (label.endsWith(' TP')) return `Triple Play (${label.replace(' TP', '')})`
  // Double play
  if (label.endsWith(' DP')) return `Double Play (${label.replace(' DP', '')})`
  // Grounder patterns like "6-3" or "6-4-3 DP"
  if (/^\d[-\d]/.test(label)) {
    const [from] = label.split('-')
    const fromName = POS_NAMES[from] ?? `Pos ${from}`
    return `Grounder von ${fromName}`
  }
  // Fallback: show notation as-is
  return label
}

export function LastAtBatPreview({ lastAtBat, slots, onUndo, onCorrect, submitting, disabled }: Props) {
  const [undoing, setUndoing] = useState(false)
  // Undo bleibt dauerhaft sichtbar solange lastAtBat existiert (kein Auto-Hide-Timeout)
  const undoVisible = lastAtBat != null

  if (!lastAtBat) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-cream-100 border-t border-cream-200 min-h-[44px]">
        <p className="text-xs text-gray-500 font-body italic">
          Noch keine AB. Tippe <span className="font-display font-bold text-navy-800 not-italic">TREFFER</span>, <span className="font-display font-bold text-softball-red-600 not-italic">STRIKEOUT</span> oder <span className="font-display font-bold text-gray-700 not-italic">AUS</span> für ersten Spielzug.
        </p>
      </div>
    )
  }

  const slot = slots.find(s => s.id === lastAtBat.slotId)
  const cellMap = renderCells([lastAtBat], [], [])
  const key = cellKey(lastAtBat.side, lastAtBat.slotId, lastAtBat.inning)
  const cell = cellMap.get(key)
  const label = cell?.primaryLabel ?? '?'
  const description = klartext(label)

  const handleUndo = async () => {
    setUndoing(true)
    try {
      await onUndo()
    } finally {
      setUndoing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-cream-100 border-t border-cream-200 min-h-[44px]">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 font-body truncate">
          <span className="font-bold text-navy-800">
            {slot ? `#${slot.battingOrder} ${slot.name}` : `Slot ${lastAtBat.slotId}`}
          </span>
          {' · '}
          <span className="font-display font-bold text-navy-700 uppercase tracking-wide">{label}</span>
          {' — '}
          <span>{description}</span>
        </p>
      </div>
      {undoVisible && (
        <button
          onClick={handleUndo}
          disabled={undoing || submitting || disabled}
          className="shrink-0 font-display text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-navy-700 text-navy-700 hover:bg-navy-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {undoing ? '…' : 'Undo'}
        </button>
      )}
      {lastAtBat && onCorrect && (
        <button
          onClick={onCorrect}
          disabled={submitting}
          title="Korrektur"
          className="shrink-0 p-1.5 rounded-full border border-cream-300 text-gray-500 hover:bg-cream-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <SquarePen size={14} />
        </button>
      )}
    </div>
  )
}
