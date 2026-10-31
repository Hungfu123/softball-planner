import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import * as api from '@/api/plays'
import type { GameState, Play, PlayCategory } from './board/types'

const LAGEN: { value: GameState; label: string }[] = [
  { value: 'ANY', label: 'Jede Situation' },
  { value: 'CLOSE_LATE', label: 'Knapp, spätes Inning' },
  { value: 'AHEAD', label: 'Klar vorn' },
  { value: 'BEHIND', label: 'Hinten' },
]

export interface Stammdaten {
  title: string
  categoryId: number
  gameState: GameState
  gameStateNote: string | null
  counterpartPlayId: number | null
}

/**
 * Titel, Kategorie, Spiellage und Gegenstueck nachtraeglich aendern.
 *
 * Das ging vorher gar nicht: der Editor schickte diese Felder beim Sichern unveraendert
 * mit, aenderbar waren sie nur im Anlege-Dialog. Ein Play hiess damit fuer immer so, wie
 * es beim ersten Wurf hiess, und ein Play in der falschen Kategorie blieb dort — obwohl
 * das Backend es laengst konnte.
 *
 * Dieselben Felder wie beim Anlegen, in derselben Reihenfolge. Wer etwas zweimal an
 * verschiedenen Stellen anders bedient, lernt es zweimal.
 */
export function PlayDetailsSheet({
  play,
  onSpeichern,
  onClose,
}: {
  play: Play
  onSpeichern: (stamm: Stammdaten) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(play.title)
  const [categoryId, setCategoryId] = useState(play.categoryId)
  const [gameState, setGameState] = useState<GameState>(play.gameState)
  const [gameStateNote, setGameStateNote] = useState(play.gameStateNote ?? '')
  const [counterpartId, setCounterpartId] = useState<number | null>(play.counterpartPlayId)
  const [categories, setCategories] = useState<PlayCategory[]>([])
  const [plays, setPlays] = useState<Play[]>([])
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let abgebrochen = false
    Promise.all([api.getPlayCategories(), api.getPlays()])
      .then(([c, p]) => {
        if (abgebrochen) return
        setCategories(c)
        setPlays(p)
      })
      .catch(() => {
        // Ohne Netz bleiben die Listen leer; Titel und Lage lassen sich trotzdem aendern.
      })
    return () => {
      abgebrochen = true
    }
  }, [])

  const sichern = async () => {
    if (!title.trim()) {
      setFehler('Das Play braucht einen Titel.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    try {
      await onSpeichern({
        title: title.trim(),
        categoryId,
        gameState,
        gameStateNote: gameState === 'ANY' ? null : gameStateNote.trim() || null,
        counterpartPlayId: gameState === 'ANY' ? null : counterpartId,
      })
      onClose()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.')
      setSpeichert(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-dvh w-full max-w-md overflow-y-auto rounded-t-2xl bg-cream-50 p-5 sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-headline text-xl font-extrabold uppercase tracking-wide text-navy-900">Play ändern</h2>

        <label className="mt-4 block">
          <span className="font-display text-[11px] font-bold uppercase tracking-widest text-gray-400">Titel</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            aria-label="Titel"
            className="mt-1 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm text-navy-900 cursor-pencil"
          />
        </label>

        <label className="mt-3 block">
          <span className="font-display text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Kategorie
          </span>
          <select
            value={categoryId}
            onChange={e => {
              setCategoryId(Number(e.target.value))
              // Gegenstuecke werden nach Kategorie angeboten; die alte Wahl passt nicht mehr.
              setCounterpartId(null)
            }}
            aria-label="Kategorie"
            className="mt-1 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 font-display text-sm font-bold text-navy-900"
          >
            {categories.length === 0 && <option value={categoryId}>Wird geladen …</option>}
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {LAGEN.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => {
                setGameState(l.value)
                if (l.value === 'ANY') setCounterpartId(null)
              }}
              className={`flex h-11 items-center rounded-full px-3.5 font-display text-xs font-bold ${
                gameState === l.value ? 'bg-navy-800 text-cream-50' : 'bg-cream-200 text-gray-900'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {gameState !== 'ANY' && (
          <>
            <input
              value={gameStateNote}
              onChange={e => setGameStateNote(e.target.value)}
              placeholder="Warum? In einem Satz"
              aria-label="Begründung"
              className="mt-3 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm text-navy-900 cursor-pencil"
            />
            <select
              value={counterpartId ?? ''}
              onChange={e => setCounterpartId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Gegenstück"
              className="mt-3 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 font-display text-sm font-bold text-navy-900"
            >
              <option value="">Kein Gegenstück</option>
              {plays
                .filter(p => p.categoryId === categoryId && p.id !== play.id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </>
        )}

        {fehler && (
          <p role="alert" className="mt-3 text-xs font-bold text-softball-red-600">
            {fehler}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-cream-300 bg-white font-display text-sm font-bold text-navy-900 hover:bg-navy-800 hover:text-white"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={sichern}
            disabled={speichert || !title.trim()}
            className="h-11 flex-1 rounded-xl bg-navy-800 font-display text-sm font-bold text-cream-50 disabled:opacity-40"
          >
            {speichert ? 'Sichert …' : 'Übernehmen'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
