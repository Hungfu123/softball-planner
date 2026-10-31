import { useEffect, useState } from 'react'
import { FeldMiniatur } from '@/components/start/FeldMiniatur'
import { KAPITEL } from './kapitel'
import { getPlayCategories, getPlays } from '@/api/plays'
import { PositionWahl } from '@/components/playmaker/position'
import { lesePosition, schreibePosition } from '@/components/playmaker/positionSpeicher'
import { mitwirkende } from '@/components/playmaker/board/beteiligte'
import type { Play } from '@/components/playmaker/board/types'
import type { PositionCode } from '@/components/playmaker/board/types'
import { StufeLegende } from '@/components/shared/StufePunkte'
import { LernZeile } from '@/components/shared/LernZeile'
import { kategorieSatz, kategorieStufe } from '@/components/playmaker/kategorieTexte'
import type { PlayCategory } from '@/components/playmaker/board/types'

/**
 * Der Einstieg ins Spielwissen.
 *
 * Die oberste Ebene ist der Schnitt, in dem ein Softballer denkt: **Offense gegen
 * Defense**. Beide Haelften sehen gleich aus — dieselbe Karte, dieselbe Zeile, dieselben
 * Punkte fuer die Schwierigkeit —, weil sie dasselbe sind: etwas, das man lernen kann.
 * Vorher war Offense eine Liste aus drei Kapiteln und Defense eine einzige Tuer.
 *
 * **Die Reihenfolge ist einfach nach schwer.** Wer die Seite zum Lernen aufmacht, faengt
 * oben an und arbeitet sich nach unten; die Punkte sagen vorher, worauf man sich
 * einlaesst.
 *
 * Auf dem Handy stehen beide Haelften untereinander, am breiten Schirm nebeneinander:
 * links die Wahl, rechts die Eintraege. Kein Reiter, der etwas versteckt — am Handy ist
 * die Seite kurz genug, dass beides hinpasst.
 */

/**
 * Eine Zeile, und zwar dieselbe fuer Offense wie fuer Defense — und seit dem 31.10.2026
 * auch dieselbe wie im Kapitel eine Seite spaeter (`shared/LernZeile`). Hier steht nur
 * noch, womit sie gefuellt wird.
 */
function Eintrag({
  to,
  titel,
  frage,
  worte = [],
  stufe,
  bild,
  marke,
}: {
  to: string
  titel: string
  frage: string
  /** Nur die Ersatzzeile fuer Defense traegt noch welche: dort sind sie die einzige
      Auskunft. Bei den Kapiteln sagen Titel und Frage genug. */
  worte?: string[]
  stufe: 1 | 2 | 3
  bild?: boolean
  /** „4 für CF": wie viele Plays der Kategorie die gewählte Position betreffen. */
  marke?: string
}) {
  return (
    <LernZeile
      to={to}
      titel={titel}
      satz={frage}
      worte={worte}
      stufe={stufe}
      marke={marke}
      /* Dieselbe Geometrie wie die Plays dahinter. Das Bild ist die Ankuendigung. */
      bild={bild ? <FeldMiniatur className="h-full w-full" /> : undefined}
    />
  )
}

/**
 * Die Ueberschrift einer Haelfte, und zwar als Block statt als duenner Strich.
 *
 * **Am Handy bleibt es ein Scrollen, kein Nebeneinander.** Zwei Spalten geben auf 393 px
 * je 180 px her — zu wenig fuer Titel, Frage und Stichworte, und abgeschnittene Zeilen
 * erklaeren nichts. Ein Reiter oder ein Tipp, der erst zeigt „das ist Defense", kostet
 * einen Schritt und verbirgt dabei die eine Haelfte. Also steht beides untereinander,
 * und WAS die Haelfte ist, sagt der Kopf: ein Wort, ein Satz, ein farbiger Balken.
 *
 * Am breiten Schirm liegen die Haelften nebeneinander — dort ist die senkrechte Teilung
 * genau das, was sie sein soll, und kostet nichts.
 */
function Haelfte({ titel, zusatz }: { titel: string; zusatz?: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="h-6 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <h2 className="font-headline text-lg font-extrabold uppercase leading-none tracking-wide text-ink-strong">
        {titel}
      </h2>
      {/* Rechts in dieselbe Zeile statt als eigene darunter: die Seite soll aufs Handy
          passen, ohne dass man scrollt. */}
      {zusatz && (
        <span className="font-display ml-auto text-[11px] font-bold uppercase tracking-widest text-ink-faint">
          {zusatz}
        </span>
      )}
    </div>
  )
}

/**
 * Was hinter Defense liegt, falls die Kategorien nicht kommen.
 *
 * Die Seite laedt sie (ein kleiner Abruf, `/play-categories`), **braucht sie aber
 * nicht**: ohne Netz steht hier eine Tuer mit denselben Worten wie vorher. Offense
 * haengt an gar keinem Abruf — das ist das Versprechen dieser Seite, und ein Test
 * haelt es fest.
 */
const DEFENSE_STICHWORTE = ['Cut-off', 'Bunt-Defense', 'Rundown', 'Pickoff', 'Wer covert was']

