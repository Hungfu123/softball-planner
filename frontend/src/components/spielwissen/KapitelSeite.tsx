import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { KAPITEL, findeKapitel, type Kapitel } from './kapitel'
import { Karte } from './Karte'
import { spielermodusAktiv } from '@/hooks/useSpielermodus'
import { RefreshIcon } from '@/icons'

/**
 * Ein Kapitel, **eine Karte auf einmal, und sie fuellt den Bildschirm**.
 *
 * Vorher lagen alle untereinander. Gemessen war ein Kapitel damit rund drei Bildschirme
 * hoch, und bis zu drei Karten standen gleichzeitig weit genug im Bild, um loszulaufen —
 * drei Sequenzen nebeneinander, keine mit einem Blick darauf. Dagegen half, immer nur die
 * mittlere spielen zu lassen; der Grund dafuer blieb aber bestehen: eine Animation, die
 * etwas erklaert, braucht die ganze Flaeche und einen Anfang, den man nicht verpasst.
 *
 * Beim Blaettern bekommt sie beides. Der Preis ist das Ueberfliegen, und den traegt die
 * Uebersicht: sie nennt je Kapitel die Stichworte, man landet also nicht im falschen.
 *
 * **Dieselbe Ansicht wie ein Play.** Kopfleiste mit Zurueck und Titel, die Buehne im
 * `1fr`, darunter die Aussage, dann die Blaetterleiste und zuunterst „nochmal" — Zeile
 * fuer Zeile dasselbe wie in der Defense. Vorher war die Karte ein Kasten mitten auf
 * einer cremefarbenen Seite mit App-Navigation darueber: das Play nahm den ganzen
 * Bildschirm, die Karte zeigte einen Ausschnitt. Die Seite laeuft deshalb wie der
 * Play-Viewer **ausserhalb des Layouts** (`routes.tsx`) — innerhalb waere der Rest
 * zwangslaeufig ueberlang und die Seite wuerde scrollen.
 *
 * **Ein unbekanntes Kapitel geht zurueck auf die Uebersicht.** Die Adresse steht jedem
 * offen, und ein Tippfehler darf keine leere Seite ergeben.
 */
export default function KapitelSeite() {
  const { kapitel: id } = useParams()
  const kapitel = findeKapitel(id)

  if (!kapitel) return <Navigate to="/spielwissen" replace />

  /*
   * Der `key` setzt den Blaetterer beim Kapitelwechsel zurueck. Als Effekt waere das
   * abgeleiteter Zustand: ein zweiter Rendergang, in dem die Seite kurz die falsche
   * Karte zeigt.
   */
  return <Blaetterer key={kapitel.id} kapitel={kapitel} />
}

