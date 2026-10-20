import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePlays } from '@/hooks/usePlays'
import { PlayBoard } from './PlayBoard'
import { PlayRow } from './PlayRow'
import type { Play } from './board/types'
import { beschreibung } from './beschreibung'
import { CrossBones } from '@/icons'
import { Button } from '@/components/shared/Button'

/**
 * Einstieg in den Playmaker.
 *
 * Oben das zuletzt bearbeitete Play gross als Feld — man landet auf dem Ding selbst, nicht
 * auf einer Filterleiste. Darunter ein Auswahlfeld fuer die Kategorie (eine Flaeche statt
 * einer Reihe Pillen, vertraegt beliebig viele) und die Liste als ruhige Zeilen.
 */
export default function PlaymakerOverview() {
  const { plays, categories, loading, error, duplicate, remove } = usePlays()
  const [categoryId, setCategoryId] = useState<number | 'alle'>('alle')
  const navigate = useNavigate()

  const gefiltert = useMemo(
    () => (categoryId === 'alle' ? plays : plays.filter(p => p.categoryId === categoryId)),
    [plays, categoryId],
  )

  const hero = gefiltert[0]
  const rest = gefiltert.slice(1)
  const kategorieName =
    categoryId === 'alle' ? 'Alle Kategorien' : (categories.find(c => c.id === categoryId)?.name ?? '')

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Plays werden geladen …</div>
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">{error}</p>
        <p className="mt-2 text-xs text-gray-400">
          Ohne Netz zeigt der Playmaker nur Plays, die schon einmal geladen wurden.
        </p>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <h1 className="flex-1 font-headline text-2xl font-extrabold uppercase tracking-wide text-navy-900">
          Playmaker
        </h1>
        <Button onClick={() => navigate('/orga/playmaker/neu')}>Neues Play</Button>
      </div>

      {plays.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <CrossBones size={48} className="text-gray-300" />
          <p className="text-sm text-gray-500">Noch kein Play gebaut.</p>
          <Button onClick={() => navigate('/orga/playmaker/neu')}>Erstes Play anlegen</Button>
        </div>
      ) : (
        <>
          {hero && <HeroPlay play={hero} />}

          <div className="px-4 pt-4">
            <label className="block">
              <span className="sr-only">Kategorie</span>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value === 'alle' ? 'alle' : Number(e.target.value))}
                className="w-full rounded-xl border border-cream-300 bg-white px-4 py-3 font-display text-sm font-bold text-navy-900"
                aria-label="Kategorie"
              >
                <option value="alle">Alle Kategorien · {plays.length}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {plays.filter(p => p.categoryId === c.id).length}
                  </option>
                ))}
              </select>
            </label>
            <p className="sr-only">{kategorieName}</p>
          </div>

          <div className="mt-2">
            {rest.map(play => (
              <PlayRow
                key={play.id}
                play={play}
                onDuplicate={() => duplicate(play.id)}
                onDelete={() => remove(play.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Das zuletzt bearbeitete Play, gross, mit Verlauf und Meta-Zeile darueber. */
function HeroPlay({ play }: { play: Play }) {
  return (
    <Link to={`/orga/playmaker/${play.id}`} className="relative block">
      <div className="h-56 sm:h-72">
        <PlayBoard markers={play.steps[0].markers} steps={play.steps} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/85 to-transparent px-4 pb-3 pt-10">
        <div className="font-headline text-xl font-extrabold uppercase tracking-wide text-cream-50">
          {play.title}
        </div>
        <div className="font-display text-xs font-bold tabular-nums text-cream-200">
          {beschreibung(play)} · zuletzt bearbeitet
        </div>
      </div>
    </Link>
  )
}
