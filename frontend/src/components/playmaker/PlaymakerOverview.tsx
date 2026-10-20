import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePlays } from '@/hooks/usePlays'
import { PlayBoard } from './PlayBoard'
import { PlayRow } from './PlayRow'
import type { Play } from './board/types'
import { beschreibung } from './beschreibung'
import { trefferIn, type Treffer } from './suche'
import { CopyIcon, CrossBones, TrashBin } from '@/icons'
import { Button } from '@/components/shared/Button'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { useToastContext } from '@/components/layout/Layout'

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
  const [suche, setSuche] = useState('')
  /**
   * Die Liste haengt an der NACHLAUFENDEN Eingabe, das Eingabefeld an der sofortigen.
   *
   * Beim ersten Buchstaben passen fast alle Plays, und dann zeichnet die Uebersicht
   * neunundvierzig Felder neu: gemessen 111 ms auf dem Rechner, am Handy ein Mehrfaches
   * davon. Das steckt genau zwischen Tastendruck und Buchstabe. Mit useDeferredValue
   * bleibt das Tippen sofort und die Liste kommt nach.
   */
  const gesucht = useDeferredValue(suche)
  const navigate = useNavigate()
  const toast = useToastContext()

  /**
   * Kopieren und Loeschen sagen, was passiert ist.
   *
   * Vorher liefen beide ins Leere: das Ergebnis des Kopierens steht ganz oben in der
   * Liste, man scrollt aber gerade in der Mitte — es sah aus, als waere nichts passiert.
   * Und ein gescheitertes Loeschen war still: die Zeile blieb stehen, ohne Grund. Der
   * Fehler wurde nicht einmal abgefangen.
   */
  const kopieren = async (play: Play) => {
    try {
      const kopie = await duplicate(play.id)
      toast.show(`Kopie von „${play.title}" angelegt`, {
        action: { label: 'Öffnen', onClick: () => navigate(`/orga/playmaker/${kopie.id}/bearbeiten`) },
      })
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Kopie fehlgeschlagen.', 'error')
    }
  }

  const loeschen = async (play: Play) => {
    try {
      await remove(play.id)
      toast.show(`„${play.title}" gelöscht`)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.', 'error')
    }
  }

  const nachKategorie = useMemo(
    () => (categoryId === 'alle' ? plays : plays.filter(p => p.categoryId === categoryId)),
    [plays, categoryId],
  )

  /**
   * Gesucht wird in Titel, Kategorie, Begruendung der Spiellage und JEDER Notiz — auch
   * im siebten Stand. Wer "Foul-Gebiet" eintippt, meint nicht den Titel.
   */
  const sucht = gesucht.trim().length > 0
  const gefunden = useMemo<{ play: Play; treffer: Treffer }[]>(() => {
    if (!sucht) return []
    return nachKategorie
      .map(play => {
        const name = categories.find(c => c.id === play.categoryId)?.name
        const treffer = trefferIn(play, gesucht, name)
        return treffer ? { play, treffer } : null
      })
      .filter((x): x is { play: Play; treffer: Treffer } => x !== null)
  }, [nachKategorie, categories, gesucht, sucht])

  /**
   * Der beste Treffer uebernimmt das Hero-Feld, statt dass es verschwindet.
   *
   * Das ist kein Schmuck, sondern gegen einen Ruckler: das Hero ist 256 px hoch und
   * steht UEBER dem Suchfeld. Liess man es beim ersten Buchstaben weg, sprang das
   * Eingabefeld um genau diese 256 px nach oben — gemessen — und am Handy passiert das
   * in dem Moment, in dem die Tastatur hochkommt und der sichtbare Bereich ohnehin nur
   * noch halb so hoch ist. Man tippt dann auf eine Zeile, die nicht mehr dort ist.
   *
   * Nebenbei ist es die bessere Antwort: man sieht die Situation als Bild, statt sie aus
   * einem Titel zu erraten.
   */
  const hero = sucht ? gefunden[0]?.play : nachKategorie[0]
  const heroTreffer = sucht ? (gefunden[0]?.treffer ?? null) : null
  // Eigenes useMemo, damit die Gruppierung darunter eine stabile Abhaengigkeit hat.
  const rest = useMemo(() => (sucht ? [] : nachKategorie.slice(1)), [sucht, nachKategorie])
  const restTreffer = sucht ? gefunden.slice(1) : []

  /**
   * Ohne Filter wird die Liste nach Kategorie gegliedert.
   *
   * Einundfuenfzig Plays am Stueck sind rund viertausend Pixel — fuenf Bildschirmhoehen
   * am Handy, in denen nichts sagt, wo Base-Coverage aufhoert und Cut-off anfaengt. Mit
   * den Ueberschriften scrollt man gezielt, und der Filter wird zur Abkuerzung statt zur
   * Voraussetzung. Steht ein Filter oder eine Suche, gliedert nichts: dann IST die Liste
   * schon die Antwort.
   */
  const gruppen = useMemo(() => {
    if (sucht || categoryId !== 'alle') return null
    return categories
      .map(kategorie => ({
        kategorie,
        plays: rest.filter(p => p.categoryId === kategorie.id),
      }))
      .filter(g => g.plays.length > 0)
  }, [categories, rest, sucht, categoryId])
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
          {/* Dieselbe Flaeche, was immer darin steht: Hero, bester Treffer oder die
              Auskunft, dass es nichts gibt. Sie liegt UEBER dem Suchfeld — bliebe sie
              mal leer, spraenge das Feld unter dem Finger weg. */}
          {hero ? (
            <HeroPlay
              play={hero}
              treffer={heroTreffer}
              onDuplicate={() => kopieren(hero)}
              onDelete={() => loeschen(hero)}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center sm:h-80">
              <CrossBones size={40} className="text-gray-300" />
              <p className="text-sm text-gray-500">
                Nichts zu „{gesucht.trim()}" — auch nicht in den Notizen.
              </p>
              <button
                type="button"
                onClick={() => setSuche('')}
                className="font-display text-xs font-bold text-navy-900 underline"
              >
                Suche zurücksetzen
              </button>
            </div>
          )}

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

          {/*
            Das Suchfeld bleibt stehen.

            Die ungefilterte Liste ist rund viertausend Pixel hoch; vom letzten Block waren
            es gemessen 3400 px zurueck nach oben, nur um etwas einzutippen. Es kostet 46 px
            unter der Navigation — die Kategorie-Auswahl darf dafuer wegscrollen, denn die
            Suche findet Kategorien ueber ihren Namen ohnehin mit.
          */}
          <div className="sticky top-14 z-20 bg-cream-100/95 px-4 pb-2 pt-2 backdrop-blur">
            {/* type="text" statt "search": das eingebaute Kreuz des Browsers sitzt genau
                dort, wo die Trefferzahl steht, und laesst sich nicht verschieben. Das
                eigene Kreuz hat ausserdem die volle Fingerflaeche. */}
            <div className="relative">
              <input
                value={suche}
                onChange={e => setSuche(e.target.value)}
                type="text"
                inputMode="search"
                placeholder="Suchen — Titel, Notiz, Kategorie"
                aria-label="Plays durchsuchen"
                className="w-full rounded-xl border border-cream-300 bg-white py-3 pl-4 pr-24 text-sm text-navy-900"
              />
              {sucht && (
                <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                  <span className="font-display text-xs font-bold tabular-nums text-gray-400">
                    {gefunden.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSuche('')}
                    aria-label="Suche leeren"
                    className="flex h-11 w-11 items-center justify-center rounded-lg font-display text-lg font-bold text-gray-400 hover:bg-navy-800 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2">
            {sucht ? (
              restTreffer.map(({ play, treffer }) => (
                <PlayRow
                  key={play.id}
                  play={play}
                  treffer={treffer}
                  onDuplicate={() => kopieren(play)}
                  onDelete={() => loeschen(play)}
                />
              ))
            ) : gruppen ? (
              gruppen.map(({ kategorie, plays: inGruppe }) => (
                <section key={kategorie.id}>
                  {/* top-28: unter der Navigation UND unter der klebenden Suchzeile. */}
                  <h2 className="sticky top-28 z-10 bg-cream-100/95 px-4 py-1.5 font-display text-[11px] font-bold uppercase tracking-widest text-gray-500 backdrop-blur">
                    {kategorie.name} · {inGruppe.length}
                  </h2>
                  {inGruppe.map(play => (
                    <PlayRow
                      key={play.id}
                      play={play}
                      onDuplicate={() => kopieren(play)}
                      onDelete={() => loeschen(play)}
                    />
                  ))}
                </section>
              ))
            ) : (
              rest.map(play => (
                <PlayRow
                  key={play.id}
                  play={play}
                  onDuplicate={() => kopieren(play)}
                  onDelete={() => loeschen(play)}
                />
              ))
            )}
          </div>

        </>
      )}
    </div>
  )
}