export default function SpielwissenHome() {
  const [kategorien, setKategorien] = useState<PlayCategory[] | null>(null)
  /*
   * Die Plays nur fuer die Zaehlung je Kategorie. Kommen sie nicht (kein Netz, kein
   * Konto), steht da eben keine Zahl — die Seite funktioniert ohne sie weiter.
   */
  const [plays, setPlays] = useState<Play[]>([])
  const [position, setPosition] = useState<PositionCode | null>(lesePosition)
  /* Die schwereren Kategorien liegen einen Tipp entfernt, nicht hinter einer Seite. */
  const [mehr, setMehr] = useState(false)

  useEffect(() => {
    let abgebrochen = false
    getPlayCategories()
      .then(k => {
        if (!abgebrochen) setKategorien(k)
      })
      .catch(() => {
        /* Ohne Netz bleibt es bei der einen Tuer. Kein Fehler, nur weniger. */
      })
    getPlays()
      .then(p => {
        if (!abgebrochen) setPlays(p)
      })
      .catch(() => {
        /* Dann eben ohne Zahlen. */
      })
    return () => {
      abgebrochen = true
    }
  }, [])

  const waehlePosition = (pos: PositionCode | null) => {
    setPosition(pos)
    schreibePosition(pos)
  }

  /** Wie viele Plays einer Kategorie die gewaehlte Position betreffen. */
  const fuerMich = (kategorieId: number) =>
    plays.filter(p => p.categoryId === kategorieId && position && mitwirkende(p.steps).includes(position)).length

  return (
    <div className="mx-auto max-w-5xl space-y-3 pb-2">
      <div>
        <h1 className="font-headline text-2xl font-extrabold uppercase tracking-wide text-ink-strong sm:text-3xl">
          Spielwissen
        </h1>
        {/* Die Legende sagt die Reihenfolge schon mit: oben leicht, unten schwer. Ein
            Satz darueber waere dasselbe ein zweites Mal. */}
        <StufeLegende className="mt-1.5" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section className="space-y-2">
          <Haelfte titel="Offense" />
          {[...KAPITEL]
            .sort((a, b) => a.stufe - b.stufe)
            .map(k => (
              <Eintrag
                key={k.id}
                to={`/spielwissen/${k.id}`}
                titel={k.titel}
                frage={k.frage}
                stufe={k.stufe}
              />
            ))}
        </section>

        <section className="space-y-2">
          <Haelfte titel="Defense" zusatz={kategorien && kategorien.length > 0 ? 'Deine Position' : undefined} />
          {/*
            Die Position waehlt man HIER, nicht erst im Kapitel.

            Vorher stand der Filter eine Seite tiefer: man sah erst drinnen, ob fuer die
            eigene Position etwas dabei ist, und er versteckte stillschweigend Plays, weil
            er sich die Wahl auf dem Geraet merkt. Jetzt steht die Zahl an der Tuer.
            Gewaehlt wird in denselben Speicher, die Wahl gilt im Kapitel weiter.
          */}
          {kategorien && kategorien.length > 0 && (
            <PositionWahl position={position} onWahl={waehlePosition} titel={false} />
          )}
          {kategorien && kategorien.length > 0 ? (
            <>
              {/*
                Nicht alles auf einmal.

                Acht Kategorien mit einundfuenfzig Plays sind eine Bibliothek, keine
                Lektion: wer zum ersten Mal herkommt, soll nicht zwischen Rundown und
                First-and-Third waehlen muessen, sondern wissen, wo er hingehoert, wenn
                der Ball irgendwo hinfliegt. Das sind die beiden mit einem Punkt. Der
                Rest liegt einen Tipp entfernt und laeuft nicht weg.
              */}
              {kategorien.filter(k => kategorieStufe(k.sortOrder) === 1).map(k => (
                <Eintrag
                  key={k.id}
                  to={`/orga/playmaker?kategorie=${k.id}`}
                  titel={k.name}
                  frage={kategorieSatz(k.name)}
                  stufe={kategorieStufe(k.sortOrder)}
                  marke={position ? `${fuerMich(k.id)} für ${position}` : undefined}
                />
              ))}

              {mehr ? (
                <>
                  {kategorien.filter(k => kategorieStufe(k.sortOrder) > 1).map(k => (
                    <Eintrag
                      key={k.id}
                      to={`/orga/playmaker?kategorie=${k.id}`}
                      titel={k.name}
                      frage={kategorieSatz(k.name)}
                      stufe={kategorieStufe(k.sortOrder)}
                      marke={position ? `${fuerMich(k.id)} für ${position}` : undefined}
                    />
                  ))}
                  {/* Auch wieder zu. Ein Knopf, der nur aufmacht, ist eine Einbahnstraße —
                      und wer sich verguckt hat, scrollt sonst für immer an acht Zeilen
                      vorbei, von denen er sechs nicht wollte. */}
                  <button
                    type="button"
                    onClick={() => setMehr(false)}
                    className="font-display min-h-11 w-full rounded-xl px-4 text-[11px] font-bold uppercase tracking-widest text-ink-faint hover:bg-surface-raised active:bg-surface-raised"
                  >
                    Weniger zeigen
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMehr(true)}
                  className="font-display min-h-11 w-full rounded-xl border border-dashed border-line px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised active:bg-surface-raised"
                >
                  Mehr zeigen ({kategorien.filter(k => kategorieStufe(k.sortOrder) > 1).length})
                </button>
              )}
            </>
          ) : (
            <Eintrag
              to="/orga/playmaker"
              titel="Defense"
              frage="Wer steht wo, und wohin geht der Ball?"
              worte={DEFENSE_STICHWORTE}
              stufe={1}
              bild
            />
          )}
        </section>
      </div>
    </div>
  )
}
