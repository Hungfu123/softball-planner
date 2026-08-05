import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWhatsappPoll } from '@/hooks/useWhatsappPoll'
import { getWhatsappQr, getAllGameDays } from '@/api/client'
import { useToastContext } from '@/components/layout/Layout'
import { Card, Badge, ConfirmModal, EmptyState, ResponsiveSheet, LoadingSkeleton, Button } from '@/components/shared'
import { PlusCircle, Pencil, TrashBin, CrossBones, SendIcon, XMark, CheckCircle, CalendarIcon, DotsVertical } from '@/icons'
import type { WhatsappPollResponse, WhatsappPollRequest, WhatsappGroup, Weekday, WhatsappAccountStatus, GameDayResponse } from '@/types'
import { coupledSendDate, WEEKDAYS, todayIso, tomorrowIso, type TrainingLite } from './pollSchedule'
import { PollEditor } from './PollEditor'

const weekdayShort = (w: Weekday | null) => (w ? WEEKDAYS.find(d => d.value === w)?.short ?? w : '')

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

// Einmalige Polls chronologisch nach Datum (ohne Datum ans Ende), dann Uhrzeit.
function byOneOffDate(a: WhatsappPollResponse, b: WhatsappPollResponse): number {
  const da = a.sendDate ?? '9999-12-31'
  const db = b.sendDate ?? '9999-12-31'
  return da !== db ? da.localeCompare(db) : a.time.localeCompare(b.time)
}

function formatNextSend(poll: WhatsappPollResponse, trainings: TrainingLite[]): string {
  if (poll.mode === 'TRAINING') {
    if (!poll.enabled) return 'Pausiert'
    if (!poll.weekday) return 'Kein Trainingstag'
    const d = coupledSendDate(poll.weekday, formatTime(poll.time), trainings, poll.skipDates, new Date())
    if (!d) return 'Kein Training geplant'
    return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  }
  // Einmalig
  if (poll.lastSentAt) return 'Gesendet'
  if (!poll.sendDate) return 'Kein Datum'
  if (poll.sendDate < todayIso()) return 'Verpasst'
  const d = new Date(poll.sendDate + 'T' + formatTime(poll.time))
  return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
}

function blankDraft(groups: WhatsappGroup[]): WhatsappPollRequest {
  const iso = tomorrowIso()
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
    mode: 'ONE_OFF',
    gameDayId: null,
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
    mode: p.mode,
    gameDayId: p.gameDayId,
    sendDate: p.sendDate,
    enabled: p.enabled,
    allowMultipleAnswers: p.allowMultipleAnswers,
    message: p.message,
  }
}

type EditorState =
  | { mode: 'create'; draft: WhatsappPollRequest; lastSentAt: string | null }
  | { mode: 'edit'; id: number; draft: WhatsappPollRequest; lastSentAt: string | null }
  | null

