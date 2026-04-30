import { useEffect, useState } from 'react'
import type { SpielbogenAtBatResponse, BogenSide, SpielbogenSlotResponse } from '@/types'
import { renderCells, cellKey } from '@/utils/bogenSheetRenderer'

interface Props {
  lastAtBat: SpielbogenAtBatResponse | null
  slots: SpielbogenSlotResponse[]
  onUndo: (side: BogenSide) => Promise<void>
  submitting?: boolean
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

function klartext(label: string): string {
  if (KLARTEXT[label]) return KLARTEXT[label]
  // Grounder patterns like "6-3"
  if (/^\d-\d/.test(label)) {
    const [from] = label.split('-')
    const POS_NAMES: Record<string, string> = {
      '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', '6': 'SS',
      '7': 'LF', '8': 'CF', '9': 'RF',
    }
    const fromName = POS_NAMES[from] ?? `Pos ${from}`
    return `Grounder von ${fromName}`
  }
  // Error patterns: E3, E6 etc.
  if (/^E\d/.test(label)) return `Error bei Position ${label.slice(1)}`
  // Double play
  if (label.endsWith(' DP')) return `Double Play (${label.replace(' DP', '')})`
  return label
}

export function LastAtBatPreview({ lastAtBat, slots, onUndo, submitting }: Props) {
  const [undoVisible, setUndoVisible] = useState(false)
  const [undoing, setUndoing] = useState(false)

  const lastAtBatId = lastAtBat?.id
  useEffect(() => {
    if (lastAtBatId == null) { setUndoVisible(false); return }
    setUndoVisible(true)
    const t = setTimeout(() => setUndoVisible(false), 5000)
    return () => clearTimeout(t)
  }, [lastAtBatId])

  if (!lastAtBat) return null

  const slot = slots.find(s => s.id === lastAtBat.slotId)
  const cellMap = renderCells([lastAtBat], [])
  const key = cellKey(lastAtBat.side, lastAtBat.slotId, lastAtBat.inning)
  const cell = cellMap.get(key)
  const label = cell?.label ?? '?'
  const description = klartext(label)

  const handleUndo = async () => {
    setUndoing(true)
    try {
      await onUndo(lastAtBat.side)
      setUndoVisible(false)
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
          disabled={undoing || submitting}
          className="shrink-0 font-display text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-navy-700 text-navy-700 hover:bg-navy-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {undoing ? '…' : 'Undo'}
        </button>
      )}
    </div>
  )
}
