import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { TrainingPeriodResponse } from '@/types'

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Mo' }, { value: 2, label: 'Di' }, { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' }, { value: 5, label: 'Fr' }, { value: 6, label: 'Sa' }, { value: 7, label: 'So' },
]

function weekdayChips(weekdays: number[]): string {
  return WEEKDAYS.filter(w => weekdays.includes(w.value)).map(w => w.label).join(' · ') || '—'
}

type FormState = {
  id: number | null
  name: string
  startDate: string
  endDate: string
  weekdays: number[]
  weekdayTimes: Record<number, string>
  location: string
}

const EMPTY_FORM: FormState = { id: null, name: '', startDate: '', endDate: '', weekdays: [], weekdayTimes: {}, location: '' }

type Props = {
  open: boolean
  onClose: () => void
  periods: TrainingPeriodResponse[]
  activePeriodId: number | null
  onSelect: (id: number | null) => void
  onCreate: (data: { weekdays: number[]; startDate: string; endDate: string; weekdayTimes: Record<number, string>; location?: string; periodName?: string }) => Promise<void>
  onUpdate: (id: number, data: { name: string; startDate: string; endDate: string; weekdays: number[]; weekdayTimes: Record<number, string>; location?: string | null }) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function PeriodManagerDrawer({ open, onClose, periods, activePeriodId, onSelect, onCreate, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrainingPeriodResponse | null>(null)

  const startEdit = (p: TrainingPeriodResponse) => {
    const weekdayTimes: Record<number, string> = {}
    p.weekdays.forEach(w => { weekdayTimes[w] = p.weekdayTimes?.[w] ?? p.time ?? '18:00' })
    setForm({ id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, weekdays: [...p.weekdays], weekdayTimes, location: p.location ?? '' })
    setEditing(true)
  }
  const startCreate = () => { setForm(EMPTY_FORM); setEditing(true) }
  const cancelEdit = () => { setForm(EMPTY_FORM); setEditing(false) }

  const toggleWeekday = (value: number) => {
    setForm(f => {
      if (f.weekdays.includes(value)) {
        const weekdayTimes = { ...f.weekdayTimes }
        delete weekdayTimes[value]
        return { ...f, weekdays: f.weekdays.filter(w => w !== value), weekdayTimes }
      }
      const defaultTime = Object.values(f.weekdayTimes)[0] ?? '18:00'
      return {
        ...f,
        weekdays: [...f.weekdays, value].sort((a, b) => a - b),
        weekdayTimes: { ...f.weekdayTimes, [value]: defaultTime },
      }
    })
  }

  const setWeekdayTime = (value: number, time: string) => {
    setForm(f => ({ ...f, weekdayTimes: { ...f.weekdayTimes, [value]: time } }))
  }

  const canSave = form.name.trim() !== '' && form.startDate !== '' && form.endDate !== '' && form.weekdays.length > 0
    && form.startDate <= form.endDate && form.weekdays.every(w => !!form.weekdayTimes[w])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (form.id == null) {
        await onCreate({ weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, weekdayTimes: form.weekdayTimes, location: form.location || undefined, periodName: form.name.trim() })
      } else {
        await onUpdate(form.id, { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, weekdays: form.weekdays, weekdayTimes: form.weekdayTimes, location: form.location || null })
      }
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ResponsiveSheet open={open} onClose={onClose} title="Trainingsperioden" maxWidth="md">
        <div className="px-4 py-4 space-y-4">
          {!editing && (
            <>
              <button
                type="button"
                onClick={startCreate}
                className="w-full h-11 rounded-lg bg-navy-800 text-white font-bold cursor-pointer hover:bg-navy-900 transition-colors"
              >
                + Neue Periode
              </button>
              {periods.length === 0 ? (
                <p className="text-sm text-navy-500 italic">Noch keine Perioden.</p>
              ) : (
                <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                  {periods.map(p => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 ${p.id === activePeriodId ? 'bg-navy-50' : ''}`}>
                      <button type="button" onClick={() => onSelect(p.id)} className="flex-1 text-left cursor-pointer">
                        <div className="text-sm font-bold text-navy-900">{p.name}</div>
                        <div className="text-[11px] text-navy-500 tabular-nums">{p.startDate} – {p.endDate} · {weekdayChips(p.weekdays)}</div>
                      </button>
                      <button type="button" onClick={() => startEdit(p)} className="text-xs font-semibold text-navy-700 hover:text-navy-900 cursor-pointer px-2">Bearbeiten</button>
                      <button type="button" onClick={() => setDeleteTarget(p)} className="text-xs font-semibold text-softball-red-600 hover:text-softball-red-800 cursor-pointer px-2">Löschen</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {editing && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-navy-900">{form.id == null ? 'Neue Periode' : 'Periode bearbeiten'}</div>
              <label className="block">
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Name</span>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" placeholder="z.B. Sommer 2026" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-navy-500 uppercase tracking-wide">Von</span>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" />
                </label>
                <label className="block">
                  <span className="text-[11px] text-navy-500 uppercase tracking-wide">Bis</span>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" />
                </label>
              </div>
              <div>
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Wochentage</span>
                <div className="flex gap-1.5 mt-1">
                  {WEEKDAYS.map(w => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => toggleWeekday(w.value)}
                      className={`flex-1 h-10 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${form.weekdays.includes(w.value) ? 'bg-navy-800 border-navy-900 text-white' : 'bg-cream-50 border-cream-300 text-navy-700 hover:bg-cream-200'}`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.weekdays.length > 0 && (
                <div>
                  <span className="text-[11px] text-navy-500 uppercase tracking-wide">Uhrzeit je Wochentag</span>
                  <div className="space-y-1.5 mt-1">
                    {WEEKDAYS.filter(w => form.weekdays.includes(w.value)).map(w => (
                      <div key={w.value} className="flex items-center gap-2">
                        <span className="w-8 text-xs font-bold text-navy-700">{w.label}</span>
                        <input
                          type="time"
                          value={form.weekdayTimes[w.value] ?? ''}
                          onChange={e => setWeekdayTime(w.value, e.target.value)}
                          className="flex-1 h-10 px-3 rounded-lg border border-cream-300 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <label className="block">
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Ort</span>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-cream-300 text-sm" placeholder="Park" />
              </label>
              {form.id != null && (
                <p className="text-[11px] text-navy-500">Beim Speichern werden zukünftige Termine an den Rhythmus angepasst. Vergangene Termine bleiben unverändert.</p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={cancelEdit} className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium cursor-pointer hover:bg-cream-100">Abbrechen</button>
                <button type="button" onClick={handleSave} disabled={!canSave || saving} className="h-11 rounded-lg bg-navy-800 text-white font-bold cursor-pointer hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          )}
        </div>
      </ResponsiveSheet>
      {deleteTarget && (
        <ConfirmModal
          title="Periode löschen?"
          message={`"${deleteTarget.name}" und alle zugehörigen Trainingstermine werden gelöscht.`}
          onConfirm={async () => { const t = deleteTarget; setDeleteTarget(null); await onDelete(t.id) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
