import { type FocusEvent, useState } from 'react'
import { Button, ResponsiveSheet } from '@/components/shared'
import { PlusCircle, XMark } from '@/icons'
import type { WhatsappPollRequest, WhatsappGroup, Weekday, TrainingResponse } from '@/types'
import { coupledSendDate, WEEKDAYS, todayIso, tomorrowIso, type TrainingLite } from './pollSchedule'

const JS_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

export interface PollEditorProps {
  draft: WhatsappPollRequest
  groups: WhatsappGroup[]
  trainings: TrainingResponse[]
  saving: boolean
  onSave: (request: WhatsappPollRequest) => void
  onClose: () => void
}

export function PollEditor({ draft, groups, trainings, saving, onSave, onClose }: PollEditorProps) {
  const [form, setForm] = useState<WhatsappPollRequest>(draft)
  const [withPoll, setWithPoll] = useState(draft.options.length >= 2)
  // Nachricht pro Tab getrennt: beim Umschalten Text des jeweils anderen Tabs merken/tauschen.
  const [stashedMessage, setStashedMessage] = useState('')

  const switchMode = (poll: boolean) => {
    if (poll === withPoll) return
    const current = form.message ?? ''
    setForm(prev => ({ ...prev, message: stashedMessage || null }))
    setStashedMessage(current)
    setWithPoll(poll)
  }

  const set = <K extends keyof WhatsappPollRequest>(key: K, value: WhatsappPollRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const setGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    setForm(prev => ({ ...prev, groupId, groupName: group?.name ?? null }))
  }

  // Mobil: fokussiertes Feld nur dann über die Tastatur scrollen, wenn es
  // verdeckt ist ('nearest' = minimaler Scroll). 'center' würde auch bereits
  // sichtbare Felder (z.B. Frage oben) unnötig wegscrollen. Keyboard braucht ~300ms.
  const scrollIntoView = (e: FocusEvent<HTMLElement>) => {
    const el = e.currentTarget
    setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 300)
  }

  const setOption = (index: number, value: string) => {
    const next = [...form.options]
    next[index] = value
    set('options', next)
  }

  const addOption = () => set('options', [...form.options, ''])
  const removeOption = (index: number) => set('options', form.options.filter((_, i) => i !== index))

  // Doppelte Optionen beim Speichern automatisch entfernen (WhatsApp erlaubt keine).
  const uniqueOptions = Array.from(new Set(form.options.map(o => o.trim()).filter(Boolean)))
  const messageFilled = (form.message ?? '').trim() !== ''
  const pollValid = form.title.trim() !== '' && uniqueOptions.length >= 2
  // Einmalig braucht ein Datum in der Zukunft (sonst Backend-400 bzw. toter Poll der nie sendet).
  // Coupled hat immer einen Trainingstag (Prefill).
  const oneOffFuture = !!form.sendDate
    && new Date(form.sendDate + 'T' + form.time).getTime() >= new Date().getTime()
  const scheduleValid = form.mode === 'TRAINING' || oneOffFuture
  const canSave = form.groupId !== '' && (withPoll ? pollValid : messageFilled) && scheduleValid

  const buildRequest = (): WhatsappPollRequest => ({
    ...form,
    title: withPoll ? form.title.trim() : '',
    options: withPoll ? uniqueOptions : [],
    allowMultipleAnswers: withPoll ? form.allowMultipleAnswers : false,
    message: messageFilled ? (form.message ?? '').trim() : null,
  })

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
      <Button type="button" variant="primary" onClick={() => onSave(buildRequest())} disabled={saving || !canSave}>
        {saving ? 'Speichern…' : 'Speichern'}
      </Button>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onClose} title={withPoll ? 'Umfrage' : 'Nachricht'} maxWidth="md" footer={footer}>
      <div className="p-5 space-y-5">
        <div>
          <label className={labelCls}>Inhalt</label>
          <div className="inline-flex rounded-lg border border-cream-300 bg-cream-50 p-0.5">
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${withPoll ? 'bg-navy-800 text-white' : 'text-navy-700 hover:bg-navy-100'}`}
            >
              Umfrage
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${!withPoll ? 'bg-navy-800 text-white' : 'text-navy-700 hover:bg-navy-100'}`}
            >
              Nur Nachricht
            </button>
          </div>
        </div>

        {withPoll && (
          <div>
            <label className={labelCls}>Frage</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onFocus={scrollIntoView}
              placeholder="z.B. Wer kommt zum Training?"
              className={inputCls}
            />
          </div>
        )}

        {withPoll && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Antwortoptionen</label>
              <button
                type="button"
                onClick={addOption}
                disabled={form.options.length >= 12}
                title={form.options.length >= 12 ? 'Maximal 12 Antwortoptionen erlaubt' : undefined}
                className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-navy-700"
              >
                <PlusCircle size={14} /> Option
              </button>
            </div>
            <div className="space-y-2">
              {form.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={option}
                    onChange={e => setOption(i, e.target.value)}
                    onFocus={scrollIntoView}
                    placeholder={`Option ${i + 1}`}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={form.options.length <= 2}
                    aria-label="Option entfernen"
                    title="Entfernen"
                    className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XMark size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {withPoll && (
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.allowMultipleAnswers}
              onChange={e => set('allowMultipleAnswers', e.target.checked)}
              className="accent-navy-700 w-4 h-4 mt-0.5 cursor-pointer"
            />
            <span>
              <span className="block text-sm font-semibold text-navy-800">Mehrfachauswahl erlauben</span>
              <span className="block text-xs text-gray-500">Teilnehmer können mehrere Antworten ankreuzen (statt nur einer).</span>
            </span>
          </label>
        )}

        <div>
          <label className={labelCls}>{withPoll ? 'Zusätzliche Nachricht (optional)' : 'Nachricht'}</label>
          <textarea
            value={form.message ?? ''}
            onChange={e => set('message', e.target.value ? e.target.value : null)}
            onFocus={scrollIntoView}
            rows={withPoll ? 2 : 3}
            placeholder={withPoll ? 'Wird vor der Umfrage gesendet — z.B. Event-Details, Ort.' : 'Deine Nachricht an die Gruppe — z.B. Event-Details, Ort, Uhrzeit.'}
            className={inputCls + ' resize-y'}
          />
        </div>

        <div>
          <label className={labelCls}>Gruppe</label>
          <select
            value={form.groupId}
            onChange={e => setGroup(e.target.value)}
            disabled={groups.length === 0}
            className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {groups.length === 0 && <option value="">Keine Gruppen verfügbar</option>}
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.mode === 'TRAINING'}
            onChange={e => {
              const on = e.target.checked
              setForm(prev => {
                if (on && !prev.weekday) {
                  // beim Anschalten sinnvollen Trainingstag vorbelegen (frühestes kommendes Training)
                  const upcoming = [...trainings]
                    .filter(t => !t.cancelled && t.date >= todayIso())
                    .sort((a, b) => a.date.localeCompare(b.date))[0]
                  const wd = upcoming ? JS_TO_WEEKDAY[new Date(upcoming.date + 'T00:00:00').getDay()] : 'MONDAY'
                  return { ...prev, mode: 'TRAINING', weekday: wd }
                }
                if (!on && !prev.sendDate) {
                  // beim Umschalten auf einmalig ein Datum vorbelegen (morgen), damit das Feld nicht leer ist
                  return { ...prev, mode: 'ONE_OFF', sendDate: tomorrowIso() }
                }
                return { ...prev, mode: on ? 'TRAINING' : 'ONE_OFF' }
              })
            }}
            className="accent-navy-700 w-4 h-4 mt-0.5 cursor-pointer"
          />
          <span>
            <span className="block text-sm font-semibold text-navy-800">Trainingsumfrage</span>
            <span className="block text-xs text-gray-500">An den Trainingstag gekoppelt: sendet automatisch 1 Tag vor jedem Training und bucht die Anwesenheit. Aus = einmalig zu einem festen Zeitpunkt.</span>
          </span>
        </label>

        {form.mode === 'TRAINING' ? (
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={labelCls}>Trainingstag</label>
              <select value={form.weekday ?? 'MONDAY'} onChange={e => set('weekday', e.target.value as Weekday)} className={inputCls}>
                {WEEKDAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sende-Uhrzeit (am Vortag)</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="poll-send-date">Datum</label>
              <input id="poll-send-date" type="date" value={form.sendDate ?? ''} onChange={e => set('sendDate', e.target.value || null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Uhrzeit</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <SendPreview form={form} trainings={trainings} />
      </div>
    </ResponsiveSheet>
  )
}

function SendPreview({ form, trainings }: { form: WhatsappPollRequest; trainings: TrainingResponse[] }) {
  const t: TrainingLite[] = trainings.map(x => ({ date: x.date, cancelled: x.cancelled }))
  if (form.mode === 'TRAINING') {
    if (!form.weekday) return null
    const d = coupledSendDate(form.weekday, form.time, t, [], new Date())
    const wdLabel = WEEKDAYS.find(w => w.value === form.weekday)?.label ?? ''
    if (!d) {
      return <p className="text-xs font-semibold text-softball-red-600 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">⚠ Kein {wdLabel}-Training in der Saison — die Umfrage wird nie automatisch gesendet.</p>
    }
    return <p className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">→ Wird {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} um {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} gesendet (Vortag des Trainings).</p>
  }
  if (!form.sendDate) return null
  const d = new Date(form.sendDate + 'T' + form.time)
  const past = d.getTime() < new Date().getTime()
  if (past) {
    return <p className="text-xs font-semibold text-softball-red-600 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">⚠ Zeitpunkt liegt in der Vergangenheit — es wird nicht gesendet.</p>
  }
  return <p className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">→ Wird am {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} um {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} einmalig gesendet.</p>
}