/** Das zuletzt bearbeitete Play, gross, mit Verlauf und Meta-Zeile darueber. */
function HeroPlay({
  play,
  treffer,
  onDuplicate,
  onDelete,
}: {
  play: Play
  treffer: Treffer | null
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [loeschenOffen, setLoeschenOffen] = useState(false)

  return (
    <div className="relative">
      <Link to={`/orga/playmaker/${play.id}`} className="block">
        <div className="h-64 sm:h-80">
          <PlayBoard markers={play.steps[0].markers} steps={play.steps} />
        </div>
      </Link>

      {/* Kopieren und Loeschen gibt es auch hier. Vorher war ausgerechnet das zuletzt
          bearbeitete Play das einzige, das man aus der Uebersicht weder kopieren noch
          loeschen konnte — man musste es erst wegfiltern. */}
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Play duplizieren"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900/55 text-cream-50 backdrop-blur hover:bg-navy-800"
        >
          <CopyIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setLoeschenOffen(true)}
          aria-label="Play löschen"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900/55 text-cream-50 backdrop-blur hover:bg-softball-red-600"
        >
          <TrashBin size={16} />
        </button>
      </div>

      <Link to={`/orga/playmaker/${play.id}`} className="block">
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-transparent px-4 pb-3 pt-6">
          <div className="font-headline text-xl font-extrabold uppercase tracking-wide text-cream-50">
            {play.title}
          </div>
          <div className="truncate font-display text-xs font-bold text-cream-200">
            {treffer && treffer.feld !== 'titel'
              ? treffer.text
              : `${beschreibung(play)}${treffer ? '' : ' · zuletzt bearbeitet'}`}
          </div>
        </div>
      </Link>

      {loeschenOffen && (
        <ConfirmModal
          title="Play löschen?"
          message={`„${play.title}" wird mit allen Ständen entfernt.`}
          onConfirm={() => {
            setLoeschenOffen(false)
            onDelete()
          }}
          onCancel={() => setLoeschenOffen(false)}
        />
      )}
    </div>
  )
}
