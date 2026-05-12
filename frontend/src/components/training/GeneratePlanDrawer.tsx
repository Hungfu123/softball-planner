import { useState, useEffect, useMemo } from 'react'
import { Drawer } from 'vaul'
import { Sparkles } from 'lucide-react'
import type { TrainingFocus, InfieldPosition } from '@/types'
import { INFIELD_POSITION_LABELS } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  defaultPlayerCount: number
  trainingDate?: string | null
  onGenerate: (data: { playerCount: number; focus: string; durationMinutes: number; infieldPositions?: InfieldPosition[] }) => Promise<void>
}

const FOCUS_OPTIONS: { value: TrainingFocus; label: string }[] = [
  { value: 'ALLROUND', label: 'Allround' },
  { value: 'WERFEN', label: 'Werfen' },
  { value: 'INFIELD_DEFENSE', label: 'Infield Defense' },
  { value: 'OUTFIELD', label: 'Outfield' },
  { value: 'BASERUNNING', label: 'Baserunning' },
  { value: 'SITUATIONAL', label: 'Situational' },
  { value: 'CATCHER', label: 'Catcher' },
  { value: 'RELAY', label: 'Relay & Cutoff' },
]

const DURATION_PRESETS = [60, 90, 120, 180]

function defaultDurationFor(dateStr?: string | null): number {
  if (!dateStr) return 120
  const day = new Date(dateStr + 'T00:00:00').getDay()
  if (day === 4) return 180  // Do
  if (day === 6 || day === 1) return 120  // Sa/Mo
  return 90
}

export function GeneratePlanDrawer({ open, onClose, defaultPlayerCount, trainingDate, onGenerate }: Props) {
  const initialDuration = useMemo(() => defaultDurationFor(trainingDate), [trainingDate])
  const [playerCount, setPlayerCount] = useState(defaultPlayerCount || 10)
  const [focuses, setFocuses] = useState<Set<TrainingFocus>>(new Set(['ALLROUND']))
  const [infieldPositions, setInfieldPositions] = useState<Set<InfieldPosition>>(new Set())
  const [durationMinutes, setDurationMinutes] = useState(initialDuration)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPlayerCount(defaultPlayerCount || 10)
      setFocuses(new Set(['ALLROUND']))
      setInfieldPositions(new Set())
      setDurationMinutes(initialDuration)
    }
  }, [open, defaultPlayerCount, initialDuration])

  const toggleFocus = (f: TrainingFocus) => {
    setFocuses(prev => {
      if (f === 'ALLROUND') return new Set<TrainingFocus>(['ALLROUND'])
      const next = new Set(prev)
      next.delete('ALLROUND')
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next.size === 0 ? new Set<TrainingFocus>(['ALLROUND']) : next
    })
  }

  const toggleInfield = (pos: InfieldPosition) => {
    setInfieldPositions(prev => {
      const next = new Set(prev)
      if (next.has(pos)) next.delete(pos)
      else next.add(pos)
      return next
    })
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const data: { playerCount: number; focus: string; durationMinutes: number; infieldPositions?: InfieldPosition[] } = {
        playerCount,
        focus: [...focuses].join(','),
        durationMinutes,
      }
      if (focuses.has('INFIELD_DEFENSE') && infieldPositions.size > 0) {
        data.infieldPositions = [...infieldPositions]
      }
      await onGenerate(data)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[88vh] flex flex-col focus:outline-none">
          <Drawer.Title className="sr-only">Plan neu generieren</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />

          <div className="px-4 py-4 max-w-md mx-auto w-full overflow-y-auto flex-1 min-h-0 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-softball-red-600" size={22} />
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
                Plan neu generieren
              </h2>
            </div>
            <p className="text-xs text-navy-600">Bestehender Plan wird ersetzt.</p>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Spieler</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlayerCount(p => Math.max(2, p - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
                >−</button>
                <span className="w-12 text-center text-base font-bold text-navy-900 tabular-nums">{playerCount}</span>
                <button
                  type="button"
                  onClick={() => setPlayerCount(p => Math.min(30, p + 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
                >+</button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Schwerpunkte</label>
              <p className="text-[10px] text-navy-500 mb-2">Mehrere wählbar. Allround = alles.</p>
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleFocus(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      focuses.has(opt.value)
                        ? 'bg-navy-800 text-white border-navy-800'
                        : 'bg-white text-navy-700 border-cream-300 hover:border-navy-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {focuses.has('INFIELD_DEFENSE') && (
                <div className="mt-2 ml-2 pl-3 border-l-2 border-cream-300">
                  <p className="text-[10px] text-navy-500 mb-2">Infield-Positionen (optional, leer = alle):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(INFIELD_POSITION_LABELS) as InfieldPosition[]).map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => toggleInfield(pos)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border cursor-pointer ${
                          infieldPositions.has(pos)
                            ? 'bg-navy-800 text-white border-navy-800'
                            : 'bg-white text-navy-700 border-cream-300 hover:border-navy-300'
                        }`}
                      >
                        {INFIELD_POSITION_LABELS[pos]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Dauer</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DURATION_PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDurationMinutes(p)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer tabular-nums border ${
                      durationMinutes === p
                        ? 'bg-navy-800 text-white border-navy-800'
                        : 'bg-white text-navy-700 border-cream-300 hover:border-navy-300'
                    }`}
                  >
                    {p} min
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={durationMinutes}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  setDurationMinutes(v === '' ? 0 : Number(v))
                }}
                className="w-full px-3 py-2 border border-cream-300 rounded-md text-sm text-navy-900 bg-white focus:border-navy-400 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div
            className="px-4 py-3 max-w-md mx-auto w-full border-t border-cream-300 bg-cream-50 shrink-0 grid grid-cols-2 gap-2"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={onClose}
              disabled={submitting}
              className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={submit}
              disabled={submitting || playerCount < 1 || durationMinutes < 30}
              className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? 'Generiere…' : (<><Sparkles size={16} /> Generieren</>)}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
