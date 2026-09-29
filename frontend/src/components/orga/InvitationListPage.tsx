import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInvitations } from '@/hooks/useInvitations'
import { useToastContext } from '@/components/layout/Layout'
import { PlusCircle, Pencil, TrashBin, CrossBones, ExportDoc, ArrowsSwap } from '@/icons'
import { EmptyState, ConfirmModal, LoadingSkeleton, Button } from '@/components/shared'
import { InvitationEditor } from './InvitationEditor'
import { generateInvitationPdf } from '@/utils/invitationPdf'
import type { InvitationRequest, InvitationResponse } from '@/types'

const DEFAULT_BODY = `Anfahrt:
Das Turnier findet auf dem Gelände der Heinrich-Heine-Universität Düsseldorf statt. Am Besten parkt ihr auf dem Park & Ride Parkplatz an der Haltestelle Düsseldorf Südpark. Von da aus geht ihr an dem beschrankten Bahnübergang vorbei, den Fußweg an den Bahngleisen entlang. Ihr kommt dann "ins Grüne" und geht bei der ersten Möglichkeit rechts. Dann nur noch durch die Tür im Zaun und schon seid ihr auf unserem Platz.

Für das leibliche Wohl ist wie immer gesorgt.`

const blankDraft: InvitationRequest = {
  title: '', letterDate: new Date().toISOString().slice(0, 10), eventDate: null,
  venue: '', pairingMode: 'HEIM_GAST', guestTeams: ['', '', ''],
  games: [], contacts: [{ role: 'Trainer', name: '', email: '', phone: '' }, { role: 'Obfrau', name: '', email: '', phone: '' }],
  bodyText: DEFAULT_BODY,
}

function toRequest(inv: InvitationResponse): InvitationRequest {
  return {
    title: inv.title,
    letterDate: inv.letterDate,
    eventDate: inv.eventDate,
    venue: inv.venue,
    pairingMode: inv.pairingMode,
    bodyText: inv.bodyText,
    guestTeams: [...inv.guestTeams],
    games: inv.games.map(g => ({ ...g })),
    contacts: inv.contacts.map(c => ({ ...c })),
  }
}

function deDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type EditorState =
  | { mode: 'create'; draft: InvitationRequest }
  | { mode: 'edit'; id: number; draft: InvitationRequest }
  | null

export function InvitationListPage() {
  const { invitations, loading, create, update, duplicate, remove } = useInvitations()
  const toast = useToastContext()
  const [editor, setEditor] = useState<EditorState>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const openCreate = () => setEditor({ mode: 'create', draft: { ...blankDraft } })
  const openEdit = (inv: InvitationResponse) => setEditor({ mode: 'edit', id: inv.id, draft: toRequest(inv) })

  const handleSave = async (request: InvitationRequest) => {
    if (!editor) return
    setSaving(true)
    try {
      if (editor.mode === 'edit') {
        await update(editor.id, request)
        toast.show('Einladung aktualisiert')
      } else {
        await create(request)
        toast.show('Einladung erstellt')
      }
      setEditor(null)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await duplicate(id)
      toast.show('Einladung dupliziert')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const handlePdf = async (inv: InvitationResponse) => {
    try {
      await generateInvitationPdf(inv)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    const id = deleteId
    setDeleteId(null)
    try {
      await remove(id)
      toast.show('Einladung gelöscht')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4 space-y-4">
      <Link to="/orga" className="inline-flex items-center gap-1 text-gray-500 text-sm hover:text-navy-700 hover:underline py-1.5">← Zurück zur Orga</Link>
      <div className="flex items-baseline justify-between">
        <h1 className="font-headline text-3xl font-extrabold text-navy-900 uppercase tracking-wide">
          Einladungen {invitations.length > 0 && <span className="text-navy-500 font-bold">({invitations.length})</span>}
        </h1>
        <Button type="button" variant="primary" onClick={openCreate} icon={<PlusCircle size={16} />}>
          Neu
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="list" />
      ) : invitations.length === 0 ? (
        <EmptyState
          title="Noch keine Einladungen"
          description="Leg eine neue Heimspiel-Einladung an."
          icon={<CrossBones size={48} />}
        />
      ) : (
        <div className="space-y-3">
          {invitations.map(inv => (
            <div
              key={inv.id}
              className="relative overflow-hidden bg-white border border-cream-300 rounded-xl shadow-sm hover:shadow-md hover:border-navy-300 transition-all"
            >
              {/* Akzent-Kante links (Softball-Red) */}
              <span className="absolute inset-y-0 left-0 w-1 bg-softball-red-600" />
              <div className="pl-4 pr-2.5 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-base font-extrabold text-navy-900 leading-tight truncate">
                      {inv.title || 'Ohne Titel'}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      {inv.eventDate && (
                        <span className="inline-flex items-center gap-1 font-bold tabular-nums text-white bg-navy-900 rounded-full px-2 py-0.5">
                          {deDate(inv.eventDate)}
                        </span>
                      )}
                      {inv.venue && <span className="text-navy-500 truncate max-w-[12rem]">{inv.venue}</span>}
                      <span className="font-bold uppercase tracking-wider text-[10px] text-navy-600 bg-cream-200 rounded-full px-2 py-0.5">
                        {inv.pairingMode === 'TEAM_1_2' ? 'Team 1/2' : 'Heim/Gast'}
                      </span>
                      {inv.games.length > 0 && (
                        <span className="text-navy-400 tabular-nums">{inv.games.length} Spiele</span>
                      )}
                    </div>
                    {inv.guestTeams.filter(Boolean).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {inv.guestTeams.filter(Boolean).map((t, i) => (
                          <span key={i} className="text-[11px] font-semibold text-navy-700 bg-cream-100 border border-cream-300 rounded-md px-1.5 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={() => openEdit(inv)}
                      aria-label={`${inv.title} bearbeiten`}
                      title="Bearbeiten"
                      className="p-2.5 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(inv.id)}
                      aria-label={`${inv.title} duplizieren`}
                      title="Duplizieren"
                      className="p-2.5 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                    >
                      <ArrowsSwap size={16} />
                    </button>
                    <button
                      onClick={() => handlePdf(inv)}
                      aria-label={`${inv.title} als PDF`}
                      title="PDF generieren"
                      className="p-2 rounded-lg text-softball-red-600 hover:text-white hover:bg-softball-red-600 cursor-pointer"
                    >
                      <ExportDoc size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteId(inv.id)}
                      aria-label={`${inv.title} löschen`}
                      title="Löschen"
                      className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
                    >
                      <TrashBin size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <InvitationEditor
          invitation={editor.draft}
          onSave={handleSave}
          onClose={() => setEditor(null)}
          saving={saving}
        />
      )}

      {deleteId != null && (
        <ConfirmModal
          title="Einladung löschen"
          message={`${invitations.find(i => i.id === deleteId)?.title ?? 'Einladung'} wirklich löschen?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
