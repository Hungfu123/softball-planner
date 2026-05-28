import { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { TrainingFocus } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (data: { beginnerCount: number; beginnerFocus?: string }) => Promise<void>
}

const FOCUS_OPTIONS: { value: TrainingFocus; label: string }[] = [
  { value: 'WERFEN', label: 'Werfen' },
  { value: 'INFIELD_DEFENSE', label: 'Infield Defense' },
  { value: 'OUTFIELD', label: 'Outfield' },
  { value: 'BASERUNNING', label: 'Baserunning' },
  { value: 'SITUATIONAL', label: 'Situational' },
  { value: 'CATCHER', label: 'Catcher' },
  { value: 'RELAY', label: 'Relay & Cutoff' },
]

export function AddBeginnerGroupDrawer({ open, onClose, onSubmit }: Props) {
  const [beginnerCount, setBeginnerCount] = useState(2)
  const [beginnerFocus, setBeginnerFocus] = useState<TrainingFocus | ''>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setBeginnerCount(2)
      setBeginnerFocus('')
    }
  }, [open])

  const submit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        beginnerCount,
        beginnerFocus: beginnerFocus || undefined,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onClose}
        disabled={submitting}
        className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer disabled:opacity-50"
      >
        Abbrechen
      </button>
      <button
        onClick={submit}
        disabled={submitting || beginnerCount < 2}
        className="h-11 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
      >
        {submitting ? 'Füge hinzu…' : (<><UserPlus size={16} /> Anfänger hinzufügen</>)}
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Anfänger-Gruppe hinzufügen" maxWidth="md" footer={footer}>
      <div className="px-4 py-4 space-y-4">
        <p className="text-xs text-navy-600">
          Anfänger-Pool nutzt BASIC-Drills. Optional separater Focus.
        </p>

        <div>
          <label className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mb-1">
            Anfänger-Anzahl (min 2)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBeginnerCount(c => Math.max(2, c - 1))}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
            >−</button>
            <input
              type="number"
              min={2}
              value={beginnerCount}
              onChange={(e) => setBeginnerCount(Math.max(2, parseInt(e.target.value) || 2))}
              className="w-16 text-center px-2 py-2 border border-cream-300 rounded-md text-sm font-bold text-navy-900 bg-white focus:border-amber-400 focus:outline-none tabular-nums"
            />
            <button
              type="button"
              onClick={() => setBeginnerCount(c => Math.min(30, c + 1))}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
            >+</button>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mb-1">
            Focus Anfänger (optional)
          </label>
          <p className="text-[10px] text-navy-500 mb-2">
            Leer = gleicher Focus wie Hauptgruppe + nur BASIC-Drills.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBeginnerFocus(beginnerFocus === opt.value ? '' : opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border cursor-pointer ${
                  beginnerFocus === opt.value
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-navy-700 border-cream-300 hover:border-amber-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ResponsiveSheet>
  )
}
