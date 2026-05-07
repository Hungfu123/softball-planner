import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSpielbogenList } from '@/hooks/useSpielbogenList'
import { Button, EmptyState, LoadingSkeleton, ConfirmModal } from '@/components/shared'
import { CrossBones, PlusCircle, TrashBin, Pencil } from '@/icons'
import type { SpielbogenResponse, BogenStatus } from '@/types'
import { BogenMetaEditModal } from './BogenMetaEditModal'

const STATUS_LABEL: Record<BogenStatus, string> = {
  DRAFT: 'Entwurf',
  LIVE: 'Live',
  DONE: 'Abgeschlossen',
}

const STATUS_PILL: Record<BogenStatus, string> = {
  DRAFT: 'bg-cream-200 text-gray-700',
  LIVE: 'bg-softball-red-100 text-softball-red-700',
  DONE: 'bg-emerald-100 text-emerald-700',
}

export default function SpielbogenList() {
  const { items, loading, remove, update } = useSpielbogenList()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editBogen, setEditBogen] = useState<SpielbogenResponse | null>(null)

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase text-navy-900">Spielbogen</h1>
        <Link to="/spielbogen/new">
          <Button variant="primary" icon={<PlusCircle size={16} />}>Neuer Spielbogen</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CrossBones />}
          title="Noch kein Spielbogen"
          description="Lege jetzt einen Spielbogen für ein Liga-Spiel an."
        />
      ) : (
        <div className="space-y-2">
          {items.map(b => (
            <BogenTile key={b.id} bogen={b} onDelete={() => setDeleteId(b.id)} onEdit={() => setEditBogen(b)} />
          ))}
        </div>
      )}

      {deleteId != null && (
        <ConfirmModal
          title="Spielbogen löschen?"
          message="Alle Lineup-Slots werden mitgelöscht. Aktion nicht umkehrbar."
          confirmLabel="Löschen"
          onConfirm={() => {
            remove(deleteId).then(() => setDeleteId(null))
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {editBogen && (
        <BogenMetaEditModal
          open={editBogen != null}
          onClose={() => setEditBogen(null)}
          meta={editBogen}
          onSubmit={async (req) => {
            await update(editBogen.id, req)
          }}
        />
      )}
    </div>
  )
}

function BogenTile({ bogen, onDelete, onEdit }: { bogen: SpielbogenResponse; onDelete: () => void; onEdit: () => void }) {
  const date = new Date(bogen.date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const score = bogen.status === 'DONE' ? `${bogen.homeRuns}:${bogen.awayRuns}` : null

  return (
    <div className="group bg-cream-50 border border-cream-300 rounded-xl p-3 hover:border-navy-400 hover:bg-white transition-colors">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/spielbogen/${bogen.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-display text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[bogen.status]}`}>
              {STATUS_LABEL[bogen.status]}
            </span>
            <span className="font-display text-sm tracking-wide text-gray-600">{date}</span>
            {bogen.location && <span className="font-body text-xs text-gray-500">· {bogen.location}</span>}
          </div>
          <div className="font-display text-lg font-extrabold text-navy-900 truncate">
            {bogen.homeTeamName} <span className="text-gray-400 font-normal">vs</span> {bogen.awayTeamName}
            {score && <span className="ml-2 text-softball-red-600">{score}</span>}
          </div>
          {bogen.leagueResultId != null && (
            <div className="font-body text-[11px] text-emerald-700 mt-0.5">Liga-Tabelle: registriert ✓</div>
          )}
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
          className="actions-reveal p-1.5 text-gray-400 hover:text-navy-700 cursor-pointer rounded"
          aria-label="Bearbeiten"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
          className="actions-reveal p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer rounded"
          aria-label="Löschen"
        >
          <TrashBin size={16} />
        </button>
      </div>
    </div>
  )
}
