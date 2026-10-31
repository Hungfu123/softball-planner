import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayBoard } from './PlayBoard'
import { beschreibung } from './beschreibung'
import type { Play } from './board/types'
import type { Treffer } from './suche'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { CopyIcon, TrashBin } from '@/icons'
import { useRolle } from '@/hooks/useRolle'
import { LAGE_TEXT } from './lage'

/** Woher der Treffer kommt — ein Wort, damit die Zeile einzeilig bleibt. */
const FELD_TEXT: Record<Exclude<Treffer['feld'], 'titel'>, string> = {
  kategorie: 'Kategorie:',
  lage: 'Lage:',
  notiz: 'Notiz:',
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
  werkzeuge = true,
  onDuplicate,
  onDelete,
}: {
  play: Play
  /** Fundstelle der Suche — steht statt der Ausgangslage, wenn sie woanders liegt. */
  treffer?: Treffer | null
  /**
   * Kopieren und Loeschen daneben.
   *
   * Im Kapitel stehen sie NICHT: dort liest man. Zwei Werkzeugknoepfe je Zeile nahmen
   * dem Titel die Breite („Grounder zum SS — wer…"), und der Trainer verwaltet seine
   * Plays in der vollen Liste, wo auch Suche und „Neues Play" sind.
   */
  werkzeuge?: boolean
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { istAdmin, istSuperadmin } = useRolle()
  const [loeschen, setLoeschen] = useState(false)
  const lage = LAGE_TEXT[play.gameState]

  return (
    <div className="group flex items-center gap-3 border-b border-cream-200 px-4 py-2.5">
      {/*
        Die Vorschau bekommt eine Kante.

        Sie ist navy, und im Dunkelmodus ist die Seite das auch — ohne Rand schwebten die
        Punkte frei in der Zeile, und das Bild hoerte auf, ein Bild zu sein. Im Hellen
        aendert der Hauch nichts, dort trennt schon die Farbe.
      */}
      <Link
        to={`/orga/playmaker/${play.id}`}
        className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-line"
      >
        {play.steps[0] ? (
          <PlayBoard markers={play.steps[0].markers} steps={play.steps} width={64} height={48} interactive={false} />
        ) : (
          <div className="h-full w-full bg-cream-200" />
        )}
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
          /*
           * Keine Punkte je Play: sie standen hier kurz und widersprachen dem Kapitel.
           * Base-Coverage trägt einen Punkt, und fast jedes Play darin zeigte drei. Zwei
           * Maßstäbe mit demselben Zeichen sind schlechter als einer — die Stufe gehört
           * dem Kapitel, drinnen sind alle Plays von derselben Art.
           */
          <div className="mt-0.5 truncate text-xs tabular-nums text-gray-500">{beschreibung(play)}</div>
        )}
      </Link>
      {lage && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-navy-800 px-2.5 py-1 font-display text-[10px] font-bold text-cream-50">
          {lage}
        </span>
      )}
      {istAdmin && werkzeuge && <div className="actions-reveal flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-navy-800 hover:text-white"
          aria-label="Play duplizieren"
        >
          <CopyIcon size={16} />
        </button>
        {/* Loeschen nur fuer den Superadmin: ein Play ist Lernstoff, kein Arbeitsstand,
            und die Start-Plays kommen aus einer Migration. Das Backend haelt dieselbe
            Regel (`PlayController.delete`) — der versteckte Knopf allein waere keine. */}
        {istSuperadmin && <button
          type="button"
          onClick={() => setLoeschen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-softball-red-600 hover:text-white"
          aria-label="Play löschen"
        >
          <TrashBin size={16} />
        </button>}
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
