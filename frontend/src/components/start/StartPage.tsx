import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, ChevronRight } from 'lucide-react'
import * as api from '@/api/client'
import type { Season, PlayerFormPoint } from '@/types'
import { useRolle } from '@/hooks/useRolle'
import { Abschnittsmarke } from '@/components/shared'
import { useTermine, heuteIso, saisonAusTerminen, type Termin } from '@/hooks/useTermine'
import { JahresBand } from '@/components/dashboard/JahresBand'
import { Begruessung } from './Begruessung'
import { useMeineZahlen } from './useMeineZahlen'

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
  const { saisons, ladefehler } = useSaisons()
  // Der naechstgelegene Spieltag weiss besser als die Jahreszahl, in welcher Saison wir sind.
  const ausTerminen = saisonAusTerminen(termine, heute)
  const aktuelle = saisons.find(s => s.id === ausTerminen) ?? juengste(saisons)
  const seasonId = aktuelle?.id ?? null
  const seasonName = aktuelle?.name ?? null
  const { daten, fehler: zahlenFehler } = useMeineZahlen(me?.playerId ?? null, seasonId)

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
    <div className="space-y-3 sm:space-y-4">
      <Begruessung
        name={me?.playerName ?? null}
        playerId={me?.playerId ?? null}
        seasonId={seasonId}
        seasonName={seasonName}
        daten={daten}
        fehler={zahlenFehler}
        ladefehler={ladefehler}
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Kachel titel="Nächster Spieltag" zu="/spielbetrieb">
          <SpieltagInhalt spieltag={naechsterSpieltag} laden={laden} fehler={fehler} />
        </Kachel>

        <Kachel titel="Nächstes Training" zu="/kalender">
          <TrainingInhalt naechstes={trainings[0]} danach={trainings[1]} laden={laden} fehler={fehler} />
        </Kachel>

        <Kachel titel={`Dein Jahr ${new Date().getFullYear()}`} className="col-span-2 lg:col-span-2">
          <JahresBand termine={termine} laden={laden} fehler={fehler} rahmenlos />
        </Kachel>

        {/*
          Nur ab lg. Am Handy ist die Hoehe das knappe Gut und diese beiden sind Nachschlag,
          keine Antwort auf die Frage, mit der man die Seite oeffnet — dort fuehrt der Weg
          ueber das Profil und den Kalender. Am Schreibtisch ist Platz, und leer gelassener
          Platz ist auch eine Aussage, nur keine gute.
        */}
        <Zuletzt verlauf={daten?.verlauf ?? []} geladen={daten != null} fehler={zahlenFehler}
                 playerId={me?.playerId ?? null} className="hidden lg:block lg:col-span-2" />
        <WasAnsteht termine={termine} heute={heute} laden={laden} fehler={fehler}
                    className="hidden lg:block lg:col-span-2" />

        <Zaehler />
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
        <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-ink-muted mb-2.5">
          <Abschnittsmarke size="sm" />
          {titel}
        </h2>
        {zu && <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden />}
      </div>
      {children}
    </>
  )
  const stil = `bg-surface-raised border border-line rounded-2xl shadow-card p-4 min-w-0 block ${className}`
  if (zu) {
    return (
      <Link to={zu} aria-label={titel} className={`${stil} hover:border-line-strong transition-colors`}>
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
      <p className="text-sm text-ink-muted">
        Die Termine sind gerade nicht erreichbar. Das heißt nicht, dass nichts ansteht.
      </p>
    )
  }
  if (!spieltag) {
    return (
      <p className="text-sm text-ink-muted">
        Kein Spieltag angesetzt. Sobald er steht, erscheint er hier — die Anfrage dazu kommt wie
        gewohnt per WhatsApp.
      </p>
    )
  }
  return (
    <>
      <p className="font-display text-xl font-extrabold tracking-wide uppercase text-ink leading-none">
        {kurz(spieltag.datum)}
      </p>
      {wann(spieltag.datum) && (
        <p className="font-display text-[11px] font-bold tracking-widest uppercase text-label mt-1.5">
          {wann(spieltag.datum)}
        </p>
      )}
      <p className="text-sm text-ink-muted mt-2 line-clamp-2">{spieltag.titel}</p>
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
      <p className="text-sm text-ink-muted">
        Kein Training angesetzt. Sobald die nächste Periode steht, erscheint es hier.
      </p>
    )
  }
  return (
    <>
      <p className="font-display text-xl font-extrabold tracking-wide uppercase text-ink leading-none">
        {kurz(naechstes.datum)}
      </p>
      {wann(naechstes.datum) && (
        <p className="font-display text-[11px] font-bold tracking-widest uppercase text-label mt-1.5">
          {wann(naechstes.datum)}
        </p>
      )}
      <div className="mt-2 space-y-1">
        {naechstes.zeit && (
          <p className="text-sm text-ink-muted inline-flex items-center gap-1.5">
            <Clock size={13} className="shrink-0" /> {naechstes.zeit}
          </p>
        )}
        {naechstes.ort && (
          <p className="text-sm text-ink-muted inline-flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0" /> {naechstes.ort}
          </p>
        )}
      </div>
      {danach && <p className="text-[11px] text-ink-faint mt-2">Danach {kurz(danach.datum)}</p>}
    </>
  )
}

