import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, ChevronRight } from 'lucide-react'
import type { PlayerFormPoint } from '@/types'
import { FeldMiniatur } from './FeldMiniatur'
import { useRolle } from '@/hooks/useRolle'
import { Abschnittsmarke } from '@/components/shared'
import { useTermine, heuteIso, type Termin } from '@/hooks/useTermine'
import { readCounterState } from '@/hooks/useCounter'
import { isInitial } from '@/utils/counterRules'
import { JahresBand } from '@/components/dashboard/JahresBand'
import { Begruessung } from './Begruessung'
import { useMeineZahlen, useSaisonsDesJahres } from './useMeineZahlen'
import { bereichAus, gemerkteWahl, merkeWahl, type Wahl } from './bereich'

const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function kurz(datum: string): string {
  const d = new Date(datum + 'T00:00:00')
  const jahr = d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}
  return `${WOCHENTAG[d.getDay()]} · ${d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', ...jahr })}`
}

function inTagen(datum: string): number {
  const a = new Date(heuteIso() + 'T00:00:00').getTime()
  const b = new Date(datum + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Die Entfernung in Worten — oder gar nicht.
 *
 * Ueber etwa zwei Monaten hinaus sagt "in 9 Wochen" weniger als das Datum selbst, und bei
 * einem verirrten Termin steht dort "in 3307 Wochen" (so gesehen, Testdatensatz mit Jahr
 * 2090). Jenseits der Grenze traegt das Datum allein — dann aber mit Jahr.
 */
function wann(datum: string): string | null {
  const d = inTagen(datum)
  if (d === 0) return 'Heute'
  if (d === 1) return 'Morgen'
  if (d < 7) return `In ${d} Tagen`
  if (d < 14) return 'Nächste Woche'
  if (d <= 56) return `In ${Math.round(d / 7)} Wochen`
  return null
}

/**
 * Die Startseite — und zwar die eigene, nicht die des Vereins.
 *
 * Der Spielbetrieb ist eine Werkbank und hat seine eigene Seite. Hier steht, was einen
 * selbst betrifft: Name, Position, Zahlen, und darunter drei Fragen, die man am Handy
 * ohne Scrollen beantwortet bekommt — weil die zugeklappte Zeile die Antwort schon
 * TRAEGT. Aufklappen ist fuer Leute, die es genauer wissen wollen, nicht die Bedingung
 * dafuer, ueberhaupt etwas zu erfahren.
 *
 * Die Kacheln liegen in einem Bento: Spieltag und Training teilen sich eine Reihe, das
 * Jahresband bekommt die Breite, die zwoelf Saeulen brauchen, der Zaehler eine flache Zeile
 * am Fuss. Gemessen passt das Ganze ohne Scrollen ab 360x740 — darunter (altes kleines
 * Android, iPhone SE der ersten Generation) scrollt es, und das ist die Grenze, nicht eine
 * Zusicherung.
 */
export function StartPage() {
  const { me } = useRolle()
  const { termine, laden, fehler } = useTermine()
  const heute = heuteIso()
  /*
   * Das laufende Jahr traegt die ganze Seite — Kopf UND Band.
   *
   * Vorher suchte der Kopf sich eine Saison: die des naechstgelegenen Spieltags. Wer im
   * selben Jahr eine Liga-Saison und eine fuer Trainingsspiele hat, bekam damit die Bilanz
   * der zuletzt angesetzten zu sehen — ein Spiel, keine Quoten — waehrend die Kachel
   * darunter "Dein Jahr 2026" ueberschrieb. Ein Zeitraum je Seite, und zwar der, der
   * drauf steht.
   */
  const jahr = new Date().getFullYear()
  /*
   * Die Wahl ist der gemerkte Wunsch, der Bereich das, was daraus im Licht der wirklich
   * vorhandenen Saisons wird. Abgeleitet statt in einem Effekt nachgezogen: sonst zeigte
   * die Seite erst die Jahreszahlen und ersetzte sie eine Umdrehung spaeter.
   */
  const [wahl, setWahl] = useState<Wahl>(gemerkteWahl)
  const saisons = useSaisonsDesJahres(jahr)
  const bereich = bereichAus(wahl, jahr, saisons)
  const { daten, fehler: zahlenFehler } = useMeineZahlen(me?.playerId ?? null, bereich)

  const naechsterSpieltag = useMemo(
    () => termine.find(t => t.art === 'SPIELTAG' && t.datum >= heute) ?? null,
    [termine, heute],
  )
  const trainings = useMemo(
    () => termine.filter(t => t.art === 'TRAINING' && t.datum >= heute)
      .sort((a, b) => a.datum.localeCompare(b.datum)),
    [termine, heute],
  )

  return (
    <div className="space-y-2 sm:space-y-4">
      <Begruessung
        name={me?.playerName ?? null}
        playerId={me?.playerId ?? null}
        jahr={jahr}
        bereich={bereich}
        saisons={saisons}
        wahl={wahl}
        onWahl={w => { setWahl(w); merkeWahl(w) }}
        daten={daten}
        fehler={zahlenFehler}
      />

      {/*
        Bento statt vier gleicher Zeilen. Vier identische Streifen untereinander lesen sich
        monoton, und zum Zuklappen ist der Inhalt zu klein — jede Kachel traegt ihre Antwort
        gleich im Klartext, niemand muss tippen, um etwas zu erfahren.

        Die Groessen folgen dem Inhalt, nicht der Symmetrie: Spieltag und Training sind je
        ein Datum mit zwei Zeilen und teilen sich eine Reihe. Das Jahresband braucht Breite
        (zwoelf Saeulen), also bekommt es sie. Der Zaehler ist eine Handlung, keine Auskunft
        — eine flache Zeile am Fuss.
      */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Kachel titel="Nächster Spieltag" zu="/spielbetrieb">
          <SpieltagInhalt spieltag={naechsterSpieltag} laden={laden} fehler={fehler} />
        </Kachel>

        <Kachel titel="Nächstes Training" zu="/kalender">
          <TrainingInhalt naechstes={trainings[0]} danach={trainings[1]} laden={laden} fehler={fehler} />
        </Kachel>

        {/*
          „Termine", nicht „Dein Jahr". Das Band zeigt den Kalender des VEREINS — alle
          Spieltage, alle Trainings. Unter einem Kopf, der die eigenen Zahlen traegt, las
          sich „Dein Jahr 2026 … 0 Spieltage" wie ein Widerspruch zu den 39,5 Spielen
          darueber. Zwei Bloecke, die beide „dein Jahr" behaupten und Verschiedenes sagen.
        */}
        <Kachel titel={`Termine ${jahr}`} className="col-span-2 lg:col-span-2">
          <JahresBand termine={termine} laden={laden} fehler={fehler} />
        </Kachel>

        {/*
          Erst ab md. Am Handy ist die Hoehe das knappe Gut und diese beiden sind Nachschlag,
          keine Antwort auf die Frage, mit der man die Seite oeffnet — dort fuehrt der Weg
          ueber das Profil und den Kalender. Am Schreibtisch ist Platz, und leer gelassener
          Platz ist auch eine Aussage, nur keine gute.
        */}
        <Zuletzt verlauf={daten?.verlauf ?? []} geladen={daten != null} fehler={zahlenFehler}
                 playerId={me?.playerId ?? null} className="hidden md:block md:col-span-1 lg:col-span-2" />
        <WasAnsteht termine={termine} heute={heute} laden={laden} fehler={fehler}
                    className="hidden md:block md:col-span-1 lg:col-span-2" />

        {/*
          Die beiden Werkzeuge am Fuss. Am Handy untereinander, ab lg nebeneinander — dort
          kostet der Playmaker damit keine einzige Zeile Hoehe.
        */}
        <Zaehler />
        <Playmaker />
      </div>
    </div>
  )
}

/**
 * Eine Bento-Kachel: Ueberschrift mit Marke, darunter der Inhalt. Die Groesse kommt von aussen.
 *
 * Mit `zu` ist die GANZE Kachel der Weg dorthin, statt einer eigenen Link-Zeile darunter.
 * Zwei solche Zeilen kosteten zusammen 44 Pixel Hoehe und sagten nichts, was die Ueberschrift
 * nicht schon sagt — am Handy ist eine grosse Flaeche ohnehin das bessere Ziel als ein Wort.
 */
function Kachel({ titel, zu, className = '', children }: {
  titel: string
  zu?: string
  className?: string
  children: ReactNode
}) {
  const inhalt = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-wider sm:tracking-widest uppercase text-ink-muted mb-2 sm:mb-2.5">
          <Abschnittsmarke size="sm" />
          {titel}
        </h2>
        {zu && <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden />}
      </div>
      {children}
    </>
  )
  const stil = `bg-surface-raised border border-line rounded-2xl shadow-card p-3.5 sm:p-4 min-w-0 block ${className}`
  if (zu) {
    return (
      <Link
        to={zu}
        // Sagt der Zielseite, wohin ihr Zurück zeigt — sonst entschiede dort die Rolle,
        // und ein Trainer landete auf dem Kader statt da, wo er hergekommen ist.
        state={{ zurueck: '/' }}
        aria-label={titel}
        className={`${stil} hover:border-line-strong transition-colors`}
      >
        {inhalt}
      </Link>
    )
  }
  return <section aria-label={titel} className={stil}>{inhalt}</section>
}

function SpieltagInhalt({ spieltag, laden, fehler }: { spieltag: Termin | null; laden: boolean; fehler: boolean }) {
  if (laden) return <p className="text-sm text-ink-muted">Termine laden …</p>
  if (fehler) {
    return (
      <p className="text-sm text-ink-muted">Termine nicht erreichbar.</p>
    )
  }
  if (!spieltag) {
    return (
      <p className="text-sm text-ink-muted">Kein Spieltag angesetzt.</p>
    )
  }
  return (
    <>
      <p className="font-display text-xl font-extrabold tracking-wide uppercase text-ink leading-none">
        {kurz(spieltag.datum)}
      </p>
      {/* Nicht noch eine Zeile Versalien: ueber dem Datum steht schon eine, und zwei
          geschriene Zeilen uebereinander liest niemand als zwei Dinge. */}
      {wann(spieltag.datum) && (
        <p className="text-xs font-semibold text-label mt-1">{wann(spieltag.datum)}</p>
      )}
      <p className="text-sm text-ink-muted mt-2 line-clamp-1 sm:line-clamp-2">{spieltag.titel}</p>
      {spieltag.ort && (
        <p className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1.5">
          <MapPin size={13} className="shrink-0" /> {spieltag.ort}
        </p>
      )}
    </>
  )
}

function TrainingInhalt({ naechstes, danach, laden, fehler }: {
  naechstes?: Termin; danach?: Termin; laden: boolean; fehler: boolean
}) {
  if (laden) return <p className="text-sm text-ink-muted">Termine laden …</p>
  if (fehler) return <p className="text-sm text-ink-muted">Die Termine sind gerade nicht erreichbar.</p>
  if (!naechstes) {
    return (
      <p className="text-sm text-ink-muted">Kein Training angesetzt.</p>
    )
  }
  return (
    <>
      <p className="font-display text-xl font-extrabold tracking-wide uppercase text-ink leading-none">
        {kurz(naechstes.datum)}
      </p>
      {wann(naechstes.datum) && (
        <p className="text-xs font-semibold text-label mt-1">{wann(naechstes.datum)}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:block sm:space-y-1">
        {naechstes.zeit && (
          <p className="text-sm text-ink-muted inline-flex items-center gap-1.5">
            <Clock size={13} className="shrink-0" /> {naechstes.zeit}
          </p>
        )}
        {/* Einzeilig: ein Hallenname wie "Halle Welheimer Mark" bricht in der halben
            Kachel auf zwei Zeilen, und die zweite sagt nichts, was die erste nicht schon
            andeutet. Ab sm ist Platz, dort darf er ausgeschrieben stehen. */}
        {naechstes.ort && (
          <p className="text-sm text-ink-muted inline-flex items-center gap-1.5 min-w-0 max-w-full">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate sm:whitespace-normal">{naechstes.ort}</span>
          </p>
        )}
      </div>
      {danach && <p className="text-[11px] text-ink-faint mt-2">Danach {kurz(danach.datum)}</p>}
    </>
  )
}

/**
 * Der Playmaker als Kachel: das Feld, und ein Tipp fuehrt hinein.
 *
 * Erst standen hier die acht Kategorien als Chips. Sie waren zwar der ehrliche Ueberblick,
 * sahen in der halben Kachel aber aus wie eine Stichwortliste — und jede Zeile kostete
 * 44 Pixel Seitenhoehe. Das Feld sagt dasselbe in einem Blick und braucht keine Daten:
 * gezeichnet aus derselben Geometrie wie das echte Board.
 *
 * Die Kategorien sind damit nicht verloren, sie stehen eine Beruehrung weiter in der
 * Uebersicht — die ihren Filter seitdem in der Adresse traegt.
 */
function Playmaker() {
  return (
    <Link
      to="/orga/playmaker"
      aria-label="Playmaker"
      className="relative col-span-1 lg:col-span-2 overflow-hidden bg-surface-raised border border-line rounded-2xl shadow-card p-3.5 sm:p-4 min-w-0 block
        transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-strong)]
        hover:border-line-strong hover:shadow-lg active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-ink-muted">
          <Abschnittsmarke size="sm" />
          Playmaker
        </h2>
        <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden />
      </div>
      <p className="text-sm text-ink-muted mt-1 leading-snug">Spielzüge ansehen</p>
      {/*
        Das Feld liegt angeschnitten am unteren Rand: ein Ausschnitt wirkt wie ein Blick auf
        etwas Groesseres, ein zentriertes Vollbild wie ein Logo. `pointer-events-none`, damit
        der Tipp immer die Kachel trifft.
      */}
      {/* Ganz sichtbar und mittig: eine Strichzeichnung, von der man die Haelfte sieht,
          liest sich als Streusel — und in die Ecke geschoben wie ein vergessenes Wasserzeichen.
          Der Ausschnitt selbst liegt symmetrisch um HOME, also genuegt das Zentrieren hier.
          `pointer-events-none`, damit der Tipp die Kachel trifft und nicht das Bild. */}
      <FeldMiniatur className="pointer-events-none absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 w-[5.25rem] sm:w-28 text-ink-faint" />
      {/* Platzhalter: haelt die Hoehe frei, die das Feld darunter einnimmt. */}
      <div className="h-[4.75rem] sm:h-24" />
    </Link>
  )
}

/**
 * Ohne Erklaerung ist "Counter" ein Knopf, den niemand drueckt: der Name sagt nicht, wofuer
 * man ihn braucht. Gebraucht wird er beim Umpen — in der Liga stellen die Teams die
 * Schiedsrichter selbst, und wer Head oder Field macht, zaehlt Balls, Strikes und Outs am
 * Zaun mit. Genau das steht deshalb schon in der zugeklappten Zeile.
 *
 * „Umpen", nicht „Umpiren": das ist das Wort, das im Team benutzt wird. Die App spricht
 * die Sprache des Kaders, nicht die des Regelbuchs.
 */
/**
 * Die letzten Spiele mit der eigenen Linie — "wie lief es zuletzt", nicht "wie steht es".
 *
 * Der Verlauf ist schon da (er traegt die Formkurve im Kopf), also kostet diese Kachel
 * keinen einzigen zusaetzlichen Abruf.
 */
function Zuletzt({ verlauf, geladen, fehler, playerId, className = '' }: {
  verlauf: PlayerFormPoint[]
  geladen: boolean
  fehler: boolean
  playerId: number | null
  className?: string
}) {
  const letzte = [...verlauf].reverse().slice(0, 4)
  return (
    <Kachel titel="Zuletzt" zu={playerId != null ? `/players/${playerId}` : undefined} className={className}>
      {fehler ? (
        <p className="text-sm text-ink-muted">Spiele nicht erreichbar.</p>
      ) : !geladen ? (
        <p className="text-sm text-ink-muted">Spiele laden …</p>
      ) : letzte.length === 0 ? (
        <p className="text-sm text-ink-muted">Noch kein gezähltes Spiel.</p>
      ) : (
        <ul className="divide-y divide-line">
          {letzte.map(p => (
            <li key={p.gameId} className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
              <span className="min-w-0 flex items-baseline gap-2">
                <span className="font-display text-[11px] font-bold tabular-nums text-ink-faint shrink-0">
                  {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '–'}
                </span>
                <span className="text-sm text-ink truncate">{p.opponent ?? 'Gegner offen'}</span>
              </span>
              <span className="text-sm text-ink-muted tabular-nums shrink-0">
                {p.hits} von {p.atBats}
                {p.runsBattedIn > 0 && <span className="text-ink-faint"> · {p.runsBattedIn} RBI</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Kachel>
  )
}

/** Die naechsten Termine in einer Liste — Spieltage und Trainings gemischt, wie der Kalender sie bringt. */
function WasAnsteht({ termine, heute, laden, fehler, className = '' }: {
  termine: Termin[]
  heute: string
  laden: boolean
  fehler: boolean
  className?: string
}) {
  const naechste = termine.filter(t => t.datum >= heute).slice(0, 5)
  return (
    <Kachel titel="Was ansteht" zu="/kalender" className={className}>
      {fehler ? (
        <p className="text-sm text-ink-muted">Termine nicht erreichbar.</p>
      ) : laden ? (
        <p className="text-sm text-ink-muted">Termine laden …</p>
      ) : naechste.length === 0 ? (
        <p className="text-sm text-ink-muted">Nichts angesetzt.</p>
      ) : (
        <ul className="divide-y divide-line">
          {naechste.map(t => (
            <li key={`${t.art}-${t.id}`} className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
              <span className="min-w-0 flex items-baseline gap-2">
                <span className="font-display text-[11px] font-bold tabular-nums text-ink-faint shrink-0 w-16">
                  {kurz(t.datum)}
                </span>
                <span className="text-sm text-ink truncate">{t.titel}</span>
              </span>
              <span className="text-[11px] text-ink-faint shrink-0">
                {t.zeit ?? t.ort ?? ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Kachel>
  )
}

/**
 * Die Lampenreihe der Tafel, nur klein. Dieselben Farben und dieselbe Anordnung wie in
 * `CounterBoard` — Kachel und Ziel sollen ein Gegenstand sein und nicht zwei.
 *
 * Das Creme der Ball-Lampe steht als Festwert da statt als Paletten-Klasse: die
 * Shim-Schicht im Stylesheet deutet die hellen Cremetoene im dunklen Theme zu einer
 * FLAECHE um, und eine brennende Lampe saehe dort aus wie eine erloschene. Eine Birne
 * wechselt die Farbe nicht mit dem Theme.
 */
function Lampenreihe({ label, count, total, an, dekor = false }: {
  label: string
  count: number
  total: number
  an: string
  /** Abbildung, keine Auskunft: dann ist die Reihe fuer Screenreader nicht vorhanden. */
  dekor?: boolean
}) {
  return (
    <div className="flex items-center gap-2 lg:block lg:text-center" aria-hidden={dekor || undefined}>
      <div className="font-display text-[10px] font-bold tracking-[0.18em] uppercase text-spotlight-ink/70 w-11 lg:w-auto">
        {label}
      </div>
      <div
        className="flex gap-1.5 lg:mt-1.5 lg:justify-center"
        {...(dekor ? {} : { role: 'img', 'aria-label': `${label}: ${count} von ${total}` })}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full ring-1 ring-inset ring-white/25 ${i < count ? an : 'bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Der Counter als Kachel — das Werkzeug selbst in klein, nicht seine Beschreibung.
 *
 * Die einzige Kachel, die eine HANDLUNG ist; der Rest der Seite ist Auskunft. Sie darf sich
 * deshalb wie ein Knopf anfuehlen: heller Rand und Schein unter dem Zeiger, ein kurzes
 * Einsinken beim Druecken. Am Handy gibt es keinen Hover — dort traegt allein das Einsinken
 * die Rueckmeldung, und genau deswegen steht es hier und nicht nur der Hover.
 *
 * Jede andere Kachel dieser Seite trägt eine Auskunft: ein Datum, ein Band, Zahlen. Diese
 * trug bisher nur einen Satz und einen Knopf, und ein Satz über ein Werkzeug sieht nie so
 * aus, als wäre etwas los. Die Lampenreihe schon.
 *
 * Zwei Zustände, und der Unterschied ist der Grund für den Umbau: läuft noch ein Spiel,
 * steht der Stand da und die Kachel lädt zum Weiterzählen ein. Steht der Counter auf
 * Anfang, sind die Lampen dunkel und der Satz erklärt wieder, wofür man ihn braucht.
 *
 * Der Stand kommt einmal beim Aufbau aus dem localStorage. Die Startseite zählt nicht mit
 * — sie schaut nach.
 *
 * `spotlight` statt Papier: die Kachel ist die einzige HANDLUNG auf einer Seite voller
 * Auskunft, und `spotlight` ist die Rolle, die dafür schon da ist (im Hellen ein dunkler
 * Klotz, im Dunkeln die hellste Fläche). Der eigene Knopf ist deshalb weg: die ganze
 * Kachel ist das Ziel, wie bei `Kachel` auch, und ein Knopf in einem Link wäre ohnehin
 * verschachtelte Interaktion.
 */
function Zaehler() {
  const [stand] = useState(readCounterState)
  const laeuft = !isInitial(stand)
  // Ein typischer Stand als Abbildung: nicht alles aus, nicht alles an. Drei Reihen
  // erloschener Punkte sagen nichts — man saehe nicht einmal, dass es Lampen sind.
  const lampen = laeuft ? stand : { balls: 2, strikes: 1, outs: 1 }

  return (
    <Link
      to="/counter"
      // Sagt dem Counter, wohin sein Zurück zeigt — sonst entschiede dort die Rolle,
      // und ein Trainer landete auf Orga statt da, wo er hergekommen ist.
      state={{ zurueck: '/' }}
      aria-label="Counter"
      className="relative col-span-1 lg:col-span-2 bg-spotlight text-spotlight-ink border border-white/15 rounded-2xl shadow-card p-3.5 sm:p-4 pr-8 sm:pr-9 flex flex-col gap-2.5 sm:gap-3
        transition-[filter,box-shadow,border-color,transform] duration-200 ease-[var(--ease-out-strong)]
        hover:brightness-110 hover:border-white/40 hover:shadow-lg hover:shadow-navy-900/40
        active:scale-[0.99] active:brightness-125 motion-reduce:active:scale-100"
    >
      <div className="flex-1 min-w-0">
        <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-wider sm:tracking-widest uppercase mb-1.5 sm:mb-2">
          <Abschnittsmarke size="sm" />
          Counter
        </h2>
        {laeuft ? (
          <p className="font-display text-xl font-extrabold tracking-wide uppercase leading-none tabular-nums">
            <span aria-hidden>
              {stand.inning}. Inning{' '}
              <span className="text-softball-red-400">{stand.half === 'top' ? '▲' : '▼'}</span>
              <span className="text-spotlight-ink/50"> · </span>
              {stand.home} : {stand.away}
            </span>
            <span className="sr-only">
              Läuft: {stand.inning}. Inning, {stand.half === 'top' ? 'oben' : 'unten'},
              {' '}Heim {stand.home}, Gast {stand.away}
            </span>
          </p>
        ) : (
          /* Eine Zeile. Was gezaehlt wird, steht unter den Lampen — der Satz muss es nicht
             wiederholen, und zwei Zeilen kosteten die Seite ihren letzten Rand. */
          <p className="text-sm text-spotlight-ink/80 leading-snug">
            Beim Umpen mitzählen.
          </p>
        )}
      </div>

      {/*
        Laeuft ein Zaehler, stehen hier sein Stand und seine Lampen — eine Auskunft, die
        vorgelesen wird. Laeuft keiner, steht dasselbe Bild als ABBILDUNG da: so sieht das
        Werkzeug aus, wie das Feld auf der Playmaker-Kachel daneben.

        Der Unterschied steckt nicht im Bild, sondern im Anspruch. Einmal trugen die
        erloschenen Lampen echte Vorlese-Beschriftungen ("Ball: 2 von 3") und brauchten
        deshalb ein Etikett "Beispiel" — eine Zaehlung, die keine ist, muss man erklaeren.
        Als Abbildung behauptet sie nichts und ist fuer Screenreader schlicht nicht da.

        In der halben Kachel passen drei Gruppen nicht nebeneinander (184 von 150 Pixeln),
        deshalb gestapelt mit der Beschriftung NEBEN den Punkten: 22 statt 36 Pixel je Reihe.
      */}
      <div className="flex flex-col gap-1 sm:gap-1.5 shrink-0 lg:flex-row lg:items-start lg:gap-5">
        <Lampenreihe label="Ball" count={lampen.balls} total={3} an="bg-[#FBF6EC]" dekor={!laeuft} />
        <Lampenreihe label="Strike" count={lampen.strikes} total={2} an="bg-amber-400" dekor={!laeuft} />
        <Lampenreihe label="Out" count={lampen.outs} total={2} an="bg-softball-red-400" dekor={!laeuft} />
      </div>

      {/* Absolut gesetzt statt im Fluss: am Handy liegen Text und Lampen untereinander,
          und der Pfeil gehoert trotzdem nach oben rechts — dorthin, wo ihn die anderen
          Kacheln haben. `pr-9` haelt ihm die Spalte frei. */}
      <ChevronRight size={16} className="absolute right-3 top-3.5 sm:right-3.5 sm:top-4 text-spotlight-ink/60" aria-hidden />
    </Link>
  )
}