export function WhatsappPollPage() {
  const {
    polls, status, groups, trainings, loading, error, reload,
    createPoll, updatePoll, deletePoll, sendNow, addSkipDate, removeSkipDate, resetSent,
  } = useWhatsappPoll()
  const toast = useToastContext()

  const [qr, setQr] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [sendId, setSendId] = useState<number | null>(null)
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])

  const connected = status?.connected ?? false

  useEffect(() => {
    getAllGameDays().then(setGameDays).catch(() => {})
  }, [])

  // Solange nicht verbunden: QR alle 20s neu laden (läuft sonst ab) und Status
  // alle 4s pollen, damit die Seite automatisch umschaltet sobald gescannt wurde.
  useEffect(() => {
    if (connected) return
    let cancelled = false
    // Fehler NICHT schlucken — sonst bleibt qr null und die Karte spinnt endlos,
    // ohne dass jemand sieht dass der Abruf selbst scheitert.
    const fetchQr = () => {
      getWhatsappQr()
        .then(r => { if (!cancelled) { setQr(r.qr); setQrError(null) } })
        .catch((e: unknown) => { if (!cancelled) setQrError((e as Error).message) })
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

  const openCreate = () => setEditor({ mode: 'create', draft: blankDraft(groups), lastSentAt: null })
  const openEdit = (p: WhatsappPollResponse) => setEditor({ mode: 'edit', id: p.id, draft: toRequest(p), lastSentAt: p.lastSentAt })

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

      <AccountCard connected={connected} status={status} qr={qr} qrError={qrError} />

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
            description="Leg eine WhatsApp-Umfrage oder Nachricht an — einmalig oder an ein Training gekoppelt."
            icon={<CrossBones size={48} />}
          />
        ) : (
          (() => {
            const renderCard = (poll: WhatsappPollResponse) => (
              <PollCard
                key={poll.id}
                poll={poll}
                trainings={trainings}
                gameDays={gameDays}
                connected={connected}
                onPickSkip={date => handlePickSkip(poll.id, date)}
                onRemoveSkip={date => handleRemoveSkip(poll.id, date)}
                onEdit={() => openEdit(poll)}
                onDelete={() => setDeleteId(poll.id)}
                onSend={() => setSendId(poll.id)}
                onResetSent={() => handleResetSent(poll.id)}
                onTogglePause={() => handleTogglePause(poll)}
              />
            )
            const coupled = polls.filter(p => p.mode === 'TRAINING').sort(byWeekdayTime)
            const gameDayPolls = polls.filter(p => p.mode === 'GAME_DAY').sort(byOneOffDate)
            const oneOff = polls.filter(p => p.mode === 'ONE_OFF').sort(byOneOffDate)
            const headCls = 'font-display text-xs font-extrabold uppercase tracking-widest text-navy-500'
            return (
              <div className="space-y-6">
                {coupled.length > 0 && (
                  <section className="space-y-3">
                    <h3 className={headCls}>Trainingsumfragen <span className="text-navy-400">({coupled.length})</span></h3>
                    {coupled.map(renderCard)}
                  </section>
                )}
                {gameDayPolls.length > 0 && (
                  <section className="space-y-3">
                    <h3 className={headCls}>Spieltag-Umfragen <span className="text-navy-400">({gameDayPolls.length})</span></h3>
                    {gameDayPolls.map(renderCard)}
                  </section>
                )}
                {oneOff.length > 0 && (
                  <section className="space-y-3">
                    <h3 className={headCls}>Einmalig &amp; Nachrichten <span className="text-navy-400">({oneOff.length})</span></h3>
                    {oneOff.map(renderCard)}
                  </section>
                )}
              </div>
            )
          })()
        )}
      </div>

      {editor && (
        <PollEditor
          draft={editor.draft}
          lastSentAt={editor.lastSentAt}
          groups={groups}
          trainings={trainings}
          gameDays={gameDays}
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

      {sendId != null && (() => {
        const sp = polls.find(p => p.id === sendId)
        const oneOff = sp && sp.mode !== 'TRAINING'
        const message = oneOff
          ? `Schickt die Umfrage jetzt zum Testen an die Gruppe. Der geplante Versand${sp?.sendDate ? ` am ${formatDate(sp.sendDate)}` : ''} bleibt bestehen — die Gruppe erhält sie dann ggf. zweimal.`
          : 'Schickt die Umfrage jetzt zum Testen an die Gruppe.'
        return (
          <ConfirmModal
            title="Umfrage jetzt testen"
            message={message}
            confirmLabel="Jetzt testen"
            onConfirm={confirmSend}
            onCancel={() => setSendId(null)}
          />
        )
      })()}
    </div>
  )
}

/**
 * Klartext je Verbindungszustand. Vorher zeigte die Karte bei JEDEM Nicht-verbunden-Fall
 * denselben QR-Platzhalter mit Spinner — auch wenn der Sidecar tot war oder WhatsApp das
 * Gerät entfernt hatte. Dann wartet man beliebig lange auf einen QR, der nie kommt.
 */
function stateInfo(state: WhatsappAccountStatus['state'], lastError: string | null): {
  headline: string
  detail: string
  tone: 'wait' | 'error'
} | null {
  switch (state) {
    case 'UNREACHABLE':
      return {
        headline: 'WhatsApp-Dienst nicht erreichbar',
        detail: lastError
          ? `Der Sidecar antwortet nicht: ${lastError}`
          : 'Der Sidecar antwortet nicht. Läuft der whatsapp-Container?',
        tone: 'error',
      }
    case 'INIT_FAILED':
      return {
        headline: 'Dienst konnte nicht starten',
        detail: lastError ? `${lastError} — Neuversuch läuft automatisch.` : 'Neuversuch läuft automatisch.',
        tone: 'error',
      }
    case 'LOGGED_OUT':
      return {
        headline: 'Von WhatsApp abgemeldet',
        detail: 'Das verknüpfte Gerät wurde entfernt. Die alte Kopplung wurde verworfen, ein neuer QR-Code erscheint automatisch.',
        tone: 'error',
      }
    case 'CONNECTING':
      return { headline: 'Verbindung wird aufgebaut', detail: 'Der QR-Code erscheint in wenigen Sekunden.', tone: 'wait' }
    default:
      return null
  }
}

function AccountCard({ connected, status, qr, qrError }: {
  connected: boolean
  status: WhatsappAccountStatus | null
  qr: string | null
  qrError: string | null
}) {
  const info = qrError
    ? { headline: 'QR-Code nicht abrufbar', detail: qrError, tone: 'error' as const }
    : stateInfo(status?.state ?? null, status?.lastError ?? null)
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
      ) : info?.tone === 'error' ? (
        // Kein QR-Platzhalter: hier gibt es nichts zu scannen, der Grund gehört auf den Tisch.
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-softball-red-100 text-softball-red-700 shrink-0">
            <XMark size={20} />
          </span>
          <div className="space-y-1 max-w-sm">
            <p className="text-sm font-semibold text-softball-red-700">{info.headline}</p>
            <p className="text-xs text-gray-600">{info.detail}</p>
            {status?.lastErrorAt && (
              <p className="text-xs text-gray-400">
                Seit {new Date(status.lastErrorAt).toLocaleString('de-DE', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
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
            <p className="text-sm font-semibold text-navy-900">{info?.headline ?? 'Noch nicht verbunden'}</p>
            <p className="text-xs text-gray-500">
              {info?.detail ?? (
                <>WhatsApp → <span className="font-semibold text-navy-700">Verknüpfte Geräte</span> → <span className="font-semibold text-navy-700">Gerät verknüpfen</span> → QR-Code scannen</>
              )}
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
  gameDays: GameDayResponse[]
  connected: boolean
  onPickSkip: (date: string) => void
  onRemoveSkip: (date: string) => void
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
  onResetSent: () => void
  onTogglePause: () => void
}

function PollCard({ poll, trainings, gameDays, connected, onPickSkip, onRemoveSkip, onEdit, onDelete, onSend, onResetSent, onTogglePause }: PollCardProps) {
  const sentToday = isSentToday(poll.lastSentAt)
  const gameDay = poll.mode === 'GAME_DAY' ? gameDays.find(g => g.id === poll.gameDayId) ?? null : null
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
    <div className="group relative bg-cream-50 border border-cream-300 border-l-4 border-l-navy-800 rounded-2xl shadow-sm hover:shadow-md hover:border-navy-300 hover:border-l-navy-800 transition-all">
      {/* Linker Akzent als Border (nicht overflow-hidden-Span) — sonst würde das ⋮-Menü geklippt. */}
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
                  {poll.mode === 'TRAINING' && (
                    <button
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); setShowSkip(s => !s) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-navy-800 hover:bg-navy-50 cursor-pointer"
                    >
                      <CalendarIcon size={15} /> Absage-Termine{poll.skipDates.length > 0 ? ` (${poll.skipDates.length})` : ''}
                    </button>
                  )}
                  {poll.mode === 'TRAINING' && (
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
            {poll.mode === 'TRAINING'
              ? `${weekdayShort(poll.weekday)} · ${formatTime(poll.time)}`
              : (poll.sendDate ? `${formatDate(poll.sendDate)} · ${formatTime(poll.time)}` : formatTime(poll.time))}
          </span>
          {poll.groupName && <span className="font-body text-navy-500 truncate max-w-[10rem]">{poll.groupName}</span>}
          <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">{poll.mode === 'TRAINING' ? 'Training' : poll.mode === 'GAME_DAY' ? 'Spieltag' : 'Einmalig'}</span>
          {poll.mode === 'TRAINING' && <Badge color={poll.enabled ? 'emerald' : 'gray'} size="sm">{poll.enabled ? 'Aktiv' : 'Pausiert'}</Badge>}
          {poll.mode !== 'TRAINING' && poll.lastSentAt && <Badge color="gray" size="sm">Gesendet</Badge>}
          <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">{typeLabel}</span>
          {hasPoll && poll.allowMultipleAnswers && <span className="font-body text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 rounded-md px-1.5 py-0.5">Mehrfach</span>}
        </div>

        {/* Spieltag-Bezug — nur bei GAME_DAY-Umfragen */}
        {poll.mode === 'GAME_DAY' && (
          <p className="mt-1.5 flex items-center gap-1.5 font-body text-xs text-navy-600">
            <CalendarIcon size={12} className="shrink-0 text-navy-400" />
            {gameDay
              ? `${formatDate(gameDay.date)}${gameDay.label ? ` · ${gameDay.label}` : ''}${gameDay.location ? ` · ${gameDay.location}` : ''}`
              : <span className="text-gray-400 italic">Spieltag nicht mehr vorhanden</span>}
          </p>
        )}

        {/* Nächster Versand — Kern-Info */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy-400">{poll.mode === 'TRAINING' ? 'Nächster Versand' : ((poll.lastSentAt || (poll.sendDate && poll.sendDate < todayIso())) ? 'Status' : 'Geplant')}</p>
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

          {poll.mode === 'TRAINING' && poll.skipDates.length > 0 && (
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
