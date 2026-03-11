import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const c1 = staff.find(s => s.role === 'BASE_COACH_1ST')
    const c3 = staff.find(s => s.role === 'BASE_COACH_3RD')
    setCoach1st(c1?.player.id ?? '')
    setCoach3rd(c3?.player.id ?? '')
  }, [staff])

  const hasChanges = (() => {
    const saved1 = staff.find(s => s.role === 'BASE_COACH_1ST')?.player.id ?? ''
    const saved3 = staff.find(s => s.role === 'BASE_COACH_3RD')?.player.id ?? ''
    return coach1st !== saved1 || coach3rd !== saved3
  })()

  const handleSave = async () => {
    const entries: { playerId: number; role: string }[] = []
    if (coach1st) entries.push({ playerId: coach1st, role: 'BASE_COACH_1ST' })
    if (coach3rd) entries.push({ playerId: coach3rd, role: 'BASE_COACH_3RD' })
    setSaving(true)
    try {
      await onSave(entries)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Coaches</h2>
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        {Object.entries(STAFF_ROLES).map(([role, label]) => {
          const value = role === 'BASE_COACH_1ST' ? coach1st : coach3rd
          const setter = role === 'BASE_COACH_1ST' ? setCoach1st : setCoach3rd

          return (
            <div key={role}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <select
                value={value}
                onChange={e => setter(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy-600"
              >
                <option value="">— nicht besetzt —</option>
                {availablePlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )
        })}

        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Coaches speichern'}
          </button>
        )}
      </div>
    </div>
  )
}
