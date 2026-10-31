import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePlays } from '@/hooks/usePlays'
import { PlayBoard } from './PlayBoard'
import { PlayRow } from './PlayRow'
import type { Play } from './board/types'
import { trefferIn, type Treffer } from './suche'
import { standardfeld } from '@/hooks/useFreiesFeld'
import { ChevronDown, ChevronLeft, CrossBones } from '@/icons'
import { Button } from '@/components/shared/Button'
import { useToastContext } from '@/components/layout/Layout'
import { useRolle } from '@/hooks/useRolle'
import { StufePunkte } from '@/components/shared/StufePunkte'
import { kategorieSatz, kategorieStufe } from './kategorieTexte'
import { mitwirkende } from './board/beteiligte'
import { POSITIONS } from './board/geometry'
import type { PositionCode } from './board/types'

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
  /*
   * Die eigene Position. Wer sie einmal gewaehlt hat, hat sie naechste Woche noch —
   * ein Shortstop bleibt einer, und ihn bei jedem Besuch wieder zu fragen waere eine
   * Frage ohne neue Antwort. Im localStorage, weil es eine Bequemlichkeit je Geraet ist
   * und keine Auskunft, die jemand anderes braucht.
   */
  const [position, setPosition] = useState<PositionCode | null>(lesePosition)
  const merkePosition = (pos: PositionCode | null) => {
    setPosition(pos)
    try {
      if (pos) localStorage.setItem(POSITION_SPEICHER, pos)
      else localStorage.removeItem(POSITION_SPEICHER)
    } catch {
      /* Privates Fenster: dann merkt es sich eben nichts. */
    }
  }
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

  /*
   * Kein Hero mehr, also auch kein „alles ausser dem ersten": die Liste zeigt, was da
   * ist. Frueher nahm das grosse Feld oben das erste Play heraus und `rest` war der
   * Rest; seit es weg ist, waere das ein stillschweigend verschlucktes Play.
   */
  const rest = useMemo(() => (sucht ? [] : nachKategorie), [sucht, nachKategorie])
  const restTreffer = sucht ? gefunden : []

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
    /*
     * Innerhalb einer Kategorie steht die Reihenfolge FEST, nach id.
     *
     * Die Liste kommt nach „zuletzt geändert" herein — für das große Feld oben ist das
     * richtig, für ein Kapitel nicht: nach jeder Korrektur sprang „Play 3 von 9" auf eine
     * andere Stelle, und wer jemandem sagt „schau dir Play 2 an", meint morgen ein anderes.
     */
    return categories
      .map(kategorie => ({
        kategorie,
        plays: nachKategorie.filter(p => p.categoryId === kategorie.id).sort((a, b) => a.id - b.id),
      }))
      .filter(g => g.plays.length > 0)
  }, [categories, nachKategorie, sucht, categoryId])

  /** Sind alle Bloecke zu? Dann ist die Seite ein Inhaltsverzeichnis und das Feld darf kleiner sein. */
  const allesZu = Boolean(gruppen && gruppen.length > 0 && gruppen.every(g => zugeklappt.has(g.kategorie.id)))
  const kategorieName =
    categoryId === 'alle' ? 'Alle Kategorien' : (categories.find(c => c.id === categoryId)?.name ?? '')
  /* Steht eine Kategorie in der Adresse, ist die Seite ein Kapitel (siehe unten). */
  const kapitel = categoryId === 'alle' ? null : (categories.find(c => c.id === categoryId) ?? null)

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

  /*
   * Eine gewaehlte Kategorie ist ein KAPITEL, kein Werkzeugkasten.
   *
   * Wer aus dem Spielwissen auf „Spielsituationen" tippt, bekam bisher die ganze
   * Werkbank: grosses Feld vom zuletzt bearbeiteten Play, die Zeile „Freies Feld", ein
   * Auswahlfeld fuer die Kategorie, in der er schon ist, und ein Suchfeld. Alles davon
   * hilft beim Bauen und nichts beim Lernen.
   *
   * Hier steht deshalb nur: wo bin ich, worum geht es, und die Plays — jedes mit seiner
   * Stufe. Die Werkbank bleibt, sie liegt eine Zeile weiter unten („Alle Kategorien").
   */
  if (kapitel) {
    const alleImKapitel = plays.filter(p => p.categoryId === kapitel.id).sort((a, b) => a.id - b.id)
    /*
     * „Zeig mir die Plays, in denen MEIN Platz etwas tut."
     *
     * Mitwirken heisst hier mehr als den Ball anfassen: wer hinter die Base laeuft, lernt
     * genau dort seinen Weg. Die Wahl liegt im localStorage, weil eine Position nichts
     * ist, was man je Besuch neu entscheidet — und sie steht in der Adresse nicht drin,
     * damit ein geteilter Link allen dasselbe zeigt.
     */
    const imKapitel = position
      ? alleImKapitel.filter(p => mitwirkende(p.steps).includes(position))
      : alleImKapitel
    return (
      <div className="pb-8">
        <div className="px-4 pb-3 pt-4">
          <Link
            to="/spielwissen"
            className="font-display inline-flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted active:text-ink-strong"
          >
            ‹ Spielwissen
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-2xl font-extrabold uppercase tracking-wide text-ink-strong">
              {kapitel.name}
            </h1>
            <StufePunkte stufe={kategorieStufe(kapitel.sortOrder)} />
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{kategorieSatz(kapitel.name)}</p>
          {/*
            Keine Legende hier.

            Sie stand zwei Zeilen lang unter dem Kopf, als jedes Play noch eigene Punkte
            hatte. Jetzt gibt es im Kapitel genau EINE Punktgruppe — die neben dem Namen —
            und zwei Zeilen Erklaerung fuer drei Punkte sind mehr Text als Auskunft. Wer
            sie braucht, hat sie im Spielwissen eine Seite vorher gesehen.
          */}

          {/*
            Ein festes Raster, keine fliessende Zeile.

            Der gewaehlte Knopf ist gefuellt und dadurch minimal breiter; in einer
            fliessenden Zeile rutschte deshalb bei jeder Wahl die ganze Reihe um — mal
            stand SS unten, mal oben. Neun Positionen und „Alle" passen in zwei Reihen zu
            fuenf, und die stehen still.

            Noch einmal auf dieselbe Position tippt sie wieder weg: ein Filter, den man
            nur ueber einen zweiten Knopf loswird, fuehlt sich an wie eine Falle.
          */}
          <div className="mt-3">
            <span className="font-display text-[11px] font-bold uppercase tracking-widest text-ink-faint">
              Deine Position
            </span>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {([null, ...POSITIONS] as (PositionCode | null)[]).map(pos => {
                const aktiv = position === pos
                return (
                  <button
                    key={pos ?? 'alle'}
                    type="button"
                    onClick={() => merkePosition(aktiv ? null : pos)}
                    aria-pressed={aktiv}
                    className={`font-display flex min-h-11 items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-widest ${
                      aktiv
                        ? 'bg-accent text-accent-ink'
                        : 'border border-line text-ink-muted active:bg-surface-raised'
                    }`}
                  >
                    {pos ?? 'Alle'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-line">
          {imKapitel.map(play => (
            <PlayRow
              key={play.id}
              play={play}
              werkzeuge={false}
              onDuplicate={() => kopieren(play)}
              onDelete={() => loeschen(play)}
            />
          ))}
          {/* Ein leeres Kapitel ist keine Sackgasse: es sagt, warum, und bietet den Weg
              zurück zu allen an. */}
          {imKapitel.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              In diesem Kapitel tut der {position} nichts.{' '}
              <button
                type="button"
                onClick={() => merkePosition(null)}
                className="font-display font-bold text-ink-strong underline"
              >
                Alle zeigen
              </button>
            </p>
          )}
        </div>

        {/*
          Zurueck zu den KATEGORIEN, nicht zu allen Plays.

          „Alle Kategorien" zeigte die ungefilterte Liste aus einundfuenfzig Plays — genau
          die Ueberfuellung, gegen die das Kapitel gebaut ist. Wer hier unten ankommt, will
          das naechste Kapitel, und das steht im Spielwissen mit Stufen daneben.

          Der Trainer bekommt zusaetzlich den Weg in seine Werkbank: dort liegen Suche,
          freies Feld und „Neues Play".
        */}
        <div className="flex flex-col gap-2 px-4 pt-4">
          <Link
            to="/spielwissen"
            className="font-display flex min-h-11 items-center justify-center rounded-xl border border-dashed border-line px-4 text-[11px] font-bold uppercase tracking-widest text-ink-muted active:bg-surface-raised"
          >
            Andere Kategorie
          </Link>
          {istAdmin && (
            <button
              type="button"
              onClick={() => setCategoryId('alle')}
              className="font-display min-h-11 text-[11px] font-bold uppercase tracking-widest text-ink-faint active:text-ink-strong"
            >
              Alle Plays
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={allesZu ? 'pb-2' : 'pb-8'}>
      {/*
        Zwei Namen, eine Seite. Spieler kommen ueber den Reiter Spielwissen her, und dort
        heisst die Haelfte Defense; sie sollen unter dem Begriff ankommen, unter dem sie
        gesucht haben. Der Name Playmaker bleibt darueber stehen, weil die Trainer die
        Seite so kennen und die Kacheln unter Orga und auf der Startseite so heissen.
        Kein Query-Parameter, keine zweite Fassung: beide Woerter stehen einfach da.
      */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          {/*
            Beim Spieler ist die Zeile der Rueckweg, beim Trainer der Name der Seite.
            Grund: die Seite liegt unter /orga, und genau diesen Reiter hat ein Spieler
            nicht. Er kam aus Spielwissen und stand nach einem Tipp sonst ohne Weg zurueck.
          */}
          {istAdmin ? (
            <div className="font-display text-[11px] font-bold uppercase tracking-widest text-gray-500">
              Playmaker
            </div>
          ) : (
            <Link
              to="/spielwissen"
              className="font-display inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-navy-900"
            >
              <ChevronLeft size={12} aria-hidden="true" />
              Spielwissen
            </Link>
          )}
          <h1 className="font-headline text-2xl font-extrabold uppercase tracking-wide text-navy-900">
            Defense
          </h1>
        </div>
        {istAdmin && <Button onClick={() => navigate('/orga/playmaker/neu')}>Neues Play</Button>}
      </div>

      {/*
        Das freie Feld steht über allem anderen: in der Pause will man es mit einem Tipp
        haben, nicht nach dem Scrollen durch einundfünfzig Plays. Es legt nichts an —
        deshalb keine Kachel neben den Plays, sondern eine Zeile mit eigener Kante.
        **Nur für Trainer:** es ist eine Tafel zum Zeigen, kein Lernstoff. Wer die Seite
        aufmacht, um etwas nachzusehen, braucht sie nicht als erste Zeile.
      */}
      {istAdmin && <Link
        to="/orga/playmaker/frei"
        className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-dashed border-cream-400 bg-white p-3 hover:bg-navy-800 hover:text-white"
      >
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg">
          <PlayBoard markers={standardfeld()} mode="full" width={64} height={48} interactive={false} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm font-extrabold">Freies Feld</div>
          {/* Kurz genug, dass bei 393 px nichts abgeschnitten wird: der Satz endete
              vorher auf „wird nicht gespei…". */}
          <div className="truncate text-xs opacity-70">Zum Zeigen. Wird nicht gespeichert.</div>
        </div>
      </Link>}

      {plays.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <CrossBones size={48} className="text-gray-300" />
          <p className="text-sm text-gray-500">Noch kein Play gebaut.</p>
          {istAdmin && <Button onClick={() => navigate('/orga/playmaker/neu')}>Erstes Play anlegen</Button>}
        </div>
      ) : (
        <>
          {/*
            Das grosse Feld ist weg.

            Es zeigte das zuletzt bearbeitete Play, 256 px hoch, vor der eigentlichen
            Liste. Als die Seite eine Werkbank war, war das der Einstieg; seit sie ein
            Inhaltsverzeichnis mit Kapiteln ist, steht es vor dem, was man sucht — und
            „zuletzt bearbeitet" ist ohnehin eine Auskunft ueber die Arbeit des Trainers,
            nicht ueber Softball. Wer sucht, sieht die Treffer jetzt direkt als Zeilen.
          */}
          {sucht && gefunden.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
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
          {istAdmin && <div className="sticky top-14 z-20 bg-cream-100/95 px-4 pb-2 pt-2 backdrop-blur">
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
          </div>}

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

const POSITION_SPEICHER = 'playmaker-position'

/** Die gemerkte Position, falls es eine gibt und der Speicher sie hergibt. */
function lesePosition(): PositionCode | null {
  try {
    const wert = localStorage.getItem(POSITION_SPEICHER)
    return wert && (POSITIONS as readonly string[]).includes(wert) ? (wert as PositionCode) : null
  } catch {
    return null
  }
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

