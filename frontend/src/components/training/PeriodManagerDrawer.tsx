import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/shared'
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
  cycleWeeks: number
  activeWeeksInCycle: number[]
  /** Wochentage, an denen nur Pitcher und Catcher eingeladen sind. */
  pcOnlyWeekdays: number[]
}

const EMPTY_FORM: FormState = { id: null, name: '', startDate: '', endDate: '', weekdays: [], weekdayTimes: {}, location: '', cycleWeeks: 1, activeWeeksInCycle: [1], pcOnlyWeekdays: [] }

type Props = {
  open: boolean
  onClose: () => void
  periods: TrainingPeriodResponse[]
  activePeriodId: number | null
  onSelect: (id: number | null) => void
  onCreate: (data: { weekdays: number[]; startDate: string; endDate: string; weekdayTimes: Record<number, string>; location?: string; periodName?: string; cycleWeeks?: number; activeWeeksInCycle?: number[]; pcOnlyWeekdays?: number[] }) => Promise<void>
  onUpdate: (id: number, data: { name: string; startDate: string; endDate: string; weekdays: number[]; weekdayTimes: Record<number, string>; location?: string | null; cycleWeeks?: number; activeWeeksInCycle?: number[]; pcOnlyWeekdays?: number[] }) => Promise<void>
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
    setForm({
      id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, weekdays: [...p.weekdays], weekdayTimes, location: p.location ?? '',
      cycleWeeks: p.cycleWeeks ?? 1, activeWeeksInCycle: p.activeWeeksInCycle?.length ? [...p.activeWeeksInCycle] : [1],
      pcOnlyWeekdays: [...(p.pcOnlyWeekdays ?? [])],
    })
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

  /** Nur-P/C an einem Tag an- oder abschalten. */
  const togglePcOnly = (value: number) => {
    setForm(f => ({
      ...f,
      pcOnlyWeekdays: f.pcOnlyWeekdays.includes(value)
        ? f.pcOnlyWeekdays.filter(d => d !== value)
        : [...f.pcOnlyWeekdays, value],
    }))
  }

  const setWeekdayTime = (value: number, time: string) => {
    setForm(f => ({ ...f, weekdayTimes: { ...f.weekdayTimes, [value]: time } }))
  }

  const setCycleWeeks = (weeks: number) => {
    setForm(f => {
      const cycleWeeks = Math.max(1, weeks || 1)
      const filtered = f.activeWeeksInCycle.filter(w => w <= cycleWeeks)
      return { ...f, cycleWeeks, activeWeeksInCycle: filtered.length > 0 ? filtered : [1] }
    })
  }

  const toggleActiveWeek = (week: number) => {
    setForm(f => {
      const has = f.activeWeeksInCycle.includes(week)
      if (has && f.activeWeeksInCycle.length === 1) return f // mindestens eine aktive Woche
      const next = has ? f.activeWeeksInCycle.filter(w => w !== week) : [...f.activeWeeksInCycle, week].sort((a, b) => a - b)
      return { ...f, activeWeeksInCycle: next }
    })
  }

  const canSave = form.name.trim() !== '' && form.startDate !== '' && form.endDate !== '' && form.weekdays.length > 0
    && form.startDate <= form.endDate && form.weekdays.every(w => !!form.weekdayTimes[w])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      if (form.id == null) {
        await onCreate({ weekdays: form.weekdays, startDate: form.startDate, endDate: form.endDate, weekdayTimes: form.weekdayTimes, location: form.location || undefined, periodName: form.name.trim(), cycleWeeks: form.cycleWeeks, activeWeeksInCycle: form.activeWeeksInCycle, pcOnlyWeekdays: form.pcOnlyWeekdays })
      } else {
        await onUpdate(form.id, { name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, weekdays: form.weekdays, weekdayTimes: form.weekdayTimes, location: form.location || null, cycleWeeks: form.cycleWeeks, activeWeeksInCycle: form.activeWeeksInCycle, pcOnlyWeekdays: form.pcOnlyWeekdays })
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
              <Button
                type="button"
                variant="navy"
                onClick={startCreate}
                className="w-full h-11 font-bold"
              >
                + Neue Periode
              </Button>
              {periods.length === 0 ? (
                <p className="text-sm text-navy-500 italic">Noch keine Perioden.</p>
              ) : (
                <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                  {periods.map(p => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 ${p.id === activePeriodId ? 'bg-navy-50' : ''}`}>
                      <button type="button" onClick={() => onSelect(p.id)} className="flex-1 text-left cursor-pointer">
                        <div className="text-sm font-bold text-navy-900">{p.name}</div>
                        <div className="text-[11px] text-navy-500 tabular-nums">
                          {p.startDate} – {p.endDate} · {weekdayChips(p.weekdays)}
                          {p.cycleWeeks > 1 && ` · alle ${p.cycleWeeks} Wo. (${p.activeWeeksInCycle.join(',')})`}
                        </div>
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
              <div>
                <span className="text-[11px] text-navy-500 uppercase tracking-wide">Rhythmus</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-navy-700">alle</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.cycleWeeks}
                    onChange={e => setCycleWeeks(parseInt(e.target.value, 10))}
                    className="w-16 h-10 px-2 rounded-lg border border-cream-300 text-sm text-center"
                  />
                  <span className="text-xs text-navy-700">Woche(n)</span>
                </div>
                {form.cycleWeeks > 1 && (
                  <div className="mt-2">
                    <span className="text-[11px] text-navy-500">Aktive Woche(n) im Zyklus (ab Start-Datum gezählt)</span>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {Array.from({ length: form.cycleWeeks }, (_, i) => i + 1).map(week => (
                        <button
                          key={week}
                          type="button"
                          onClick={() => toggleActiveWeek(week)}
                          className={`w-10 h-10 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${form.activeWeeksInCycle.includes(week) ? 'bg-navy-800 border-navy-900 text-white' : 'bg-cream-50 border-cream-300 text-navy-700 hover:bg-cream-200'}`}
                        >
                          {week}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {form.weekdays.length > 0 && (
                <div>
                  <span className="text-[11px] text-navy-500 uppercase tracking-wide">Uhrzeit je Wochentag</span>
                  <div className="space-y-1.5 mt-1">
                    {WEEKDAYS.filter(w => form.weekdays.includes(w.value)).map(w => {
                      const pcOnly = form.pcOnlyWeekdays.includes(w.value)
                      return (
                        <div key={w.value} className="flex items-center gap-2">
                          <span className="w-8 text-xs font-bold text-navy-700">{w.label}</span>
                          <input
                            type="time"
                            value={form.weekdayTimes[w.value] ?? ''}
                            onChange={e => setWeekdayTime(w.value, e.target.value)}
                            className="flex-1 h-10 px-3 rounded-lg border border-cream-300 text-sm"
                          />
                          {/* Wer ist eingeladen? Nur-P/C-Termine zaehlen nicht in die
                              Trainingsbeteiligung — niemandem darf als versaeumt
                              angerechnet werden, wozu er nicht geladen war. */}
                          <button
                            type="button"
                            onClick={() => togglePcOnly(w.value)}
                            aria-pressed={pcOnly}
                            title={pcOnly
                              ? 'Nur Pitcher und Catcher eingeladen — zählt nicht in die Trainingsbeteiligung'
                              : 'Ganzer Kader eingeladen — zählt in die Trainingsbeteiligung'}
                            className={`h-10 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors active:scale-95 motion-reduce:active:scale-100 ${
                              pcOnly
                                ? 'bg-navy-800 border-navy-900 text-white'
                                : 'bg-cream-50 border-cream-300 text-gray-400 hover:bg-cream-200'
                            }`}
                          >
                            nur P/C
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    „nur P/C" heißt: an diesem Tag ist nur ein Teil des Kaders eingeladen.
                    Solche Termine zählen nicht in die Trainingsbeteiligung der Aufstellung.
                  </p>
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
                <Button type="button" variant="secondary" onClick={cancelEdit} className="h-11 w-full">Abbrechen</Button>
                <Button type="button" variant="navy" onClick={handleSave} disabled={!canSave || saving} className="h-11 w-full font-bold">{saving ? 'Speichern…' : 'Speichern'}</Button>
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
