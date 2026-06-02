import { useState, useEffect, useRef, useMemo } from 'react'
import type { Player, GameStaffResponse, CoachRotationPair, GameResponse } from '@/types'
import type { CoachRotationLineupRow } from '@/utils/coachRotation'
import { STAFF_ROLES } from '@/types'
import { StarIcon } from '@/icons'
import { ALL_ROTATION_PAIRS, getPairLabel, recommendRotationPair, resolveRotation } from '@/utils/coachRotation'

interface Props {
  staff: GameStaffResponse[]
  availablePlayers: Player[]
  lineup: CoachRotationLineupRow[]
  game: GameResponse
  loading?: boolean
  onSave: (entries: { playerId: number; role: string }[]) => Promise<void>
  onSaveRotation: (firstBase: CoachRotationPair | null, thirdBase: CoachRotationPair | null) => Promise<void>
}

export function CoachSlots({ staff, availablePlayers, lineup, game, loading, onSave, onSaveRotation }: Props) {
  const [coach1st, setCoach1st] = useState<number | ''>('')
  const [coach3rd, setCoach3rd] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const skipAutoSave = useRef(true)

  useEffect(() => {
    const c1 = staff.find(s => s.role === 'BASE_COACH_1ST')
    const c3 = staff.find(s => s.role === 'BASE_COACH_3RD')
    skipAutoSave.current = true
    setCoach1st(c1?.player.id ?? '')
    setCoach3rd(c3?.player.id ?? '')
  }, [staff])

  const doSave = async (c1: number | '', c3: number | '') => {
    const entries: { playerId: number; role: string }[] = []
    if (c1) entries.push({ playerId: c1, role: 'BASE_COACH_1ST' })
    if (c3) entries.push({ playerId: c3, role: 'BASE_COACH_3RD' })
    setSaving(true)
    try {
      await onSave(entries)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (role: string, val: number | '') => {
    const newC1 = role === 'BASE_COACH_1ST' ? val : coach1st
    const newC3 = role === 'BASE_COACH_3RD' ? val : coach3rd
    if (role === 'BASE_COACH_1ST') setCoach1st(val)
    else setCoach3rd(val)
    skipAutoSave.current = false
    doSave(newC1, newC3)
  }

  const handleRotationPick = (role: string, pair: CoachRotationPair) => {
    const next1B = role === 'BASE_COACH_1ST' ? pair : (game.firstBaseCoachRotation ?? null)
    const next3B = role === 'BASE_COACH_3RD' ? pair : (game.thirdBaseCoachRotation ?? null)
    onSaveRotation(next1B, next3B)
  }

  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-2 pb-1.5 border-b border-cream-200 flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Coaches
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-sm p-3 space-y-4">
        {loading ? (
          [0, 1].map(i => (
            <div key={i}>
              <div className="skeleton-shimmer h-3 w-20 rounded-full bg-cream-200 mb-1.5" />
              <div className="skeleton-shimmer h-[38px] w-full rounded-lg bg-cream-200" />
            </div>
          ))
        ) : Object.entries(STAFF_ROLES).map(([role, label]) => {
          const value = role === 'BASE_COACH_1ST' ? coach1st : coach3rd
          const currentRotation = role === 'BASE_COACH_1ST'
            ? (game.firstBaseCoachRotation ?? null)
            : (game.thirdBaseCoachRotation ?? null)

          return (
            <div key={role}>
              <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1">{label}</label>
              <select
                value={value}
                onChange={e => handleChange(role, e.target.value ? Number(e.target.value) : '')}
                disabled={saving}
                className="font-display w-full border border-cream-300 rounded-lg px-3 py-2 text-sm font-bold text-navy-900 bg-cream-50 outline-none focus:border-navy-600 focus:ring-2 focus:ring-cream-200 cursor-pointer hover:border-navy-400 transition-colors disabled:opacity-50"
              >
                <option value="">— nicht besetzt —</option>
                {availablePlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {!value && lineup.length >= 10 && (
                <RotationPicker
                  lineup={lineup}
                  currentValue={currentRotation}
                  onPick={(pair) => handleRotationPick(role, pair)}
                />
              )}
              {!value && lineup.length < 10 && (
                <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  Lineup mit 10 Spielern nötig für Coach-Rotation
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface RotationPickerProps {
  lineup: CoachRotationLineupRow[]
  currentValue: CoachRotationPair | null
  onPick: (pair: CoachRotationPair) => void
}

function RotationPicker({ lineup, currentValue, onPick }: RotationPickerProps) {
  const recommended = useMemo(() => recommendRotationPair(lineup), [lineup])
  const active: CoachRotationPair = currentValue ?? recommended
  const resolved = useMemo(() => resolveRotation(active, lineup), [active, lineup])

  return (
    <div className="mt-2 space-y-2">
      <div className="font-display text-[9px] tracking-widest uppercase font-bold text-gray-500">
        ↳ Rotation aus Lineup
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_ROTATION_PAIRS.map(pair => {
          const isActive = active === pair
          const isRecommended = recommended === pair
          return (
            <button
              key={pair}
              type="button"
              onClick={() => onPick(pair)}
              className={`relative font-display min-w-[78px] px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all duration-150 min-h-[40px] whitespace-nowrap inline-flex items-center justify-center gap-1 cursor-pointer touch-manipulation
                hover:-translate-y-px active:scale-[0.96]
                ${isActive
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'bg-cream-100 text-gray-700 hover:bg-cream-200 hover:text-navy-900 active:bg-cream-300 border border-cream-300'}`}
            >
              {getPairLabel(pair)}
              {isRecommended && !isActive && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-cream-50">
                  <StarIcon size={7} className="text-white fill-white" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="relative bg-cream-50 border border-cream-300 rounded-xl p-2 overflow-hidden">
        {/* Score-Card Hairline-Eyebrow */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[8px] tracking-[0.3em] uppercase font-bold text-softball-red-600 shrink-0">
            Aktiv · {getPairLabel(active).toUpperCase()}
          </span>
          <span className="h-px flex-1 bg-softball-red-600/30" />
        </div>
        <div className="grid grid-cols-2 gap-0 rounded-md overflow-hidden border border-cream-300">
          {/* PRIMARY — navy-dominant */}
          <div className="bg-navy-900 px-2.5 py-1.5">
            <div className="font-mono text-[8px] tracking-[0.25em] uppercase font-bold text-cream-200/70">
              Primary
            </div>
            <div className="font-display font-extrabold text-white text-sm leading-tight mt-0.5">
              {resolved.primary.name}
            </div>
            <div className="font-mono text-[9px] text-cream-200/80 tabular-nums">
              #{resolved.primary.pos}
            </div>
          </div>
          {/* BACKUP — cream sekundär */}
          <div className="bg-cream-100 px-2.5 py-1.5">
            <div className="font-mono text-[8px] tracking-[0.25em] uppercase font-bold text-gray-500">
              Backup
            </div>
            <div className="font-display font-extrabold text-navy-900 text-sm leading-tight mt-0.5">
              {resolved.backup.name}
            </div>
            <div className="font-mono text-[9px] text-gray-600 tabular-nums">
              #{resolved.backup.pos} · Schlag {resolved.backupCoverRange}
            </div>
          </div>
        </div>
        {/* Compact hint: bis Primary zurück */}
        <div className="font-display text-[9px] text-gray-500 italic mt-1.5 leading-tight">
          <strong className="not-italic font-bold text-navy-900">{resolved.backup.name}</strong> coacht bis <strong className="not-italic font-bold text-navy-900">{resolved.primary.name}</strong> vom Schlag zurück
        </div>
      </div>
    </div>
  )
}
