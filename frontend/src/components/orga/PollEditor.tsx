import { type FocusEvent, useState } from 'react'
import { Button, ResponsiveSheet } from '@/components/shared'
import { PlusCircle, XMark } from '@/icons'
import type { WhatsappPollRequest, WhatsappGroup, Weekday, TrainingResponse, GameDayResponse, PollMode } from '@/types'
import { coupledSendDate, WEEKDAYS, todayIso, tomorrowIso, type TrainingLite } from './pollSchedule'
import {
  awayTemplate, homeTemplate, trainingTemplate, defaultSendDate,
  matchingTemplateKind, isTemplateUnmodified, refreshTemplateDateFields, NEUTRAL_TEMPLATE_FIELDS,
  isTrainingTemplateUnmodified, refreshTrainingTemplateTitle,
  type GameDayTemplateKind,
} from './pollTemplates'

const JS_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}

/** Merkt, welche Vorlage (falls überhaupt) Frage/Nachricht zuletzt erzeugt hat — und für welchen
 * Bezug: Spieltag-Vorlagen hängen an einem Spieltag (gameDayId), die Trainings-Vorlage an einem
 * Wochentag (weekday). Siehe templateOrigin in PollEditor. */
type TemplateOrigin =
  | { kind: GameDayTemplateKind; gameDayId: number }
  | { kind: 'TRAINING'; weekday: Weekday }

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

export interface PollEditorProps {
  draft: WhatsappPollRequest
  /** Zeitpunkt des letzten echten Versands — null = noch nie gesendet. Steuert die Warnungen
   * vor Optionsänderungen (Punkt 2) und Modus-/Spieltag-Wechsel (Punkt 3). */
  lastSentAt: string | null
  groups: WhatsappGroup[]
  trainings: TrainingResponse[]
  gameDays: GameDayResponse[]
  saving: boolean
  onSave: (request: WhatsappPollRequest) => void
  onClose: () => void
}

