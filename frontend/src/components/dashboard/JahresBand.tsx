import { useMemo, useState } from 'react'
import type { Termin } from '@/hooks/useTermine'
import { heuteIso } from '@/hooks/useTermine'

const MONATE = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/**
 * Die Saeulen fuellen ihre Spalte ANTEILIG, die Hoehe der Spalte steht am Rahmen.
 *
 * Vorher waren es feste Pixel, und damit war das Band auf jedem Geraet gleich hoch. Am
 * Handy ist die Hoehe aber das knappe Gut: dort steht die Spalte auf 44px (`h-11`), am
 * Schreibtisch auf 52. Prozent statt Pixel macht den Unterschied zu einer einzigen Klasse.
 *
 * `max(3px, …)` haelt einen einzelnen Termin sichtbar — ohne das verschwaende ein Monat
 * mit einem Training gegen einen mit zwanzig auf unter einen Pixel.
 */
const MINDEST_HOEHE = '3px'

/** Anteil der hoechsten Saeule, als CSS-Hoehe. 0 bleibt 0 — kein Balken, kein Mindestmass. */
function saeule(n: number, hoechste: number): string | number {
  return n === 0 ? 0 : `max(${MINDEST_HOEHE}, ${((n / hoechste) * 100).toFixed(1)}%)`
}

/**
 * Das Jahr auf einen Blick: zwoelf Saeulen, eine je Monat.
 *
 * Kein Monatsraster mit Kaestchen — davon passt am Handy eins auf den Schirm, und die
 * Frage ist nicht "welcher Dienstag", sondern "wie voll wird es noch". Die Saeule
 * beantwortet genau das: Spieltage oben, Trainings darunter, Hoehe = Anzahl.
 *
 * Vergangene Monate stehen blass, der laufende und alle kommenden kraeftig. So liest
 * man ohne Beschriftung, was noch VOR einem liegt — die eigentliche Auskunft.
 *
 * Rot fuer Spieltage, Balkenblau fuer Trainings. Das ist hier keine Wertung (die
 * Analyse-Oberflaeche haelt Rot fuer negative Zahlen frei, diese Seite nicht), sondern
 * dieselbe Unterscheidung, die die App ueberall macht: Spieltag ist das Ereignis,
 * Training der Takt dazwischen.
 */
