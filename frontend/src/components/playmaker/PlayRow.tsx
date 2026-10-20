import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayBoard } from './PlayBoard'
import { beschreibung } from './beschreibung'
import type { Play } from './board/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { TrashBin } from '@/icons'

const LAGE_TEXT: Record<Play['gameState'], string | null> = {
  ANY: null,
  CLOSE_LATE: 'Knapp',
  AHEAD: 'Vorn',
  BEHIND: 'Hinten',
}

/**
 * Eine Zeile der Uebersicht.
 *
 * Die Vorschau ist der erste Stand des Plays, kein Symbol — am Zaun erkennt man die
 * Situation, bevor man tippt. Die Spiellage erscheint als einzige Pille, und nur wenn sie
 * vom Normalfall abweicht.
 */
export function PlayRow({
  play,
  onDuplicate,
  onDelete,
}: {
  play: Play
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [loeschen, setLoeschen] = useState(false)
  const lage = LAGE_TEXT[play.gameState]

  return (
    <div className="group flex items-center gap-3 border-b border-cream-200 px-4 py-2.5">
      <Link to={`/orga/playmaker/${play.id}`} className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
        <PlayBoard markers={play.steps[0].markers} steps={play.steps} width={64} height={48} />
      </Link>
      <Link to={`/orga/playmaker/${play.id}`} className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-extrabold text-navy-900">{play.title}</div>
        <div className="mt-0.5 text-xs tabular-nums text-gray-500">{beschreibung(play)}</div>
      </Link>
      {lage && (
        <span className="rounded-full bg-navy-800 px-2.5 py-1 font-display text-[10px] font-bold text-cream-50">
          {lage}
        </span>
      )}
      <div className="actions-reveal flex items-center gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-navy-800 hover:text-white"
          aria-label="Play duplizieren"
        >
          <span className="font-display text-xs font-bold">Kopie</span>
        </button>
        <button
          type="button"
          onClick={() => setLoeschen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-softball-red-600 hover:text-white"
          aria-label="Play löschen"
        >
          <TrashBin size={16} />
        </button>
      </div>

      {loeschen && (
        <ConfirmModal
          title="Play löschen?"
          message={`„${play.title}" wird mit allen Ständen entfernt.`}
          onConfirm={() => {
            setLoeschen(false)
            onDelete()
          }}
          onCancel={() => setLoeschen(false)}
        />
      )}
    </div>
  )
}
