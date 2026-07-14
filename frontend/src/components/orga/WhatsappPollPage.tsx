import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWhatsappPoll } from '@/hooks/useWhatsappPoll'
import { getWhatsappQr } from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'
import { Card, Badge, ConfirmModal, EmptyState, ResponsiveSheet, LoadingSkeleton } from '@/components/shared'
import { PlusCircle, Pencil, TrashBin, CrossBones, SendIcon, XMark, CheckCircle } from '@/icons'
import type { WhatsappPollResponse, WhatsappPollRequest, WhatsappGroup, Weekday, WhatsappAccountStatus } from '@/types'

const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 'MONDAY', label: 'Montag', short: 'Mo' },
  { value: 'TUESDAY', label: 'Dienstag', short: 'Di' },
  { value: 'WEDNESDAY', label: 'Mittwoch', short: 'Mi' },
  { value: 'THURSDAY', label: 'Donnerstag', short: 'Do' },
  { value: 'FRIDAY', label: 'Freitag', short: 'Fr' },
  { value: 'SATURDAY', label: 'Samstag', short: 'Sa' },
  { value: 'SUNDAY', label: 'Sonntag', short: 'So' },
]

const weekdayShort = (w: Weekday) => WEEKDAYS.find(d => d.value === w)?.short ?? w

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-500 mb-1'

function formatTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatLastSent(iso: string | null): string {
  if (!iso) return 'Noch nie gesendet'
  const d = new Date(iso)
  return `Zuletzt gesendet ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

function blankDraft(groups: WhatsappGroup[]): WhatsappPollRequest {
  return {
    groupId: groups[0]?.id ?? '',
    groupName: groups[0]?.name ?? null,
    title: '',
    options: ['Ja', 'Nein', 'Vielleicht'],
    weekday: 'MONDAY',
    time: '18:00',
    enabled: true,
  }
}

function toRequest(p: WhatsappPollResponse): WhatsappPollRequest {
  return {
    groupId: p.groupId,
    groupName: p.groupName,
    title: p.title,
    options: [...p.options],
    weekday: p.weekday,
    time: formatTime(p.time),
    enabled: p.enabled,
  }
}

type EditorState =
  | { mode: 'create'; draft: WhatsappPollRequest }
  | { mode: 'edit'; id: number; draft: WhatsappPollRequest }
  | null

export function WhatsappPollPage() {
  const {
    polls, status, groups, loading, error, reload,
    createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate,
  } = useWhatsappPoll()
  const toast = useToastContext()

  const [qr, setQr] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [sendId, setSendId] = useState<number | null>(null)
  const [skipInputs, setSkipInputs] = useState<Record<number, string>>({})

  const connected = status?.connected ?? false

  // Solange nicht verbunden: QR alle 20s neu laden (läuft sonst ab) und Status
  // alle 4s pollen, damit die Seite automatisch umschaltet sobald gescannt wurde.
  useEffect(() => {
    if (connected) return
    let cancelled = false
    const fetchQr = () => {
      getWhatsappQr().then(r => { if (!cancelled) setQr(r.qr) }).catch(() => {})
    }
    fetchQr()
    const qrTimer = setInterval(fetchQr, 20000)
    const statusTimer = setInterval(reload, 4000)
    return () => {
      cancelled = true
      clearInterval(qrTimer)
      clearInterval(statusTimer)
    }
  }, [connected, reload])

  const openCreate = () => setEditor({ mode: 'create', draft: blankDraft(groups) })
  const openEdit = (p: WhatsappPollResponse) => setEditor({ mode: 'edit', id: p.id, draft: toRequest(p) })

  const handleSave = async (request: WhatsappPollRequest) => {
    if (!editor) return
    setSaving(true)
    try {
      if (editor.mode === 'edit') {
        await updatePoll(editor.id, request)
        toast.show('Umfrage aktualisiert')
      } else {
        await createPoll(request)
        toast.show('Umfrage erstellt')
      }
      setEditor(null)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    const id = deleteId
    setDeleteId(null)
    try {
      await deletePoll(id)
      toast.show('Umfrage gelöscht')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const confirmSend = async () => {
    if (sendId == null) return
    const id = sendId
    setSendId(null)
    try {
      await sendNow(id)
      toast.show('Umfrage gesendet')
      reload()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleAddSkip = async (id: number) => {
    const date = skipInputs[id]
    if (!date) return
    try {
      await addSkipDate(id, date)
      setSkipInputs(prev => ({ ...prev, [id]: '' }))
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleRemoveSkip = async (id: number, date: string) => {
    try {
      await removeSkipDate(id, date)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const deletePollTitle = polls.find(p => p.id === deleteId)?.title ?? 'Umfrage'

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4 space-y-4">
      <Link to="/orga" className="inline-flex items-center gap-1 text-gray-500 text-sm hover:text-navy-700 hover:underline">← Zurück zur Orga</Link>
      <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">WhatsApp-Umfragen</h1>

      {error && (
        <p className="text-sm text-softball-red-700 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <AccountCard connected={connected} status={status} qr={qr} />

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-700">
          Umfragen {polls.length > 0 && <span className="text-navy-500 font-bold">({polls.length})</span>}
        </h2>
        <button
          type="button"
          onClick={openCreate}
          disabled={!connected}
          title={connected ? undefined : 'Erst WhatsApp verbinden'}
          className="bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-softball-red-600"
        >
          <PlusCircle size={16} /> Neue Umfrage
        </button>
      </div>

      <div className={!connected ? 'opacity-50 pointer-events-none' : ''}>
        {loading ? (
          <LoadingSkeleton variant="list" />
        ) : polls.length === 0 ? (
          <EmptyState
            title="Noch keine Umfragen"
            description="Leg eine wiederkehrende WhatsApp-Umfrage an."
            icon={<CrossBones size={48} />}
          />
        ) : (
          <div className="space-y-3">
            {polls.map(poll => (
              <PollCard
                key={poll.id}
                poll={poll}
                connected={connected}
                skipInput={skipInputs[poll.id] ?? ''}
                onSkipInputChange={value => setSkipInputs(prev => ({ ...prev, [poll.id]: value }))}
                onAddSkip={() => handleAddSkip(poll.id)}
                onRemoveSkip={date => handleRemoveSkip(poll.id, date)}
                onEdit={() => openEdit(poll)}
                onDelete={() => setDeleteId(poll.id)}
                onSend={() => setSendId(poll.id)}
              />
            ))}
          </div>
        )}
      </div>

      {editor && (
        <PollEditor
          draft={editor.draft}
          groups={groups}
          saving={saving}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}

      {deleteId != null && (
        <ConfirmModal
          title="Umfrage löschen"
          message={`„${deletePollTitle}" wirklich löschen?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {sendId != null && (
        <ConfirmModal
          title="Umfrage jetzt senden"
          message="Poll jetzt wirklich senden?"
          confirmLabel="Senden"
          onConfirm={confirmSend}
          onCancel={() => setSendId(null)}
        />
      )}
    </div>
  )
}