export function PollEditor({ draft, lastSentAt, groups, trainings, gameDays, saving, onSave, onClose }: PollEditorProps) {
  const [form, setForm] = useState<WhatsappPollRequest>(draft)
  const [withPoll, setWithPoll] = useState(draft.options.length >= 2)
  // Nachricht pro Tab getrennt: beim Umschalten Text des jeweils anderen Tabs merken/tauschen.
  const [stashedMessage, setStashedMessage] = useState('')
  // Merkt, ob der Nutzer das Datum selbst geändert hat — dann überschreibt ein
  // Spieltag-Wechsel die Vorbelegung nicht mehr.
  const [dateTouched, setDateTouched] = useState(false)
  // Merkt, welche Vorlage (falls überhaupt) Frage/Nachricht zuletzt erzeugt hat und für welchen
  // Spieltag bzw. Trainingstag — damit ein Spieltag-, Trainingstag- oder Modus-Wechsel weiß, ob
  // der Text noch "unverändert" ist (dann darf er nachziehen bzw. zurückgesetzt werden) oder vom
  // Nutzer bereits editiert wurde (dann bleibt er unangetastet). Bei einem bereits gespeicherten
  // Poll gibt es keinen Merker aus einer vorherigen Sitzung — hier wird abgeleitet, ob
  // Frage+Nachricht (noch) exakt einer der Vorlagen für seinen Spieltag/Trainingstag entsprechen.
  const [templateOrigin, setTemplateOrigin] = useState<TemplateOrigin | null>(() => {
    if (draft.mode === 'GAME_DAY' && draft.gameDayId != null) {
      const gd = gameDays.find(g => g.id === draft.gameDayId)
      if (!gd) return null
      const kind = matchingTemplateKind(draft, gd)
      return kind ? { kind, gameDayId: draft.gameDayId } : null
    }
    if (draft.mode === 'TRAINING' && draft.weekday) {
      return isTrainingTemplateUnmodified(draft, draft.weekday) ? { kind: 'TRAINING', weekday: draft.weekday } : null
    }
    return null
  })

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

  // Modus-Wechsel: sinnvolle Defaults setzen, ohne bereits gewählte Werte zu überschreiben.
  const switchSchedule = (mode: PollMode) => {
    if (mode === form.mode) return
    // Ein manuell getipptes Datum gehörte zum vorherigen Modus — sonst bekäme man die
    // Spieltag-Vorbelegung (Spieltag − 7 Tage) nie mehr, auch nicht bei einem späteren
    // Spieltagwechsel.
    setDateTouched(false)

    // Befund 1: Vorlagen-Inhalt gehört nur zu seinem eigenen Modus (Spieltag- bzw. Trainings-
    // Vorlage). Beim Verlassen des Modus auf den neutralen Ausgangszustand zurücksetzen — aber
    // nur, wenn Frage/Antworten/Nachricht/Mehrfachauswahl noch exakt der Vorlage entsprechen. Hat
    // der Nutzer etwas davon editiert, bleibt alles stehen (Datenverlust wäre schlimmer als
    // inhaltlich unpassender Text).
    const leavingUnmodifiedGameDayTemplate = form.mode === 'GAME_DAY' && mode !== 'GAME_DAY'
      && !!templateOrigin && templateOrigin.kind !== 'TRAINING' && !!selectedGameDay
      && isTemplateUnmodified(templateOrigin.kind, form, selectedGameDay)
    const leavingUnmodifiedTrainingTemplate = form.mode === 'TRAINING' && mode !== 'TRAINING'
      && !!templateOrigin && templateOrigin.kind === 'TRAINING'
      && isTrainingTemplateUnmodified(form, templateOrigin.weekday)
    const leavingUnmodifiedTemplate = leavingUnmodifiedGameDayTemplate || leavingUnmodifiedTrainingTemplate
    if (leavingUnmodifiedTemplate) setTemplateOrigin(null)

    setForm(prev => {
      const base = leavingUnmodifiedTemplate ? { ...prev, ...NEUTRAL_TEMPLATE_FIELDS } : prev
      if (mode === 'TRAINING') {
        if (base.weekday) return { ...base, mode }
        // beim Anschalten sinnvollen Trainingstag vorbelegen (frühestes kommendes Training)
        const upcoming = [...trainings]
          .filter(t => !t.cancelled && t.date >= todayIso())
          .sort((a, b) => a.date.localeCompare(b.date))[0]
        const wd = upcoming ? JS_TO_WEEKDAY[new Date(upcoming.date + 'T00:00:00').getDay()] : 'MONDAY'
        return { ...base, mode, weekday: wd }
      }
      if (mode === 'ONE_OFF') {
        // Datum vorbelegen (morgen), damit das Feld nicht leer ist
        return { ...base, mode, sendDate: base.sendDate ?? tomorrowIso() }
      }
      // GAME_DAY: bereits gewählten oder nächsten kommenden Spieltag vorbelegen + Sendedatum
      // 7 Tage vorher — dateTouched ist gerade zurückgesetzt, die Vorbelegung greift also immer.
      const gameDayId = base.gameDayId ?? [...gameDays]
        .filter(gd => gd.date >= todayIso())
        .sort((a, b) => a.date.localeCompare(b.date))[0]?.id ?? null
      const gd = gameDayId != null ? gameDays.find(g => g.id === gameDayId) : undefined
      return {
        ...base,
        mode,
        gameDayId,
        sendDate: gd ? defaultSendDate(gd.date, todayIso()) : base.sendDate,
      }
    })
  }

  const pickGameDay = (gameDayId: number | null) => {
    const gd = gameDayId != null ? gameDays.find(g => g.id === gameDayId) : undefined
    setForm(prev => {
      const next = {
        ...prev,
        gameDayId,
        sendDate: !dateTouched && gd ? defaultSendDate(gd.date, todayIso()) : prev.sendDate,
      }
      // Befund 2: Frage/Nachricht, die noch unverändert von der zuletzt angewandten Vorlage
      // stammen, für den neu gewählten Spieltag neu erzeugen (Datum/Wochentag/Ort folgen).
      // Individuell editierte Felder bleiben unangetastet — Prüfung pro Feld.
      if (templateOrigin && templateOrigin.kind !== 'TRAINING' && gd) {
        const oldGameDay = gameDays.find(g => g.id === templateOrigin.gameDayId)
        if (oldGameDay) return { ...next, ...refreshTemplateDateFields(templateOrigin.kind, next, oldGameDay, gd) }
      }
      return next
    })
    if (templateOrigin && templateOrigin.kind !== 'TRAINING' && gd) setTemplateOrigin({ kind: templateOrigin.kind, gameDayId: gd.id })
  }

  /** Trainingstag-Wechsel: analog zu pickGameDay — Frage, die noch unverändert von der
   * Trainings-Vorlage stammt, für den neuen Wochentag neu erzeugen. Individuell editierter Text
   * bleibt unangetastet. */
  const pickWeekday = (weekday: Weekday) => {
    setForm(prev => (
      templateOrigin?.kind === 'TRAINING'
        ? { ...prev, weekday, title: refreshTrainingTemplateTitle(prev.title, templateOrigin.weekday, weekday) }
        : { ...prev, weekday }
    ))
    if (templateOrigin?.kind === 'TRAINING') setTemplateOrigin({ kind: 'TRAINING', weekday })
  }

  const selectedGameDay = gameDays.find(g => g.id === form.gameDayId) ?? null

  // Punkt 5: nur kommende Spieltage anbieten (aufsteigend, mit Jahr) — sonst stehen nach ein
  // paar Saisons Dutzende Einträge mit identischem Kurzlabel ("Sa, 12.04.") in der Liste.
  // Zeigt ein bereits gespeicherter Poll auf einen inzwischen vergangenen Spieltag, muss der
  // trotzdem auswählbar bleiben, sonst lässt sich der Poll im Editor nicht mehr speichern.
  const selectableGameDays = [...gameDays]
    .filter(gd => gd.date >= todayIso() || gd.id === form.gameDayId)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Punkt 2: Optionstexte sind nach dem Versand die einzige Zuordnung zu abgegebenen Stimmen
  // (Backend matched über den Text, nicht über eine ID) — ändert man sie danach, laufen
  // bereits abgegebene Stimmen ins Leere. Nur warnen, nicht sperren (siehe Report): das Backend
  // bricht einen späteren Stimmen-Abruf bei Drift ohnehin kontrolliert mit Fehlermeldung ab,
  // und ein Sperren bräuchte einen eigenen Entsperr-Weg im Editor, den es noch nicht gibt.
  const alreadySentGameDayPoll = form.mode === 'GAME_DAY' && !!lastSentAt

  // Punkt 3: das Backend nullt lastSentAt/lastSentMessageId, wenn ein gesendeter Poll den
  // Modus verlässt (TRAINING/GAME_DAY -> etwas anderes) oder — bei GAME_DAY — den Spieltag
  // wechselt (siehe WhatsappPollService.update). Damit sind bereits abgegebene Stimmen nicht
  // mehr abrufbar; der Editor soll das vorher erklären, nicht nur der leere Button danach.
  const modeLeavesCoupling =
    (draft.mode === 'TRAINING' && form.mode !== 'TRAINING') ||
    (draft.mode === 'GAME_DAY' && form.mode !== 'GAME_DAY')
  const gameDayChangedWithinMode =
    draft.mode === 'GAME_DAY' && form.mode === 'GAME_DAY' && form.gameDayId !== draft.gameDayId
  const willLoseSendHistory = !!lastSentAt && (modeLeavesCoupling || gameDayChangedWithinMode)

  const applyTemplate = (kind: GameDayTemplateKind) => {
    if (!selectedGameDay) return
    const template = kind === 'AWAY' ? awayTemplate : homeTemplate
    setForm(prev => ({ ...prev, ...template(selectedGameDay) }))
    setTemplateOrigin({ kind, gameDayId: selectedGameDay.id })
    // Vorlage füllt Frage + Antwortoptionen — ohne den Umfrage-Tab würde buildRequest() das
    // wieder verwerfen (withPoll === false) und der Klick wäre wirkungslos.
    setWithPoll(true)
  }

  const applyTrainingTemplate = () => {
    const weekday = form.weekday ?? 'MONDAY'
    setForm(prev => ({ ...prev, ...trainingTemplate(weekday) }))
    setTemplateOrigin({ kind: 'TRAINING', weekday })
    // Vorlage füllt Frage + Antwortoptionen — ohne den Umfrage-Tab würde buildRequest() das
    // wieder verwerfen (withPoll === false) und der Klick wäre wirkungslos.
    setWithPoll(true)
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
    && (form.mode !== 'GAME_DAY' || form.gameDayId !== null)

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
            {alreadySentGameDayPoll && (
              <p className="mb-2 text-xs font-semibold text-softball-red-600 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">
                ⚠ Diese Umfrage wurde bereits gesendet — die Stimmen-Zuordnung läuft über den Optionstext.
                Änderst du eine Option, passen bereits abgegebene Stimmen nicht mehr dazu. Für eine korrigierte
                Umfrage: Sende-Sperre zurücksetzen und neu senden.
              </p>
            )}
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
                  {i === 0 && form.mode === 'GAME_DAY' && (
                    <span className="shrink-0 font-display text-[10px] tracking-widest uppercase font-bold text-navy-600">
                      zählt als anwesend
                    </span>
                  )}
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
          {form.mode === 'GAME_DAY' && (
            <p className="mt-1 text-xs text-gray-500">
              Datum, Wochentag und Ort in Frage und Nachricht folgen automatisch dem gewählten Spieltag, solange der Text aus der Vorlage stammt.
            </p>
          )}
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

        <div>
          <label className={labelCls}>Wann senden</label>
          <div className="inline-flex rounded-lg border border-cream-300 bg-cream-50 p-0.5">
            {(['TRAINING', 'ONE_OFF', 'GAME_DAY'] as PollMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchSchedule(m)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  form.mode === m ? 'bg-navy-800 text-white' : 'text-navy-700 hover:bg-navy-100'
                }`}
              >
                {m === 'TRAINING' ? 'Training' : m === 'ONE_OFF' ? 'Einmalig' : 'Spieltag'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {form.mode === 'TRAINING'
              ? 'Sendet automatisch 1 Tag vor jedem Training und bucht die Anwesenheit.'
              : form.mode === 'ONE_OFF'
                ? 'Sendet einmalig zum gewählten Zeitpunkt.'
                : 'Sendet einmalig 7 Tage vor dem Spieltag. Die Stimmen lassen sich am Spieltag in die Anwesenheit übernehmen.'}
          </p>
          {willLoseSendHistory && (
            <p className="mt-1 text-xs font-semibold text-softball-red-600 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">
              ⚠ Diese Umfrage wurde bereits gesendet. Speicherst du den Modus- oder Spieltag-Wechsel,
              gehen die abgegebenen Stimmen dafür verloren — sie lassen sich danach nicht mehr abrufen.
            </p>
          )}
        </div>

        {form.mode === 'TRAINING' ? (
          <>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className={labelCls} htmlFor="poll-weekday">Trainingstag</label>
                <select id="poll-weekday" value={form.weekday ?? 'MONDAY'} onChange={e => pickWeekday(e.target.value as Weekday)} className={inputCls}>
                  {WEEKDAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sende-Uhrzeit (am Vortag)</label>
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Vorlage</label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={applyTrainingTemplate}>
                  Trainingsumfrage
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Füllt Frage und Antworten (Ja/Nein) für den gewählten Trainingstag — danach frei editierbar.</p>
            </div>
          </>
        ) : (
          <>
            {form.mode === 'GAME_DAY' && (
              <>
                <div>
                  <label className={labelCls} htmlFor="poll-game-day">Spieltag</label>
                  <select
                    id="poll-game-day"
                    value={form.gameDayId ?? ''}
                    onChange={e => pickGameDay(e.target.value ? Number(e.target.value) : null)}
                    className={inputCls}
                  >
                    <option value="">Spieltag wählen…</option>
                    {selectableGameDays.map(gd => (
                      <option key={gd.id} value={gd.id}>
                        {new Date(gd.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {gd.label ? ` · ${gd.label}` : ''}{gd.location ? ` · ${gd.location}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Vorlage</label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={!selectedGameDay} onClick={() => applyTemplate('AWAY')}>
                      Auswärtsspiel
                    </Button>
                    <Button type="button" variant="secondary" disabled={!selectedGameDay} onClick={() => applyTemplate('HOME')}>
                      Heimspieltag
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Füllt Frage, Nachricht und Antworten aus dem Spieltag — danach frei editierbar.</p>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="poll-send-date">
                  {form.mode === 'GAME_DAY' ? 'Sendedatum' : 'Datum'}
                </label>
                <input
                  id="poll-send-date"
                  type="date"
                  value={form.sendDate ?? ''}
                  onChange={e => { setDateTouched(true); set('sendDate', e.target.value || null) }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{form.mode === 'GAME_DAY' ? 'Sende-Uhrzeit' : 'Uhrzeit'}</label>
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
              </div>
            </div>
          </>
        )}

        <SendPreview form={form} trainings={trainings} gameDay={selectedGameDay} />
      </div>
    </ResponsiveSheet>
  )
}

