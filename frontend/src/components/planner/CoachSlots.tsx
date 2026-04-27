import { useState, useEffect, useRef } from 'react'
import type { Player, GameStaffResponse } from '@/types'
import { STAFF_ROLES } from '@/types'

interface Props {
  staff: GameStaffResponse[]
  availablePlayers: Player[]
  onSave: (entries: { playerId: number; role: string }[]) => Promise<void>
}

export function CoachSlots({ staff, availablePlayers, onSave }: Props) {
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

  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-2 pb-1.5 border-b border-cream-200 flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Coaches
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-sm p-3 space-y-3">
        {Object.entries(STAFF_ROLES).map(([role, label]) => {
          const value = role === 'BASE_COACH_1ST' ? coach1st : coach3rd

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
            </div>
          )
        })}
      </div>
    </div>
  )
}
