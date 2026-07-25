import { type FocusEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWhatsappPoll } from '@/hooks/useWhatsappPoll'
import { getWhatsappQr } from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'
import { Card, Badge, ConfirmModal, EmptyState, ResponsiveSheet, LoadingSkeleton, Button } from '@/components/shared'
import { PlusCircle, Pencil, TrashBin, CrossBones, SendIcon, XMark, CheckCircle, CalendarIcon, DotsVertical } from '@/icons'
import type { WhatsappPollResponse, WhatsappPollRequest, WhatsappGroup, Weekday, WhatsappAccountStatus, TrainingResponse } from '@/types'
import { coupledSendDate, type TrainingLite } from './pollSchedule'

const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 'MONDAY', label: 'Montag', short: 'Mo' },
  { value: 'TUESDAY', label: 'Dienstag', short: 'Di' },
  { value: 'WEDNESDAY', label: 'Mittwoch', short: 'Mi' },
  { value: 'THURSDAY', label: 'Donnerstag', short: 'Do' },
  { value: 'FRIDAY', label: 'Freitag', short: 'Fr' },
  { value: 'SATURDAY', label: 'Samstag', short: 'Sa' },
  { value: 'SUNDAY', label: 'Sonntag', short: 'So' },
]

const weekdayShort = (w: Weekday | null) => (w ? WEEKDAYS.find(d => d.value === w)?.short ?? w : '')

const JS_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}

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

function isSentToday(iso: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// Liste chronologisch: Mo→So, dann nach Uhrzeit (stabile Wochen-Reihenfolge).
// null (einmalige/trainingsgekoppelte Polls ohne festen Wochentag) sortiert ans Ende.
const WEEKDAY_ORDER: Record<Weekday, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
}
function byWeekdayTime(a: WhatsappPollResponse, b: WhatsappPollResponse): number {
  const wa = a.weekday ? WEEKDAY_ORDER[a.weekday] : 7
  const wb = b.weekday ? WEEKDAY_ORDER[b.weekday] : 7
  const w = wa - wb
  return w !== 0 ? w : a.time.localeCompare(b.time)
}