/**
 * Ohne Erklaerung ist "Counter" ein Knopf, den niemand drueckt: der Name sagt nicht, wofuer
 * man ihn braucht. Gebraucht wird er, wenn man selbst umpirt — in der Liga stellen die Teams
 * die Schiedsrichter, und dann zaehlt man Balls, Strikes und Outs am Zaun mit. Genau das
 * steht deshalb schon in der zugeklappten Zeile.
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
        <p className="text-sm text-ink-muted">Deine Spiele sind gerade nicht erreichbar.</p>
      ) : !geladen ? (
        <p className="text-sm text-ink-muted">Spiele laden …</p>
      ) : letzte.length === 0 ? (
        <p className="text-sm text-ink-muted">
          In dieser Saison ist noch kein Spiel gezählt, in dem du dran warst.
        </p>
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
        <p className="text-sm text-ink-muted">Die Termine sind gerade nicht erreichbar.</p>
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

function Zaehler() {
  return (
    <section
      aria-label="Zähler"
      className="col-span-2 lg:col-span-4 bg-surface-raised border border-line rounded-2xl shadow-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <p className="text-sm text-ink-muted leading-relaxed flex-1 min-w-0">
        <span className="font-display font-bold tracking-widest uppercase text-[11px] text-ink mr-2">Zähler</span>
        Wenn du selbst umpirest: Balls, Strikes, Outs — groß genug fürs Feld, läuft ohne Netz.
      </p>
      <Link
        to="/counter"
        className="font-display min-h-11 inline-flex items-center justify-center px-4 rounded-lg bg-cream-50 border border-cream-300 text-navy-900 hover:bg-navy-800 hover:text-white hover:border-navy-800 text-[11px] font-extrabold tracking-widest uppercase transition-colors shrink-0"
      >
        Zähler öffnen
      </Link>
    </section>
  )
}

/** Die juengste Saison — hoechstes Jahr, bei Gleichstand hoechste id. `findAll` liefert unsortiert. */
function juengste(saisons: Season[]): Season | undefined {
  return [...saisons].sort((a, b) => a.year - b.year || a.id - b.id).at(-1)
}

function useSaisons() {
  const [stand, setStand] = useState<{ saisons: Season[]; ladefehler: boolean }>({ saisons: [], ladefehler: false })
  useEffect(() => {
    let abgebrochen = false
    api.getSeasons()
      .then(saisons => { if (!abgebrochen) setStand({ saisons, ladefehler: false }) })
      .catch(() => { if (!abgebrochen) setStand({ saisons: [], ladefehler: true }) })
    return () => { abgebrochen = true }
  }, [])
  return stand
}
