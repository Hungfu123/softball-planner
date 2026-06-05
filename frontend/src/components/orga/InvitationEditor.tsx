import { useState } from 'react'
import type { InvitationRequest, InvitationGame, InvitationContact, PairingMode } from '@/types'
import { ResponsiveSheet } from '@/components/shared'
import { GameScheduleEditor } from './GameScheduleEditor'
import { ContactEditor } from './ContactEditor'

const OWN_TEAM = 'Dead Sox'

interface Props {
  invitation: InvitationRequest
  onSave: (request: InvitationRequest) => void
  onClose: () => void
  saving?: boolean
}

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

export function InvitationEditor({ invitation, onSave, onClose, saving = false }: Props) {
  const [form, setForm] = useState<InvitationRequest>(invitation)

  const set = <K extends keyof InvitationRequest>(key: K, value: InvitationRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const setGuest = (index: number, value: string) => {
    const next = [...form.guestTeams]
    next[index] = value
    set('guestTeams', next)
  }

  const teams = [OWN_TEAM, ...form.guestTeams.filter(Boolean)]

  const handleSave = () => {
    onSave(form)
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-lg hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer transition-colors"
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !form.title.trim()}
        className="px-4 py-2 text-sm font-semibold text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving ? 'Speichern…' : 'Speichern'}
      </button>
    </div>
  )

  // guestTeams: ensure at least 3 input slots are shown
  const guestSlots = Math.max(3, form.guestTeams.length)

  return (
    <ResponsiveSheet open onClose={onClose} title="Einladung" maxWidth="xl" footer={footer}>
      <div className="p-5 space-y-5">
        <div>
          <label className={labelCls}>Titel</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="z.B. Indoor Series Turnier"
            className={inputCls}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Briefdatum</label>
            <input
              type="date"
              value={form.letterDate ?? ''}
              onChange={e => set('letterDate', e.target.value || null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Veranstaltungsdatum</label>
            <input
              type="date"
              value={form.eventDate ?? ''}
              onChange={e => set('eventDate', e.target.value || null)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Ort</label>
            <input
              value={form.venue ?? ''}
              onChange={e => set('venue', e.target.value || null)}
              placeholder="z.B. Sporthalle …"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Paarungs-Modus</label>
            <select
              value={form.pairingMode}
              onChange={e => set('pairingMode', e.target.value as PairingMode)}
              className={inputCls}
            >
              <option value="HEIM_GAST">Heim / Gast</option>
              <option value="TEAM_1_2">Team 1 / Team 2</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Gastteams</label>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: guestSlots }).map((_, i) => (
              <input
                key={i}
                value={form.guestTeams[i] ?? ''}
                onChange={e => setGuest(i, e.target.value)}
                placeholder={`Team ${i + 1}`}
                className={inputCls}
              />
            ))}
          </div>
        </div>

        <GameScheduleEditor
          games={form.games}
          teams={teams}
          onChange={(games: InvitationGame[]) => set('games', games)}
        />

        <div>
          <label className={labelCls}>Brieftext</label>
          <textarea
            value={form.bodyText ?? ''}
            onChange={e => set('bodyText', e.target.value || null)}
            rows={8}
            className={`${inputCls} resize-y`}
          />
        </div>

        <ContactEditor
          contacts={form.contacts}
          onChange={(contacts: InvitationContact[]) => set('contacts', contacts)}
        />
      </div>
    </ResponsiveSheet>
  )
}
