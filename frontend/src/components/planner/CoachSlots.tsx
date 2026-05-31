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
  onSave: (entries: { playerId: number; role: string }[]) => Promise<void>
  onSaveRotation: (firstBase: CoachRotationPair | null, thirdBase: CoachRotationPair | null) => Promise<void>
}

export function CoachSlots({ staff, availablePlayers, lineup, game, onSave, onSaveRotation }: Props) {
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
        {Object.entries(STAFF_ROLES).map(([role, label]) => {
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
              className={`font-display px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-colors min-h-[40px] whitespace-nowrap inline-flex items-center gap-1 cursor-pointer touch-manipulation
                ${isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-cream-100 text-gray-700 hover:bg-cream-200 hover:text-navy-900 active:bg-cream-300 border border-cream-300'}`}
            >
              {getPairLabel(pair)}
              {isRecommended && !isActive && (
                <StarIcon size={9} className="text-amber-500 fill-amber-500" />
              )}
            </button>
          )
        })}
      </div>
      <div className="bg-cream-50 border border-cream-300 rounded-xl p-3">
        <div className="font-display text-[9px] tracking-widest uppercase font-bold text-softball-red-600 mb-2">
          Aktiv · {getPairLabel(active).toUpperCase()}
        </div>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden border border-cream-200">
          <div className="bg-cream-100 p-2.5">
            <div className="font-display text-[10px] tracking-widest uppercase font-bold text-navy-700 mb-1">
              Primary
            </div>
            <div className="font-display font-extrabold text-navy-900 text-sm">{resolved.primary.name}</div>
            <div className="font-display text-[10px] tracking-wider text-gray-500">Pos {resolved.primary.pos} · steht standard</div>
          </div>
          <div className="bg-softball-red-50 p-2.5 border-l-2 border-softball-red-600">
            <div className="font-display text-[10px] tracking-widest uppercase font-bold text-softball-red-700 mb-1">
              Backup
            </div>
            <div className="font-display font-extrabold text-navy-900 text-sm">{resolved.backup.name}</div>
            <div className="font-display text-[10px] tracking-wider text-gray-500">Pos {resolved.backup.pos} · übernimmt {resolved.backupCoverRange}</div>
          </div>
        </div>
        <div className="font-display text-[10px] text-gray-700 italic mt-2 space-y-1">
          <div>
            <strong className="not-italic font-bold text-navy-900">{resolved.backup.name}</strong> coacht Schlag {resolved.backupCoverRange}
            {' '}(<strong className="not-italic font-bold text-navy-900">{resolved.primary.name}</strong> wärmt auf + schlägt {resolved.primaryAbSlot})
          </div>
          <div>
            Falls <strong className="not-italic font-bold text-navy-900">{resolved.primary.name}</strong> nach Schlag auf Base → <strong className="not-italic font-bold text-navy-900">{resolved.backup.name}</strong> bleibt bis Rückkehr ins Dugout
          </div>
        </div>
      </div>
    </div>
  )
}
