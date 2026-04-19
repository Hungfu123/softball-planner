import { useState, useMemo } from 'react'
import type { TrainingFocus, GeneratePlanRequest, TrainingResponse } from '@/types'

const FOCUS_OPTIONS: { value: TrainingFocus; label: string }[] = [
  { value: 'WERFEN', label: 'Werfen' },
  { value: 'INFIELD_DEFENSE', label: 'Infield Defense' },
  { value: 'OUTFIELD', label: 'Outfield' },
  { value: 'BASERUNNING', label: 'Baserunning' },
  { value: 'SITUATIONAL', label: 'Situational' },
  { value: 'CATCHER', label: 'Catcher' },
  { value: 'RELAY', label: 'Relay & Cutoff' },
  { value: 'ALLROUND', label: 'Allround' },
]

const DURATION_OPTIONS = [60, 90, 120, 180]

// Do=3h, Sa/Mo=2h, Rest=90min
function getDefaultDuration(dateStr?: string): number {
  if (!dateStr) return 90
  const day = new Date(dateStr + 'T00:00:00').getDay() // 0=So, 1=Mo, ..., 4=Do, 6=Sa
  if (day === 4) return 180  // Donnerstag
  if (day === 6 || day === 1) return 120  // Samstag oder Montag
  return 90
}

interface Props {
  trainingId: number
  training?: TrainingResponse
  generating: boolean
  onGenerate: (data: GeneratePlanRequest) => void
  onCancel: () => void
}

export default function PlanForm({ trainingId, training, generating, onGenerate, onCancel }: Props) {
  const defaultDuration = useMemo(() => getDefaultDuration(training?.date), [training?.date])
  const [playerCount, setPlayerCount] = useState(10)
  const [focuses, setFocuses] = useState<Set<TrainingFocus>>(new Set(['ALLROUND']))
  const [duration, setDuration] = useState(defaultDuration)

  const toggleFocus = (f: TrainingFocus) => {
    setFocuses(prev => {
      const next = new Set(prev)
      if (f === 'ALLROUND') {
        // Allround toggled → deselect all others or select only Allround
        return new Set(['ALLROUND'])
      }
      next.delete('ALLROUND') // specific focus deselects Allround
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next.size === 0 ? new Set<TrainingFocus>(['ALLROUND']) : next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate({
      trainingId,
      playerCount,
      focus: [...focuses].join(','),
      durationMinutes: duration,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <h3 className="text-lg font-bold text-gray-900">Plan generieren</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Spieleranzahl</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlayerCount(p => Math.max(2, p - 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50 cursor-pointer"
          >−</button>
          <span className="w-10 text-center text-sm font-bold text-gray-900">{playerCount}</span>
          <button
            type="button"
            onClick={() => setPlayerCount(p => Math.min(20, p + 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50 cursor-pointer"
          >+</button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Schwerpunkte</label>
        <p className="text-xs text-gray-400 mb-2">Mehrere auswählbar. "Allround" wählt alles.</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleFocus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                focuses.has(opt.value)
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dauer</label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                duration === d
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={generating}
          className="px-6 py-2.5 bg-navy-800 text-white rounded-lg font-medium text-sm hover:bg-navy-700 disabled:opacity-40 disabled:cursor-default transition-colors cursor-pointer"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Plan wird erstellt…
            </span>
          ) : 'Plan generieren'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-gray-600 text-sm hover:text-gray-900 cursor-pointer"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
