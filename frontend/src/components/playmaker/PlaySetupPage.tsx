import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlays } from '@/hooks/usePlays'
import * as api from '@/api/plays'
import { PlayBoard } from './PlayBoard'
import { BASES, DEFAULT_DEFENSE, HOME, POSITIONS } from './board/geometry'
import type { GameState, PlayMarkers, PlayStep } from './board/types'
import { Button } from '@/components/shared/Button'

const LAGEN: { value: GameState; label: string }[] = [
  { value: 'ANY', label: 'Jede Lage' },
  { value: 'CLOSE_LATE', label: 'Knapp, spätes Inning' },
  { value: 'AHEAD', label: 'Klar vorn' },
  { value: 'BEHIND', label: 'Hinten' },
]

/** Nur die drei Bases, an denen ein Runner stehen kann. Home ist der Batter. */
const RUNNER_BASES = [
  { id: 'r1', label: '1', point: BASES[1] },
  { id: 'r2', label: '2', point: BASES[2] },
  { id: 'r3', label: '3', point: BASES[3] },
]

/**
 * Ein neues Play anlegen.
 *
 * Die Ausgangslage ist kein Formular: man tippt die Base an, auf der ein Runner stehen
 * soll. Leere Bases zeigen einen gestrichelten Ring als Einladung. Das Ergebnis ist ein
 * Play mit genau einem Stand — die Ausgangslage IST der erste Stand.
 */
export default function PlaySetupPage() {
  const { categories, addCategory } = usePlays()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [gameState, setGameState] = useState<GameState>('ANY')
  const [gameStateNote, setGameStateNote] = useState('')
  const [runnerIds, setRunnerIds] = useState<string[]>([])
  const [outs, setOuts] = useState(0)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const aktiveKategorie = categoryId ?? categories[0]?.id ?? null

  const markers: PlayMarkers = {
    defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
    runners: RUNNER_BASES.filter(b => runnerIds.includes(b.id)).map(b => ({
      id: b.id,
      x: b.point.x,
      y: b.point.y,
      status: 'ACTIVE' as const,
    })),
    ball: { state: 'AT_BAT', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' },
  }

  const ersterStand: Omit<PlayStep, 'id'> = {
    ordinal: 1,
    durationMs: 1200,
    note: 'Ausgangslage',
    outs,
    markers,
  }

  const toggleRunner = (id: string) =>
    setRunnerIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const anlegen = async () => {
    if (!title.trim() || !aktiveKategorie) {
      setFehler('Titel und Kategorie fehlen.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    try {
      const play = await api.createPlay({
        title: title.trim(),
        categoryId: aktiveKategorie,
        gameState,
        gameStateNote: gameState === 'ANY' ? null : gameStateNote.trim() || null,
        counterpartPlayId: null,
        steps: [ersterStand],
      })
      navigate(`/orga/playmaker/${play.id}/bearbeiten`, { replace: true })
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Das Play konnte nicht angelegt werden.')
      setSpeichert(false)
    }
  }

  const neueKategorie = async () => {
    const name = window.prompt('Name der neuen Kategorie')
    if (!name?.trim()) return
    try {
      const kategorie = await addCategory(name.trim())
      setCategoryId(kategorie.id)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Kategorie konnte nicht angelegt werden.')
    }
  }

  return (
    <div className="pb-10">
      <h1 className="px-4 pt-4 font-headline text-2xl font-extrabold uppercase tracking-wide text-navy-900">
        Neues Play
      </h1>

      <div className="space-y-4 px-4 pt-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel, z. B. Single ins RF, Runner auf 2"
          className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm text-navy-900 cursor-pencil"
          aria-label="Titel"
        />

        <div className="flex gap-2">
          <select
            value={aktiveKategorie ?? ''}
            onChange={e => setCategoryId(Number(e.target.value))}
            className="flex-1 rounded-xl border border-cream-300 bg-white px-4 py-3 font-display text-sm font-bold text-navy-900"
            aria-label="Kategorie"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={neueKategorie}>
            Neue
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {LAGEN.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => setGameState(l.value)}
              className={`rounded-full px-3 py-2 font-display text-xs font-bold ${
                gameState === l.value ? 'bg-navy-800 text-cream-50' : 'bg-cream-200 text-gray-900'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Erscheint erst, wenn die Lage vom Normalfall abweicht — sonst kostet der
            Normalfall Nachdenken, das er nicht wert ist. */}
        {gameState !== 'ANY' && (
          <input
            value={gameStateNote}
            onChange={e => setGameStateNote(e.target.value)}
            placeholder="Warum? In einem Satz"
            className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm text-navy-900"
            aria-label="Grund für die Spiellage"
          />
        )}
      </div>

      <p className="px-4 pb-2 pt-5 font-display text-[11px] font-bold uppercase tracking-widest text-gray-400">
        Ausgangslage — Base antippen
      </p>
      <div className="relative h-56">
        <PlayBoard markers={markers} mode="full" width={390} height={224} />
        <div className="absolute inset-0 grid grid-cols-3">
          {RUNNER_BASES.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => toggleRunner(b.id)}
              className="h-full w-full"
              aria-label={`Runner auf ${b.label}`}
              aria-pressed={runnerIds.includes(b.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-4">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-gray-400">Outs</span>
        <div className="flex gap-2">
          {[0, 1, 2].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setOuts(n)}
              className={`h-11 w-11 rounded-xl font-display text-sm font-bold ${
                outs === n ? 'bg-navy-800 text-cream-50' : 'border border-cream-300 bg-white text-navy-900'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {fehler && <p className="px-4 pt-3 text-sm text-softball-red-600">{fehler}</p>}

      <div className="px-4 pt-5">
        <Button className="w-full" onClick={anlegen} disabled={speichert}>
          {speichert ? 'Wird angelegt …' : 'Play bauen'}
        </Button>
      </div>

      <p className="px-4 pt-3 text-xs text-gray-400">
        Home ist {HOME.x === 155 ? 'unten' : 'gesetzt'} — von dort fängt jedes Play an.
      </p>
    </div>
  )
}
