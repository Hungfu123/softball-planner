import { useState, useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { TrainingFocus, InfieldPosition, PlanKind } from '@/types'
import { INFIELD_POSITION_LABELS } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  defaultPlayerCount: number
  trainingDate?: string | null
  initialKind?: PlanKind
  onGenerate: (data: { playerCount: number; focus: string; durationMinutes: number; infieldPositions?: InfieldPosition[]; withBeginnerGroup?: boolean; beginnerCount?: number; beginnerFocus?: string; kind?: PlanKind }) => Promise<void>
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

const DURATION_PRESETS = [60, 90, 120, 180]

function defaultDurationFor(dateStr?: string | null): number {
  if (!dateStr) return 120
  const day = new Date(dateStr + 'T00:00:00').getDay()
  if (day === 4) return 180
  if (day === 6 || day === 1) return 120
  return 90
}

export function GeneratePlanDrawer({ open, onClose, defaultPlayerCount, trainingDate, initialKind = 'MAIN', onGenerate }: Props) {
  const initialDuration = useMemo(() => defaultDurationFor(trainingDate), [trainingDate])
  const isBeginner = initialKind === 'BEGINNER'
  const beginnerDefaultPlayerCount = 3
  const [playerCount, setPlayerCount] = useState(isBeginner ? beginnerDefaultPlayerCount : (defaultPlayerCount || 10))
  const [focuses, setFocuses] = useState<Set<TrainingFocus>>(new Set())
  const [infieldPositions, setInfieldPositions] = useState<Set<InfieldPosition>>(new Set())
  const [durationMinutes, setDurationMinutes] = useState(initialDuration)
  const [withBeginnerGroup, setWithBeginnerGroup] = useState(false)
  const [beginnerCount, setBeginnerCount] = useState(2)
  const [beginnerFocus, setBeginnerFocus] = useState<TrainingFocus | ''>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPlayerCount(isBeginner ? beginnerDefaultPlayerCount : (defaultPlayerCount || 10))
      setFocuses(new Set())
      setInfieldPositions(new Set())
      setDurationMinutes(initialDuration)
      setWithBeginnerGroup(false)
      setBeginnerCount(2)
      setBeginnerFocus('')
    }
  }, [open, defaultPlayerCount, initialDuration, isBeginner])

  const toggleFocus = (f: TrainingFocus) => {
    setFocuses(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
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
      const data: { playerCount: number; focus: string; durationMinutes: number; infieldPositions?: InfieldPosition[]; withBeginnerGroup?: boolean; beginnerCount?: number; beginnerFocus?: string; kind?: PlanKind } = {
        playerCount,
        focus: [...focuses].join(','),
        durationMinutes,
        // Beginner plans don't ride along a beginner-group inside the main plan
        withBeginnerGroup: isBeginner ? false : withBeginnerGroup,
        beginnerCount: !isBeginner && withBeginnerGroup ? beginnerCount : 0,
        kind: initialKind,
      }
      if (focuses.has('INFIELD_DEFENSE') && infieldPositions.size > 0) {
        data.infieldPositions = [...infieldPositions]
      }
      if (!isBeginner && withBeginnerGroup && beginnerFocus) {
        data.beginnerFocus = beginnerFocus
      }
      await onGenerate(data)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const title = isBeginner ? 'Anfänger-Plan generieren' : 'Plan neu generieren'
  const submitColor = isBeginner ? 'bg-amber-700 hover:bg-amber-800' : 'bg-softball-red-600 hover:bg-softball-red-700'
  const focusButtonActive = isBeginner
    ? 'bg-amber-700 text-white border-amber-700'
    : 'bg-navy-800 text-white border-navy-800'

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
        disabled={submitting || playerCount < 1 || durationMinutes < 30}
        className={`h-11 rounded-lg ${submitColor} text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2`}
      >
        {submitting ? 'Generiere…' : (<><Sparkles size={16} /> Generieren</>)}
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={title} maxWidth="md" footer={footer}>
      <div className="px-4 py-4 space-y-4">
        <p className="text-xs text-navy-600">
          {isBeginner
            ? 'Eigener Plan für die Anfänger — läuft parallel zum Hauptgruppen-Plan.'
            : 'Bestehender Plan wird ersetzt.'}
        </p>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">
            {isBeginner ? 'Anfänger' : 'Spieler'}
          </label>
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

        {!isBeginner && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={withBeginnerGroup}
              onChange={(e) => setWithBeginnerGroup(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-navy-800"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-navy-500">Mit Anfängergruppe? (im selben Plan)</span>
          </label>
          {withBeginnerGroup && (
            <div className="ml-2 pl-3 border-l-2 border-amber-300 space-y-3">
              <div>
                <label className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mb-1">Anfänger-Anzahl (min 2)</label>
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
                    className="w-16 text-center px-2 py-2 border border-cream-300 rounded-md text-sm font-bold text-navy-900 bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setBeginnerCount(c => Math.min(playerCount, c + 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-cream-300 text-navy-700 font-bold text-lg hover:bg-cream-100 cursor-pointer"
                  >+</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mb-1">Focus Anfänger (optional)</label>
                <p className="text-[10px] text-navy-500 mb-2">Leer = gleicher Focus wie Hauptgruppe + nur BASIC-Drills.</p>
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
          )}
        </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">
            {isBeginner ? 'Focus Anfänger' : 'Schwerpunkte'}
          </label>
          <p className="text-[10px] text-navy-500 mb-2">
            {isBeginner
              ? 'Leer = nur BASIC-Drills, breit gefasst.'
              : 'Mehrere wählbar. Leer = alle Schwerpunkte.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleFocus(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                  focuses.has(opt.value)
                    ? focusButtonActive
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
    </ResponsiveSheet>
  )
}