export function JahresBand({ termine, laden, fehler, jahr, eigeneTrainings }: {
  termine: Termin[]
  laden: boolean
  fehler: boolean
  /** Das Jahr, das die Seite gerade zeigt — dasselbe wie im Kopf darueber. */
  jahr: number
  /**
   * Eigene Trainings-Anwesenheit je Monat (1..12). `null`, solange sie niemanden angeht
   * oder noch nicht da ist — dann bleibt das Band der reine Terminplan.
   */
  eigeneTrainings?: Record<string, number> | null
}) {
  /*
   * Der Monatsstrich und die Abblendung gelten nur im LAUFENDEN Jahr. In einem vergangenen
   * ist alles vorbei, in einem kuenftigen nichts — ein „hier stehst du" mitten im Jahr 2024
   * waere schlicht gelogen.
   */
  const heuteJahr = new Date().getFullYear()
  const aktuellerMonat = jahr === heuteJahr ? new Date().getMonth() : jahr < heuteJahr ? 12 : -1

  const monate = useMemo(() => {
    const leer = Array.from({ length: 12 }, () => ({ spieltage: 0, trainings: 0 }))
    for (const t of termine) {
      if (!t.datum.startsWith(String(jahr))) continue
      const m = Number(t.datum.slice(5, 7)) - 1
      if (m < 0 || m > 11) continue
      if (t.art === 'SPIELTAG') leer[m].spieltage++
      else leer[m].trainings++
    }
    return leer
  }, [termine, jahr])

  const hoechste = Math.max(1, ...monate.map(m => m.spieltage + m.trainings))
  /*
   * „noch 3" steht nur bei den Spieltagen. Wie viele Spiele noch kommen, plant man — danach
   * richtet sich ein Wochenende. Wie viele Trainings noch kommen, plant niemand: sie laufen
   * im Takt weiter, und die Zahl waere eine Verabredung mit dem Kalender, keine Auskunft.
   */
  const offeneSpieltage = termine.filter(
    t => t.art === 'SPIELTAG' && t.datum >= heuteIso() && t.datum.startsWith(String(jahr)),
  ).length
  const spieltageGesamt = monate.reduce((n, m) => n + m.spieltage, 0)
  const trainingsGesamt = monate.reduce((n, m) => n + m.trainings, 0)
  const eigene = eigeneTrainings ?? null
  const eigeneGesamt = eigene ? Object.values(eigene).reduce((a, b) => a + b, 0) : null
  /** Wie oft dieser Monat besucht wurde — nie mehr, als angesetzt war. */
  const besucht = (i: number) => Math.min(eigene?.[String(i + 1)] ?? 0, monate[i].trainings)

  /*
   * Welcher Monat gerade angetippt ist. Am Handy gibt es kein Hover — der `title` am Balken
   * war dort eine Auskunft, die niemand bekommt. Ein Tipp stellt sie unter das Band, an die
   * Stelle der Legende: dieselbe Zeile, dieselbe Hoehe, kein Sprung.
   *
   * Noch einmal auf denselben Monat tippen nimmt die Auswahl zurueck — ein Schalter, der nur
   * einrastet, ist eine Sackgasse.
   */
  const [gewaehlt, setGewaehlt] = useState<number | null>(null)
  const tippen = (i: number) => setGewaehlt(a => (a === i ? null : i))

  /*
   * Kein eigener Rahmen und kein eigener Name: die Kachel drumherum heisst schon
   * „Termine {jahr}". Ein zweiter Bereich mit demselben Namen waere fuer einen
   * Screenreader dieselbe Ueberschrift zweimal.
   */
  return (
    <>
      {laden ? (
        <p className="text-sm text-ink-muted">Termine laden …</p>
      ) : fehler ? (
        <p className="text-sm text-ink-muted">Die Termine sind gerade nicht erreichbar.</p>
      ) : (
        <>
          {/* Deckel auf die Saeulenbreite: ueber die ganze Breite eines Tablets gezogen
              werden aus Balken Kloetze, breiter als hoch — dann liest man keine Menge mehr. */}
          <ol className="flex items-end justify-center gap-1 h-11 sm:h-[3.25rem]">
            {monate.map((m, i) => {
              const gesamt = m.spieltage + m.trainings
              const vorbei = i < aktuellerMonat
              const skala = (n: number) => saeule(n, hoechste)
              const dran = gewaehlt === i
              const beschriftung = gesamt === 0
                ? `${MONATSNAMEN[i]}: nichts angesetzt`
                : `${MONATSNAMEN[i]}: ${m.spieltage} Spieltage, ${m.trainings} Trainings`
                  + (eigene != null ? ` — du bei ${besucht(i)}` : '')
              return (
                <li key={i} className="flex-1 max-w-[2.75rem] h-full">
                  {/*
                    Der ganze Monatsstreifen ist die Fassflaeche, nicht nur der Balken: ein
                    Monat ohne Termine ist 2 Pixel hoch und waere sonst nicht zu treffen.
                    `aria-pressed` sagt vor, was man sieht — welcher Monat offen ist.
                  */}
                  <button
                    type="button"
                    onClick={() => tippen(i)}
                    aria-pressed={dran}
                    aria-label={beschriftung}
                    title={beschriftung}
                    className={`w-full h-full flex flex-col justify-end gap-px cursor-pointer rounded-sm
                      transition-[transform,opacity] duration-200 ease-[var(--ease-out-strong)]
                      motion-reduce:transition-none ${dran ? 'scale-y-105 origin-bottom' : ''}
                      ${gewaehlt != null && !dran ? 'opacity-55' : ''}`}
                  >
                  {m.spieltage > 0 && (
                    <span
                      className={`block w-full rounded-sm bg-softball-red-600 ${vorbei ? 'opacity-30' : ''}`}
                      style={{ height: skala(m.spieltage) }}
                    />
                  )}
                  {/*
                    Mit eigener Anwesenheit spaltet sich der Trainings-Balken: unten voll
                    eingefaerbt, wo man da war, darueber blass der Rest. Gefuellt heisst
                    „warst du", blass heisst „warst du nicht oder kommt noch" — eine
                    Bedeutung fuer die Fuellung im ganzen Band.

                    Die Abblendung vergangener Monate entfaellt dann fuer die Trainings:
                    zwei Helligkeiten fuer zwei verschiedene Dinge im selben Balken liest
                    niemand auseinander. Fuer die Spieltage oben bleibt sie — dort gibt es
                    nichts zu fuellen.
                  */}
                  {m.trainings > 0 && eigene == null && (
                    <span
                      className={`block w-full rounded-sm bg-bar ${vorbei ? 'opacity-30' : ''}`}
                      style={{ height: skala(m.trainings) }}
                    />
                  )}
                  {m.trainings > 0 && eigene != null && (
                    <>
                      {m.trainings - besucht(i) > 0 && (
                        <span
                          className="block w-full rounded-sm bg-bar opacity-30"
                          style={{ height: skala(m.trainings - besucht(i)) }}
                        />
                      )}
                      {besucht(i) > 0 && (
                        <span
                          className="block w-full rounded-sm bg-bar"
                          style={{ height: skala(besucht(i)) }}
                        />
                      )}
                    </>
                  )}
                  {gesamt === 0 && <span className="block w-full h-[2px] rounded-sm bg-bar-track" />}
                  </button>
                </li>
              )
            })}
          </ol>

          <ol className="flex justify-center gap-1 mt-1.5" aria-hidden>
            {MONATE.map((m, i) => (
              <li key={i} className="flex-1 max-w-[2.75rem] min-w-0">
                {/* Der laufende Monat traegt einen Strich, nicht nur eine andere Helligkeit:
                    "wo stehe ich gerade" darf nicht an einer Nuance haengen. */}
                <span
                  className={`block text-center font-display text-[10px] font-bold ${
                    i === aktuellerMonat ? 'text-ink' : i < aktuellerMonat ? 'text-ink-faint' : 'text-ink-muted'
                  }`}
                >
                  {m}
                </span>
                <span
                  className={`block h-0.5 rounded-full mt-0.5 ${i === aktuellerMonat ? 'bg-label' : 'bg-transparent'}`}
                />
              </li>
            ))}
          </ol>

          {/*
            Die Zeile IST die Legende. Vorher stand hier nur „Noch offen: 0 Spieltage ·
            28 Trainings" — eine Zahl ueber den REST des Jahres unter zwoelf Saeulen, die das
            GANZE Jahr zeigen, und ohne ein Wort darueber, was rot und was blau ist. Wer die
            Farben nicht kennt, sieht einen Verlauf ohne Gegenstand.

            Jetzt tragen die beiden Punkte dieselben Farben wie die Saeulen und stehen
            neben ihrer Zahl.

            Was noch KOMMT, steht nur bei den Spieltagen. Bei den Trainings stand es auch
            einmal und ist wieder weg: sie laufen im Takt weiter, da plant niemand nach einer
            Restzahl. Bei den Spieltagen schon — danach richtet sich ein Wochenende.
          */}
          {/*
            Eine Zeile, zwei Zustaende: ohne Auswahl die Legende, mit Auswahl der Monat. Sie
            tauschen sich an derselben Stelle aus und sind gleich hoch — die Seite darf beim
            Antippen nicht springen, sonst tippt man daneben.
          */}
          {gewaehlt != null ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-ink-muted mt-2 sm:mt-3 animate-[einblenden_200ms_var(--ease-out-strong)]">
              <span className="font-display font-bold uppercase tracking-wide text-ink">{MONATSNAMEN[gewaehlt]}</span>
              {monate[gewaehlt].spieltage + monate[gewaehlt].trainings === 0 ? (
                <span>nichts angesetzt</span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-softball-red-600 shrink-0" aria-hidden />
                    <span className="font-semibold text-ink">{monate[gewaehlt].spieltage}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-bar shrink-0" aria-hidden />
                    <span className="font-semibold text-ink">{monate[gewaehlt].trainings}</span>
                    {eigene != null && <span className="text-ink-faint">· du {besucht(gewaehlt)}</span>}
                  </span>
                </>
              )}
            </div>
          ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted mt-2 sm:mt-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-softball-red-600 shrink-0" aria-hidden />
              <span><span className="font-semibold text-ink">{spieltageGesamt}</span>{' '}
                {spieltageGesamt === 1 ? 'Spieltag' : 'Spieltage'}</span>
              {/* „noch" nur im laufenden Jahr: in einem vergangenen kommt nichts mehr. */}
              {jahr === heuteJahr && <span className="text-ink-faint">· noch {offeneSpieltage}</span>}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-bar shrink-0" aria-hidden />
              <span><span className="font-semibold text-ink">{trainingsGesamt}</span>{' '}
                {trainingsGesamt === 1 ? 'Training' : 'Trainings'}</span>
              {eigeneGesamt != null && (
                <span className="text-ink-faint">
                  · <span className="font-semibold text-ink">du {eigeneGesamt}</span>
                </span>
              )}
            </span>
          </div>
          )}
        </>
      )}
    </>
  )
}