function Blaetterer({ kapitel }: { kapitel: Kapitel }) {
  const [nr, setNr] = useState(0)
  const [richtung, setRichtung] = useState(1)
  /*
   * „nochmal" liegt unten am Bildschirmrand und nicht mehr in der Karte — der Zaehler
   * also hier. Beim Blaettern faengt er bei null an: die neue Karte laeuft ohnehin von
   * selbst los, ein geerbter Stand haette sie nur doppelt gestartet.
   */
  const [lauf, setLauf] = useState(0)
  /*
   * Direkt aus dem localStorage, nicht ueber `useRolle`: das haengt an `useAuth` und damit
   * am Provider. Das Spielwissen ist die Haelfte der App, die ohne Netz und ohne Konto
   * funktionieren soll — eine Seite, die beim Fehlen des Providers in den Fehlerrand
   * faellt, waere das Gegenteil. Reaktiv muss es nicht sein: das Umschalten laedt die App
   * ohnehin neu.
   */
  const spielermodus = spielermodusAktiv()
  const ruhig = Boolean(useReducedMotionConfig())

  const anzahl = kapitel.karten.length

  const blaettern = useCallback((schritt: number) => {
    setRichtung(schritt)
    setNr(n => Math.min(Math.max(n + schritt, 0), anzahl - 1))
    setLauf(0)
  }, [anzahl])

  /* Am Rechner blaettert man mit den Pfeiltasten, nicht mit der Maus zum Knopf. */
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') blaettern(1)
      if (e.key === 'ArrowLeft') blaettern(-1)
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [blaettern])

  const karte = kapitel.karten[nr]
  const letzte = nr === anzahl - 1
  const naechstesKapitel = KAPITEL[KAPITEL.findIndex(k => k.id === kapitel.id) + 1]
  /* Eine Karte mit eigenen Knoepfen laeuft nicht ab, sie wird bedient — „nochmal" waere
     dort ein zweiter Weg zum selben Ziel. */
  const mitNochmal = !ruhig && !karte.selbstgesteuert

  /*
   * Dasselbe Raster wie der Play-Viewer, bis auf die Zeilenhoehen: Kopf, Buehne, Aussage,
   * Leisten. Quer und am Rechner wandert die Buehne in eine eigene Spalte, damit sie
   * nicht zu einem Band zusammenschrumpft — drueben aus demselben Grund.
   */
  return (
    <div className="grid h-dvh grid-cols-1 grid-rows-[52px_1fr_auto_auto] overflow-hidden bg-navy-900 text-cream-50 landscape:grid-cols-[1fr_340px] landscape:grid-rows-[52px_minmax(0,1fr)_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-[52px_minmax(0,1fr)_auto]">
      <header className="flex items-center gap-3 border-b border-cream-50/12 px-4 landscape:col-start-2 lg:col-start-2">
        <Link
          to="/spielwissen"
          className="-ml-2 flex h-11 shrink-0 items-center rounded-lg px-2.5 font-display text-xs font-bold text-cream-50/70 active:bg-cream-50/10 active:text-cream-50"
        >
          Zurück
        </Link>
        {/* Der Titel steht im span, nicht direkt im h1: index.css setzt ungeschichtet
            h1 { text-wrap: balance }, und ungeschichtetes CSS schlaegt Tailwinds
            @layer utilities — truncate waere am h1 wirkungslos und der Titel braeche um. */}
        <h1 className="min-w-0 flex-1">
          <span className="block truncate font-headline text-lg font-extrabold uppercase tracking-wide text-amber-400">
            {kapitel.titel}
          </span>
        </h1>
        {/*
          Die Stufe mit dem Wort daneben, wie drueben die Outs. Drei blanke Punkte sagen
          niemandem, was sie zaehlen — und drueben zaehlen Punkte etwas anderes.

          Cream, nicht amber: Amber gibt es auf dieser Seite genau einmal, und das ist der
          Weg vorwaerts in der Leiste unten. Und nicht `StufePunkte` aus `shared`: das
          Bauteil faerbt sich aus den Tokens, und `ink-strong` ist im hellen Theme Navy —
          auf dieser Seite, die in BEIDEN Themes navy ist, waere es unsichtbar.
        */}
        <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={`Stufe ${kapitel.stufe} von 3`}>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-cream-50/50">
            Stufe
          </span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i < kapitel.stufe ? 'bg-cream-50/85' : 'bg-cream-50/20'}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/*
        `overflow-x-hidden`: die abtretende Karte faehrt um 40 px nach links aus dem Bild.
        Ohne den Riegel verbreitert das kurz das Dokument (gemessen 27 bis 28 px), die
        Seite laesst sich waehrenddessen quer schieben und wackelt beim Blaettern.

        **Hier war einmal ein Wisch, und er ist absichtlich wieder weg.** Drei Anlaeufe,
        alle gemessen gescheitert: mit motions `drag` blieb die Karte nach einem halben
        Wisch bei translateX(-95px) schief stehen; mit einer eigenen Feder blieb bei jedem
        zweiten Wisch ein Rest von 59 px haengen; und mit reiner Zeiger-Erkennung blaetterte
        nur rund jeder zweite Wisch, bis die Seite ganz aufhoerte zu reagieren. Eine Geste,
        die zwei von drei Mal geht, ist schlimmer als keine — der Mensch haelt dann die App
        fuer kaputt und nicht seinen Finger.

        Geblieben sind Weiter, Zurueck und die Pfeiltasten.
      */}
      <div className="min-h-0 overflow-x-hidden landscape:col-start-1 landscape:row-span-3 landscape:row-start-1 lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={karte.id}
            className="h-full"
            initial={ruhig ? false : { opacity: 0, x: richtung * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={ruhig ? { opacity: 0 } : { opacity: 0, x: richtung * -40 }}
            transition={{ duration: ruhig ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <Karte karte={karte} aktiv lauf={lauf} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/*
        Die Aussage unter der Buehne, wie die Notiz unter dem Feld. Eigene
        `AnimatePresence` mit demselben `key` und demselben `mode`: so wechselt der Text
        im selben Takt wie das Bild. Ohne das stuende die neue Pointe 220 ms lang unter
        der alten, noch abtretenden Buehne.
      */}
      <div className="min-h-0 px-4 landscape:col-start-2 lg:col-start-2">
        <p className="font-display pt-2.5 text-[10px] font-bold uppercase tracking-widest text-cream-50/50">
          {kapitel.frage}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={karte.id}
            initial={ruhig ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ruhig ? 0 : 0.22 }}
          >
            <h2 className="font-display pt-0.5 text-base font-extrabold uppercase leading-tight tracking-wide text-amber-400 sm:text-lg">
              {karte.pointe}
            </h2>
            {karte.satz && (
              <p className="pb-2 pt-1 text-[13px] leading-snug text-cream-50/80">{karte.satz}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="landscape:col-start-2 lg:col-start-2">
        {/* Die Leiste: zurueck, wo man ist, weiter — dieselbe Zeile wie unter einem Play. */}
        <div className="flex items-center gap-2 border-t border-cream-50/12 px-4 py-2">
          <button
            type="button"
            onClick={() => blaettern(-1)}
            disabled={nr === 0}
            aria-label="Vorherige Karte"
            className="font-display flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-cream-50/25 text-cream-50 disabled:opacity-35 active:bg-cream-50/10"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <span className="font-display flex-1 truncate text-center text-[11px] font-bold uppercase tracking-widest text-cream-50/55">
            {/* „Karte 4 von 6" wie drueben „Play 6 von 9": dieselbe Zeile, dasselbe Muster. */}
            {`Karte ${nr + 1} von ${anzahl}`}
          </span>

          {letzte ? (
            naechstesKapitel ? (
              <Link
                to={`/spielwissen/${naechstesKapitel.id}`}
                className="font-display flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-5 text-[11px] font-extrabold uppercase tracking-widest text-navy-900 active:brightness-110"
              >
                {naechstesKapitel.titel}
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/spielwissen"
                className="font-display flex h-12 shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-5 text-[11px] font-extrabold uppercase tracking-widest text-navy-900 active:brightness-110"
              >
                Fertig
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={() => blaettern(1)}
              className="font-display flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-5 text-[11px] font-extrabold uppercase tracking-widest text-navy-900 active:brightness-110"
            >
              Weiter
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/*
          „nochmal" unten am Rand, wo drueben die Wiedergabeleiste sitzt — gleiche Hoehe,
          gleiches Zeichen, gleiches Wort, ruhige Kante statt Farbe. Amber gibt es auf der
          Seite genau einmal, und das ist der Weg vorwaerts in der Zeile darueber.

          Im Spielermodus liegt darunter der Hinweisstreifen (fest, z-50) und deckte
          genau diese Knoepfe zu. Die Seite ist `h-dvh`, sie kann ihm nicht ausweichen,
          also macht sie ihm Platz.
        */}
        <div className={spielermodus ? 'pb-9' : undefined}>
          {mitNochmal ? (
            <div className="border-t border-cream-50/12 px-4 pb-3 pt-2 safe-bottom">
              <button
                type="button"
                onClick={() => setLauf(x => x + 1)}
                className="font-display flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-cream-50/25 text-sm font-bold text-cream-50 active:bg-cream-50/10"
              >
                <RefreshIcon size={16} />
                nochmal
              </button>
            </div>
          ) : (
            /* Ohne Knopf bleibt die Sicherheitszone unten trotzdem frei. */
            <div className="pb-2 safe-bottom" />
          )}
        </div>
      </div>
    </div>
  )
}
