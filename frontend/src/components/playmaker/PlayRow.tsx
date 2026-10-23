import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayBoard } from './PlayBoard'
import { beschreibung } from './beschreibung'
import type { Play } from './board/types'
import type { Treffer } from './suche'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { CopyIcon, TrashBin } from '@/icons'
import { useRolle } from '@/hooks/useRolle'

/** Woher der Treffer kommt — ein Wort, damit die Zeile einzeilig bleibt. */
const FELD_TEXT: Record<Exclude<Treffer['feld'], 'titel'>, string> = {
  kategorie: 'Kategorie:',
  lage: 'Lage:',
  notiz: 'Notiz:',
}

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
  treffer = null,
  onDuplicate,
  onDelete,
}: {
  play: Play
  /** Fundstelle der Suche — steht statt der Ausgangslage, wenn sie woanders liegt. */
  treffer?: Treffer | null
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { istAdmin } = useRolle()
  const [loeschen, setLoeschen] = useState(false)
  const lage = LAGE_TEXT[play.gameState]

  return (
    <div className="group flex items-center gap-3 border-b border-cream-200 px-4 py-2.5">
      <Link to={`/orga/playmaker/${play.id}`} className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
        <PlayBoard markers={play.steps[0].markers} steps={play.steps} width={64} height={48} interactive={false} />
      </Link>
      <Link to={`/orga/playmaker/${play.id}`} className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-extrabold text-navy-900">{play.title}</div>
        {/* Bei einem Treffer abseits des Titels zeigt die Zeile, WARUM das Play dasteht —
            sonst muesste man es aufmachen, um es zu sehen. */}
        {treffer && treffer.feld !== 'titel' ? (
          <div className="mt-0.5 truncate text-xs text-gray-500">
            <span className="font-display font-bold text-navy-900">{FELD_TEXT[treffer.feld]}</span>{' '}
            {treffer.text}
          </div>
        ) : (
          <div className="mt-0.5 truncate text-xs tabular-nums text-gray-500">{beschreibung(play)}</div>
        )}
      </Link>
      {lage && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-navy-800 px-2.5 py-1 font-display text-[10px] font-bold text-cream-50">
          {lage}
        </span>
      )}
      {istAdmin && <div className="actions-reveal flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-navy-800 hover:text-white"
          aria-label="Play duplizieren"
        >
          <CopyIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setLoeschen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-softball-red-600 hover:text-white"
          aria-label="Play löschen"
        >
          <TrashBin size={16} />
        </button>
      </div>}

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
