import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePlays } from '@/hooks/usePlays'
import { PlayBoard } from './PlayBoard'
import { PlayRow } from './PlayRow'
import type { Play } from './board/types'
import { beschreibung } from './beschreibung'
import { trefferIn, type Treffer } from './suche'
import { standardfeld } from '@/hooks/useFreiesFeld'
import { ChevronDown, CopyIcon, CrossBones, TrashBin } from '@/icons'
import { Button } from '@/components/shared/Button'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { useToastContext } from '@/components/layout/Layout'
import { useRolle } from '@/hooks/useRolle'

/**
 * Einstieg in den Playmaker.
 *
 * Oben das zuletzt bearbeitete Play gross als Feld — man landet auf dem Ding selbst, nicht
 * auf einer Filterleiste. Darunter ein Auswahlfeld fuer die Kategorie (eine Flaeche statt
 * einer Reihe Pillen, vertraegt beliebig viele) und die Liste als ruhige Zeilen.
 */
export default function PlaymakerOverview() {
  const { plays, categories, loading, error, duplicate, remove } = usePlays()
  /*
   * Die Kategorie steht in der Adresse, nicht nur im Zustand.
   *
   * Damit laesst sie sich verlinken — die Playmaker-Kachel auf der Startseite fuehrt so
   * direkt in eine Kategorie statt immer auf dieselbe ungefilterte Liste. Nebenbei
   * ueberlebt die Auswahl den Zurueck-Pfeil und laesst sich weitergeben.
   *
   * `replace`: das Umstellen eines Filters ist kein Schritt, den man zurueckgehen will.
   */
  const [params, setParams] = useSearchParams()
  const ausAdresse = Number(params.get('kategorie'))
  const categoryId: number | 'alle' = Number.isFinite(ausAdresse) && ausAdresse > 0 ? ausAdresse : 'alle'
  const setCategoryId = (wert: number | 'alle') => {
    const neu = new URLSearchParams(params)
    if (wert === 'alle') neu.delete('kategorie')
    else neu.set('kategorie', String(wert))
    setParams(neu, { replace: true })
  }
  const [suche, setSuche] = useState('')
  const [zugeklappt, setZugeklappt] = useState<Set<number>>(leseZugeklappt)
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
  const { istAdmin } = useRolle()

  /**
   * Kopieren und Loeschen sagen, was passiert ist.
   *
   * Vorher liefen beide ins Leere: das Ergebnis des Kopierens steht ganz oben in der
   * Liste, man scrollt aber gerade in der Mitte — es sah aus, als waere nichts passiert.
   * Und ein gescheitertes Loeschen war still: die Zeile blieb stehen, ohne Grund. Der
   * Fehler wurde nicht einmal abgefangen.
   */
  const klappe = (id: number) => {
    setZugeklappt(vorher => {
      const neu = new Set(vorher)
      if (neu.has(id)) neu.delete(id)
      else neu.add(id)
      schreibeZugeklappt(neu)
      return neu
    })
  }

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
    // Hier zaehlt die GANZE Kategorie, nicht die Liste ohne das Hero-Play: sonst sagt die
    // Auswahl oben "Base-Coverage · 11" und die Ueberschrift darunter 10. Das Hero ist
    // eine Hervorhebung, kein Ersatz fuer seine Zeile — es steht zusaetzlich gross oben.
    return categories
      .map(kategorie => ({
        kategorie,
        plays: nachKategorie.filter(p => p.categoryId === kategorie.id),
      }))
      .filter(g => g.plays.length > 0)
  }, [categories, nachKategorie, sucht, categoryId])

  /** Sind alle Bloecke zu? Dann ist die Seite ein Inhaltsverzeichnis und das Feld darf kleiner sein. */
  const allesZu = Boolean(gruppen && gruppen.length > 0 && gruppen.every(g => zugeklappt.has(g.kategorie.id)))
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
    <div className={allesZu ? 'pb-2' : 'pb-8'}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <h1 className="flex-1 font-headline text-2xl font-extrabold uppercase tracking-wide text-navy-900">
          Playmaker
        </h1>
        {istAdmin && <Button onClick={() => navigate('/orga/playmaker/neu')}>Neues Play</Button>}
      </div>

      {/* Das freie Feld steht ueber allem anderen: in der Pause will man es mit einem
          Tipp haben, nicht nach dem Scrollen durch einundfuenfzig Plays. Es legt nichts
          an — deshalb keine Kachel neben den Plays, sondern eine Zeile mit eigener Kante. */}
      <Link
        to="/orga/playmaker/frei"
        className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-dashed border-cream-400 bg-white p-3 hover:bg-navy-800 hover:text-white"
      >
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
          <PlayBoard markers={standardfeld()} mode="full" width={64} height={48} interactive={false} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm font-extrabold">Freies Feld</div>
          <div className="truncate text-xs opacity-70">Schnell was zeigen — wird nicht gespeichert</div>
        </div>
      </Link>

      {plays.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <CrossBones size={48} className="text-gray-300" />
          <p className="text-sm text-gray-500">Noch kein Play gebaut.</p>
          {istAdmin && <Button onClick={() => navigate('/orga/playmaker/neu')}>Erstes Play anlegen</Button>}
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
              kompakt={allesZu}
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

          <div className="flex items-stretch gap-2 px-4 pt-4">
            <label className="block min-w-0 flex-1">
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

            {/* Alles zu: dann sind die acht Ueberschriften das Inhaltsverzeichnis, das
                bei einundfuenfzig Plays sonst fehlt. Erscheint nur, wenn es ueberhaupt
                etwas zu klappen gibt. */}
            {gruppen && gruppen.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const neu = allesZu ? new Set<number>() : new Set(gruppen.map(g => g.kategorie.id))
                  schreibeZugeklappt(neu)
                  setZugeklappt(neu)
                }}
                className="shrink-0 rounded-xl border border-cream-300 bg-white px-3 font-display text-xs font-bold text-navy-900 hover:bg-navy-800 hover:text-white"
              >
                {allesZu ? 'Alle auf' : 'Alle zu'}
              </button>
            )}
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
              gruppen.map(({ kategorie, plays: inGruppe }) => {
                const offen = !zugeklappt.has(kategorie.id)
                return (
                  <section key={kategorie.id}>
                    {/* top-28: unter der Navigation UND unter der klebenden Suchzeile. */}
                    <h2 className="sticky top-28 z-10 bg-cream-100/95 backdrop-blur">
                      <button
                        type="button"
                        onClick={() => klappe(kategorie.id)}
                        aria-expanded={offen}
                        className="flex h-11 w-full items-center gap-2 px-4 text-left font-display text-[11px] font-bold uppercase tracking-widest text-gray-500"
                      >
                        {/* Das Zeichen dreht sich, statt zu wechseln — eine Bewegung
                            sagt, dass es dieselbe Sache in zwei Zustaenden ist. */}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-150 ${offen ? '' : '-rotate-90'}`}
                        />
                        <span className="flex-1 truncate">{kategorie.name}</span>
                        <span className="tabular-nums">{inGruppe.length}</span>
                      </button>
                    </h2>
                    {offen &&
                      inGruppe.map(play => (
                        <PlayRow
                          key={play.id}
                          play={play}
                          onDuplicate={() => kopieren(play)}
                          onDelete={() => loeschen(play)}
                        />
                      ))}
                  </section>
                )
              })
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

/**
 * Welche Kategorien zugeklappt sind, bleibt auf DIESEM Geraet gemerkt.
 *
 * Es ist eine Bequemlichkeit, kein Inhalt: am Tablet im Dugout will man andere Bloecke
 * offen haben als am Rechner zu Hause, und niemand soll das fuer andere entscheiden.
 * Deshalb localStorage und nicht der Server — und deshalb traegt ein leerer oder
 * blockierter Speicher nichts weiter als "alles offen".
 */
const SPEICHER = 'playmaker-zugeklappt'

function leseZugeklappt(): Set<number> {
  try {
    const roh = localStorage.getItem(SPEICHER)
    if (!roh) return new Set()
    const ids: unknown = JSON.parse(roh)
    return Array.isArray(ids) ? new Set(ids.filter((x): x is number => typeof x === 'number')) : new Set()
  } catch {
    return new Set()
  }
}

function schreibeZugeklappt(ids: Set<number>) {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify([...ids]))
  } catch {
    // Privates Fenster oder gesperrter Speicher: dann merkt es sich eben nichts.
  }
}

/** Das zuletzt bearbeitete Play, gross, mit Verlauf und Meta-Zeile darueber. */
function HeroPlay({
  play,
  treffer,
  kompakt,
  onDuplicate,
  onDelete,
}: {
  play: Play
  treffer: Treffer | null
  /** Alles zugeklappt: dann schrumpft das Feld, damit die Uebersicht auf einen Blick passt. */
  kompakt: boolean
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { istAdmin } = useRolle()
  const [loeschenOffen, setLoeschenOffen] = useState(false)

  return (
    <div className="relative">
      {/* EIN Link ueber Feld und Beschriftung. Vorher waren es zwei, und der zweite
          enthielt nur den absolut gesetzten Titel — ein Anker ohne eigene Hoehe, den
          kein Browser als Flaeche anbietet. */}
      <Link to={`/orga/playmaker/${play.id}`} className="block">
        {/*
          Zugeklappt kein Feld, sondern eine Zeile.

          Ein flach gedruecktes Feld waere hier nutzlos: das Board zieht den Ausschnitt auf
          das Seitenverhaeltnis der Flaeche, und bei 112 px Hoehe auf 390 px Breite liegt
          die Raute als Streifen in der Mitte — man erkennt nichts. Wenn die Seite ein
          Inhaltsverzeichnis ist, gehoert das zuletzt bearbeitete Play auch nur als Zeile
          hinein.
        */}
        <div className={kompakt ? 'h-0 overflow-hidden' : 'h-64 sm:h-80'}>
          {play.steps[0] ? (
            <PlayBoard markers={play.steps[0].markers} steps={play.steps} />
          ) : (
            <div className="h-full w-full bg-cream-200" />
          )}
        </div>
        <div
          className={
            kompakt
              ? 'bg-navy-900 px-4 py-2.5 pr-28'
              : 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-transparent px-4 pb-3 pt-6'
          }
        >
          <div
            className={`truncate font-headline font-extrabold uppercase tracking-wide text-cream-50 ${
              kompakt ? 'text-base' : 'text-xl'
            }`}
          >
            {play.title}
          </div>
          <div className="truncate font-display text-xs font-bold text-cream-200">
            {treffer && treffer.feld !== 'titel'
              ? treffer.text
              : `${beschreibung(play)}${treffer ? '' : ' · zuletzt bearbeitet'}`}
          </div>
        </div>
      </Link>

      {/* Kopieren und Loeschen gibt es auch hier. Vorher war ausgerechnet das zuletzt
          bearbeitete Play das einzige, das man aus der Uebersicht weder kopieren noch
          loeschen konnte — man musste es erst wegfiltern. */}
      {istAdmin && <div className={`absolute right-2 z-10 flex gap-1 ${kompakt ? 'inset-y-0 items-center' : 'top-2'}`}>
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
      </div>}

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