function AccountCard({ connected, status, qr }: { connected: boolean; status: WhatsappAccountStatus | null; qr: string | null }) {
  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">WhatsApp-Konto</h2>
        {connected && <Badge color="emerald">Verbunden</Badge>}
      </div>

      {status === null ? (
        <LoadingSkeleton variant="list" rows={2} />
      ) : connected ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">Verbunden als {status.number ?? '–'}</p>
            <p className="text-xs text-gray-500">Umfragen werden automatisch verschickt.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="relative">
            <div className="w-44 rounded-[26px] border-[6px] border-navy-900 bg-white p-3 shadow-lg">
              <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-navy-900/15" />
              {qr ? (
                <img src={qr} alt="WhatsApp-Verknüpfungs-QR-Code" className="w-full aspect-square object-contain rounded" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <LoadingSkeleton variant="inline" />
                </div>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-softball-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-softball-red-600 border-2 border-white" />
            </span>
          </div>
          <div className="space-y-1 max-w-xs">
            <p className="text-sm font-semibold text-navy-900">Noch nicht verbunden</p>
            <p className="text-xs text-gray-500">
              WhatsApp → <span className="font-semibold text-navy-700">Verknüpfte Geräte</span> → <span className="font-semibold text-navy-700">Gerät verknüpfen</span> → QR-Code scannen
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

interface PollCardProps {
  poll: WhatsappPollResponse
  connected: boolean
  skipInput: string
  onSkipInputChange: (value: string) => void
  onAddSkip: () => void
  onRemoveSkip: (date: string) => void
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
}

function PollCard({ poll, connected, skipInput, onSkipInputChange, onAddSkip, onRemoveSkip, onEdit, onDelete, onSend }: PollCardProps) {
  return (
    <div className="group relative overflow-hidden bg-white border border-cream-300 rounded-xl shadow-sm hover:shadow-md hover:border-navy-300 transition-all">
      <span className="absolute inset-y-0 left-0 w-1 bg-navy-800" />
      <div className="pl-4 pr-2.5 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-extrabold text-navy-900 leading-tight truncate">{poll.title || 'Ohne Titel'}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 font-bold tabular-nums text-white bg-navy-900 rounded-full px-2 py-0.5">
                {weekdayShort(poll.weekday)} · {formatTime(poll.time)}
              </span>
              {poll.groupName && <span className="text-navy-500 truncate max-w-[12rem]">{poll.groupName}</span>}
              <Badge color={poll.enabled ? 'emerald' : 'gray'} size="sm">{poll.enabled ? 'Aktiv' : 'Pausiert'}</Badge>
            </div>

            {poll.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {poll.options.map((o, i) => (
                  <span key={i} className="text-[11px] font-semibold text-navy-700 bg-cream-100 border border-cream-300 rounded-md px-1.5 py-0.5">
                    {o}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {poll.skipDates.map(date => (
                <span
                  key={date}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-softball-red-700 bg-softball-red-50 border border-softball-red-100 rounded-md pl-1.5 pr-1 py-0.5"
                >
                  {formatDate(date)}
                  <button
                    type="button"
                    onClick={() => onRemoveSkip(date)}
                    aria-label={`Aussetzen am ${formatDate(date)} entfernen`}
                    className="p-0.5 rounded hover:bg-softball-red-100 cursor-pointer"
                  >
                    <XMark size={10} />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="date"
                  value={skipInput}
                  onChange={e => onSkipInputChange(e.target.value)}
                  aria-label="Aussetz-Datum hinzufügen"
                  className="text-[11px] border border-cream-300 rounded-md px-1.5 py-0.5 bg-cream-50 focus:bg-white focus:border-navy-600 outline-none"
                />
                <button
                  type="button"
                  onClick={onAddSkip}
                  disabled={!skipInput}
                  title="Aussetzen hinzufügen"
                  aria-label="Aussetzen hinzufügen"
                  className="p-1 rounded-md text-gray-400 hover:text-navy-800 hover:bg-navy-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <PlusCircle size={14} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">{formatLastSent(poll.lastSentAt)}</p>
          </div>

          <div className="flex gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              disabled={!connected}
              aria-label={`${poll.title} bearbeiten`}
              title={connected ? 'Bearbeiten' : 'Erst WhatsApp verbinden'}
              className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onSend}
              disabled={!connected}
              aria-label={`${poll.title} jetzt senden`}
              title={connected ? 'Jetzt testen' : 'Erst WhatsApp verbinden'}
              className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <SendIcon size={16} />
            </button>
            <button
              onClick={onDelete}
              aria-label={`${poll.title} löschen`}
              title="Löschen"
              className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
            >
              <TrashBin size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PollEditorProps {
  draft: WhatsappPollRequest
  groups: WhatsappGroup[]
  saving: boolean
  onSave: (request: WhatsappPollRequest) => void
  onClose: () => void
}

function PollEditor({ draft, groups, saving, onSave, onClose }: PollEditorProps) {
  const [form, setForm] = useState<WhatsappPollRequest>(draft)

  const set = <K extends keyof WhatsappPollRequest>(key: K, value: WhatsappPollRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const setGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    setForm(prev => ({ ...prev, groupId, groupName: group?.name ?? null }))
  }

  const setOption = (index: number, value: string) => {
    const next = [...form.options]
    next[index] = value
    set('options', next)
  }

  const addOption = () => set('options', [...form.options, ''])
  const removeOption = (index: number) => set('options', form.options.filter((_, i) => i !== index))

  const canSave = form.title.trim() !== '' && form.groupId !== '' && form.options.filter(o => o.trim() !== '').length >= 2

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
        onClick={() => onSave({ ...form, options: form.options.map(o => o.trim()).filter(Boolean) })}
        disabled={saving || !canSave}
        className="px-4 py-2 text-sm font-semibold text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving ? 'Speichern…' : 'Speichern'}
      </button>
    </div>
  )

  return (
    <ResponsiveSheet open onClose={onClose} title="Umfrage" maxWidth="md" footer={footer}>
      <div className="p-5 space-y-5">
        <div>
          <label className={labelCls}>Titel</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="z.B. Wer kommt zum Training?"
            className={inputCls}
            autoFocus
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Wochentag</label>
            <select value={form.weekday} onChange={e => set('weekday', e.target.value as Weekday)} className={inputCls}>
              {WEEKDAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Uhrzeit</label>
            <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + ' mb-0'}>Antwortoptionen</label>
            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900 cursor-pointer"
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
                  placeholder={`Option ${i + 1}`}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={form.options.length <= 2}
                  aria-label="Option entfernen"
                  title="Entfernen"
                  className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <XMark size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => set('enabled', e.target.checked)}
            className="accent-navy-700 w-4 h-4 cursor-pointer"
          />
          <span className="text-sm font-semibold text-navy-800">Aktiv (wird automatisch verschickt)</span>
        </label>
      </div>
    </ResponsiveSheet>
  )
}