function formatNextSend(poll: WhatsappPollResponse, trainings: TrainingLite[]): string {
  if (poll.trainingCoupled) {
    if (!poll.enabled) return 'Pausiert'
    if (!poll.weekday) return 'Kein Trainingstag'
    const d = coupledSendDate(poll.weekday, formatTime(poll.time), trainings, poll.skipDates, new Date())
    if (!d) return 'Pausiert — kein Training'
    return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }
  // Einmalig
  if (poll.lastSentAt) return 'Gesendet'
  if (!poll.sendDate) return 'Kein Datum'
  const d = new Date(poll.sendDate + 'T' + formatTime(poll.time))
  return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

function blankDraft(groups: WhatsappGroup[]): WhatsappPollRequest {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  return {
    groupId: groups[0]?.id ?? '',
    groupName: groups[0]?.name ?? null,
    title: '',
    options: ['Ja', 'Nein', 'Vielleicht'],
    weekday: null,
    time: '18:00',
    enabled: true,
    allowMultipleAnswers: false,
    message: null,
    trainingCoupled: false,
    sendDate: iso,
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
    trainingCoupled: p.trainingCoupled,
    sendDate: p.sendDate,
    enabled: p.enabled,
    allowMultipleAnswers: p.allowMultipleAnswers,
    message: p.message,
  }
}

type EditorState =
  | { mode: 'create'; draft: WhatsappPollRequest }
  | { mode: 'edit'; id: number; draft: WhatsappPollRequest }
  | null

export function WhatsappPollPage() {
  const {
    polls, status, groups, trainings, loading, error, reload,
    createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate, resetSent,
  } = useWhatsappPoll()
  const toast = useToastContext()

  const [qr, setQr] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [sendId, setSendId] = useState<number | null>(null)

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

  const handlePickSkip = async (id: number, date: string) => {
    if (!date) return
    try {
      await addSkipDate(id, date)
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

  const handleResetSent = async (id: number) => {
    try {
      await resetSent(id)
      toast.show('Sende-Sperre zurückgesetzt — sendet heute wieder')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handleTogglePause = async (poll: WhatsappPollResponse) => {
    try {
      await updatePoll(poll.id, { ...toRequest(poll), enabled: !poll.enabled })
      toast.show(poll.enabled ? 'Umfrage pausiert' : 'Umfrage fortgesetzt')
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
        <Button
          type="button"
          variant="primary"
          onClick={openCreate}
          disabled={!connected}
          title={connected ? undefined : 'Erst WhatsApp verbinden'}
          icon={<PlusCircle size={16} />}
        >
          Neue Umfrage
        </Button>
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
            {[...polls].sort(byWeekdayTime).map(poll => (
              <PollCard
                key={poll.id}
                poll={poll}
                trainings={trainings}
                connected={connected}
                onPickSkip={date => handlePickSkip(poll.id, date)}
                onRemoveSkip={date => handleRemoveSkip(poll.id, date)}
                onEdit={() => openEdit(poll)}
                onDelete={() => setDeleteId(poll.id)}
                onSend={() => setSendId(poll.id)}
                onResetSent={() => handleResetSent(poll.id)}
                onTogglePause={() => handleTogglePause(poll)}
              />
            ))}
          </div>
        )}
      </div>

      {editor && (
        <PollEditor
          draft={editor.draft}
          groups={groups}
          trainings={trainings}
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
            <p className="text-sm font-semibold text-navy-900">
              Verbunden als {status.name ? status.name : status.number ?? '–'}
            </p>
            <p className="text-xs text-gray-500">{status.name && status.number ? `${status.number} · ` : ''}Umfragen werden automatisch verschickt.</p>
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
  trainings: TrainingLite[]
  connected: boolean
  onPickSkip: (date: string) => void
  onRemoveSkip: (date: string) => void
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
  onResetSent: () => void
  onTogglePause: () => void
}

function PollCard({ poll, trainings, connected, onPickSkip, onRemoveSkip, onEdit, onDelete, onSend, onResetSent, onTogglePause }: PollCardProps) {
  const sentToday = isSentToday(poll.lastSentAt)
  const [showSkip, setShowSkip] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)
  const openPicker = () => {
    try { dateRef.current?.showPicker?.() } catch { /* Browser ohne showPicker: nativer Fallback greift */ }
  }
  const hasPoll = poll.options.length >= 2
  const hasMessage = !!poll.message && poll.message.trim() !== ''
  const isMessageOnly = !hasPoll
  const heading = poll.title || (isMessageOnly ? 'Nachricht' : 'Ohne Titel')
  const typeLabel = !hasPoll ? 'Nachricht' : hasMessage ? 'Umfrage + Nachricht' : 'Umfrage'

  return (
    <div className="group relative overflow-hidden bg-cream-50 border border-cream-300 rounded-2xl shadow-sm hover:shadow-md hover:border-navy-300 transition-all">
      <span className="absolute inset-y-0 left-0 w-1 bg-navy-800" />
      <div className="pl-4 pr-3 py-3.5">

        {/* Kopf: Titel + Bearbeiten/Löschen */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 min-w-0 font-display text-lg font-extrabold uppercase tracking-wide text-navy-900 leading-snug">{heading}</h3>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Aktionen"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
            >
              <DotsVertical size={18} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-cream-300 bg-white shadow-lg py-1">
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onEdit() }}
                    disabled={!connected}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <Pencil size={15} /> Bearbeiten
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onSend() }}
                    disabled={!connected}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <SendIcon size={15} /> Jetzt testen
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); setShowSkip(s => !s) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer"
                  >
                    <CalendarIcon size={15} /> Absage-Termine{poll.skipDates.length > 0 ? ` (${poll.skipDates.length})` : ''}
                  </button>
                  {poll.trainingCoupled && (
                    <button
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); onTogglePause() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer"
                    >
                      <CalendarIcon size={15} /> {poll.enabled ? 'Pausieren' : 'Fortsetzen'}
                    </button>
                  )}
                  <div className="my-1 border-t border-cream-200" />
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onDelete() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                  >
                    <TrashBin size={15} /> Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meta: Zeit · Gruppe · Status */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 font-display font-bold tabular-nums text-white bg-navy-900 rounded-md px-2 py-0.5">
            {poll.trainingCoupled
              ? `${weekdayShort(poll.weekday)} · ${formatTime(poll.time)}`
              : (poll.sendDate ? `${formatDate(poll.sendDate)} · ${formatTime(poll.time)}` : formatTime(poll.time))}
          </span>
          {poll.groupName && <span className="font-body text-navy-500 truncate max-w-[10rem]">{poll.groupName}</span>}
          <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">{poll.trainingCoupled ? 'Training' : 'Einmalig'}</span>
          {poll.trainingCoupled && <Badge color={poll.enabled ? 'emerald' : 'gray'} size="sm">{poll.enabled ? 'Aktiv' : 'Pausiert'}</Badge>}
          {!poll.trainingCoupled && poll.lastSentAt && <Badge color="gray" size="sm">Gesendet</Badge>}
          <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">{typeLabel}</span>
          {hasPoll && poll.allowMultipleAnswers && <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">Mehrfach</span>}
        </div>

        {/* Nächster Versand — Kern-Info */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy-400">{poll.trainingCoupled ? 'Nächster Versand' : (poll.lastSentAt ? 'Status' : 'Geplant')}</p>
            <p className={`font-display text-lg font-bold leading-none mt-0.5 ${poll.enabled ? 'text-navy-800' : 'text-gray-400'}`}>{formatNextSend(poll, trainings)}</p>
          </div>
          {poll.options.length > 0 && (
            <div className="text-right shrink-0 max-w-[55%]">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy-400">Antworten</p>
              <div className="flex flex-wrap justify-end gap-1 mt-0.5">
                {poll.options.slice(0, 3).map((o, i) => (
                  <span key={i} className="font-body text-[11px] font-semibold text-navy-700 bg-cream-100 border border-cream-300 rounded-md px-1.5 py-0.5 max-w-[8rem] truncate">{o}</span>
                ))}
                {poll.options.length > 3 && (
                  <span className="font-body text-[11px] font-semibold text-navy-500 px-1 py-0.5">+{poll.options.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {poll.message && (
          <p className="mt-2 font-body text-xs text-gray-500 italic line-clamp-2">„{poll.message}"</p>
        )}

        {/* Meta-Fuß + Aktionen */}
        <div className="mt-3 border-t border-cream-200 pt-2.5">
          <p className="font-body text-[11px] text-gray-400">
            {formatLastSent(poll.lastSentAt)}
            {sentToday && (
              <>
                {' · '}<span className="font-semibold text-navy-600">heute gesendet</span>{' · '}
                <button type="button" onClick={onResetSent} className="font-semibold text-navy-600 underline decoration-dotted underline-offset-2 hover:text-navy-800 cursor-pointer">erneut ermöglichen</button>
              </>
            )}
          </p>

          {poll.skipDates.length > 0 && (
            <p className="mt-1 font-body text-[11px] text-softball-red-600">
              Absage: {[...poll.skipDates].sort().slice(0, 2).map(formatDate).join(', ')}{poll.skipDates.length > 2 ? ` +${poll.skipDates.length - 2}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Absage-Termine in eigenem Sheet (über das ⋮-Menü geöffnet) — hält die Card kompakt */}
      <ResponsiveSheet open={showSkip} onClose={() => setShowSkip(false)} title="Absage-Termine" maxWidth="sm">
        <div className="p-5 space-y-3">
          <p className="font-body text-sm text-gray-500">An diesen Tagen wird <span className="font-semibold text-navy-700">nicht</span> gesendet — z.B. wenn ein Training ausfällt.</p>
          {poll.skipDates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[...poll.skipDates].sort().map(date => (
                <span key={date} className="inline-flex items-center gap-1 font-body text-sm font-semibold text-softball-red-700 bg-softball-red-50 border border-softball-red-100 rounded-md pl-2 pr-1 py-1">
                  {formatDate(date)}
                  <button type="button" onClick={() => onRemoveSkip(date)} aria-label={`${formatDate(date)} entfernen`} className="p-0.5 rounded hover:bg-softball-red-100 cursor-pointer">
                    <XMark size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-gray-400">Noch keine Absage-Termine.</p>
          )}
          <input
            ref={dateRef}
            type="date"
            onChange={e => { const v = e.target.value; e.target.value = ''; if (v) onPickSkip(v) }}
            aria-hidden="true"
            tabIndex={-1}
            className="sr-only"
          />
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-navy-700 bg-white border border-navy-200 rounded-lg px-3 py-2 hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer"
          >
            <PlusCircle size={14} /> Termin wählen
          </button>
        </div>
      </ResponsiveSheet>
    </div>
  )
}

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
  const canSave = form.groupId !== '' && (withPoll ? pollValid : messageFilled)

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
            checked={form.trainingCoupled}
            onChange={e => {
              const on = e.target.checked
              setForm(prev => {
                if (on && !prev.weekday) {
                  // beim Anschalten sinnvollen Trainingstag vorbelegen (frühestes kommendes Training)
                  const now = new Date()
                  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                  const upcoming = [...trainings]
                    .filter(t => !t.cancelled && t.date >= todayIso)
                    .sort((a, b) => a.date.localeCompare(b.date))[0]
                  const wd = upcoming ? JS_TO_WEEKDAY[new Date(upcoming.date + 'T00:00:00').getDay()] : 'MONDAY'
                  return { ...prev, trainingCoupled: true, weekday: wd }
                }
                return { ...prev, trainingCoupled: on }
              })
            }}
            className="accent-navy-700 w-4 h-4 mt-0.5 cursor-pointer"
          />
          <span>
            <span className="block text-sm font-semibold text-navy-800">Trainingsumfrage</span>
            <span className="block text-xs text-gray-500">An den Trainingstag gekoppelt: sendet automatisch 1 Tag vor jedem Training und bucht die Anwesenheit. Aus = einmalig zu einem festen Zeitpunkt.</span>
          </span>
        </label>

        {form.trainingCoupled ? (
          <div className="grid grid-cols-2 gap-3">
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
  if (form.trainingCoupled) {
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