function SendPreview({ form, trainings, gameDay }: { form: WhatsappPollRequest; trainings: TrainingResponse[]; gameDay: GameDayResponse | null }) {
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
  // Punkt 8: die Klammer "(7 Tage vor dem Spieltag)" stimmt nur, wenn wirklich 7 Tage
  // dazwischen liegen — defaultSendDate klemmt bei einem zu nahen Spieltag auf heute, dann
  // log die Klammer aber trotzdem "7 Tage" behauptet. Stattdessen die tatsächliche Differenz
  // zeigen bzw. erklären, dass der Spieltag dafür zu nah ist.
  let gameDaySuffix = ''
  if (form.mode === 'GAME_DAY' && gameDay) {
    const gameDayMidnight = new Date(gameDay.date + 'T00:00:00').getTime()
    const sendDateMidnight = new Date(form.sendDate + 'T00:00:00').getTime()
    const diffDays = Math.round((gameDayMidnight - sendDateMidnight) / 86400000)
    if (diffDays === 7) {
      gameDaySuffix = ' (7 Tage vor dem Spieltag)'
    } else if (diffDays < 7) {
      gameDaySuffix = ` (Spieltag ist zu nah für 7 Tage Vorlauf — nur ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tage'} vorher)`
    } else {
      gameDaySuffix = ` (${diffDays} Tage vor dem Spieltag)`
    }
  }
  return (
    <p className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
      → Wird am {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} um {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} einmalig gesendet
      {gameDaySuffix}.
    </p>
  )
}
