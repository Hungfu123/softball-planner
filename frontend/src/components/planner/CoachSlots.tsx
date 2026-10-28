import { useState, useEffect } from 'react'
import type { Player, GameStaffResponse } from '@/types'
import { STAFF_ROLES } from '@/types'

interface Props {
  staff: GameStaffResponse[]
  availablePlayers: Player[]
  loading?: boolean
  onSave: (entries: { playerId: number; role: string }[]) => Promise<void>
}

export function CoachSlots({ staff, availablePlayers, loading, onSave }: Props) {
  const [coach1st, setCoach1st] = useState<number | ''>('')
  const [coach3rd, setCoach3rd] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const c1 = staff.find(s => s.role === 'BASE_COACH_1ST')
    const c3 = staff.find(s => s.role === 'BASE_COACH_3RD')
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
    doSave(newC1, newC3)
  }

  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-2 pb-1.5 border-b border-cream-200 flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Coaches
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm p-3 space-y-4 xl:space-y-2.5">
        {loading ? (
          [0, 1].map(i => (
            <div key={i}>
              <div className="skeleton-shimmer h-3 w-20 rounded-full bg-cream-200 mb-1.5" />
              <div className="skeleton-shimmer h-[38px] w-full rounded-lg bg-cream-200" />
            </div>
          ))
        ) : Object.entries(STAFF_ROLES).map(([role, label]) => {
          const isFirst = role === 'BASE_COACH_1ST'
          const value = isFirst ? coach1st : coach3rd
          const selectId = `coach-${role}`

          return (
            <div key={role}>
              <div>
                <label
                  htmlFor={selectId}
                  className="font-display text-[10px] tracking-widest uppercase font-bold text-gray-500 cursor-pointer block mb-1"
                >
                  {label}
                </label>
                <select
                  id={selectId}
                  value={value}
                  onChange={e => handleChange(role, e.target.value ? Number(e.target.value) : '')}
                  disabled={saving}
                  /* 16px auf Touch: alles darunter lässt iOS Safari beim Fokus zoomen. */
                  className="font-display rounded-lg text-navy-900 bg-cream-50 outline-none focus:border-navy-600 focus:ring-2 focus:ring-cream-200 cursor-pointer transition-colors disabled:opacity-50 w-full px-3 py-2 text-base xl:text-sm font-bold border border-cream-300 hover:border-navy-400"
                >
                  <option value="">— nicht besetzt —</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
