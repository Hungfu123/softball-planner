import { useState } from 'react'
import { useInvitations } from '@/hooks/useInvitations'
import { useToastContext } from '@/components/layout/Layout'
import { PlusCircle, Pencil, TrashBin, CrossBones, ExportDoc, ArrowsSwap } from '@/icons'
import { EmptyState, ConfirmModal } from '@/components/shared'
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
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-extrabold text-navy-900 uppercase tracking-wide">
          Einladungen {invitations.length > 0 && <span className="text-navy-500 font-bold">({invitations.length})</span>}
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle size={16} /> Neu
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-navy-400 italic py-8">Lädt…</p>
      ) : invitations.length === 0 ? (
        <EmptyState
          title="Noch keine Einladungen"
          description="Leg eine neue Heimspiel-Einladung an."
          icon={<CrossBones size={48} />}
        />
      ) : (
        <div className="space-y-2">
          {invitations.map(inv => (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-cream-300 rounded-xl group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-navy-900 font-semibold truncate">{inv.title || 'Ohne Titel'}</p>
                {inv.eventDate && (
                  <p className="text-xs text-navy-500">{deDate(inv.eventDate)}</p>
                )}
              </div>
              <div className="actions-reveal flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(inv)}
                  aria-label={`${inv.title} bearbeiten`}
                  title="Bearbeiten"
                  className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDuplicate(inv.id)}
                  aria-label={`${inv.title} duplizieren`}
                  title="Duplizieren"
                  className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                >
                  <ArrowsSwap size={16} />
                </button>
                <button
                  onClick={() => handlePdf(inv)}
                  aria-label={`${inv.title} als PDF`}
                  title="PDF generieren"
                  className="p-2 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
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
