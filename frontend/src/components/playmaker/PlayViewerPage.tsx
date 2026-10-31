import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ladePlayMitRueckfall } from './ladePlay'
import { usePlayback } from '@/hooks/usePlayback'
import { PlayBoard } from './PlayBoard'
import { beteiligte } from './board/beteiligte'
import { nachbarn } from './nachbarn'
import { usePlays } from '@/hooks/usePlays'
import { PlaybackBar } from './PlaybackBar'
import { LegendSheet } from './LegendSheet'
import { StepList } from './StepList'
import type { Play } from './board/types'
import { useRolle } from '@/hooks/useRolle'


export default function PlayViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  /*
   * Die Liste liegt ohnehin im Speicher — sie traegt das Blaettern von Play zu Play.
   * Also wird daraus auch das Play selbst genommen, solange der Einzelabruf laeuft:
   * sonst steht zwischen zwei Plays „Play wird geladen", und ein Tipp auf „Naechstes
   * Play" sah aus wie ein Neuladen der Seite.
   */
  const { plays } = usePlays()
  const [play, setPlay] = useState<Play | null>(null)
  const [gegenstueck, setGegenstueck] = useState<Play | null>(null)
  // Mit id: ein Fehler von Play 3 darf nach dem Wechsel auf 7 nicht stehen bleiben, und
  // der Effekt muss dafuer nichts synchron zuruecksetzen.
  const [fehler, setFehler] = useState<{ id: number; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    // Abbruchmarke fuer BEIDE Anfragen: das Gegenstueck kommt verschachtelt nach und
    // haette sonst nach einem Wechsel der id das Gegenstueck des alten Plays gesetzt.
    let abgebrochen = false
    ladePlayMitRueckfall(Number(id))
      .then(p => {
        if (abgebrochen) return
        setPlay(p)
        if (p.counterpartPlayId) {
          ladePlayMitRueckfall(p.counterpartPlayId)
            .then(g => {
              if (!abgebrochen) setGegenstueck(g)
            })
            .catch(() => {
              if (!abgebrochen) setGegenstueck(null)
            })
        }
      })
      .catch(() => {
        if (abgebrochen) return
        setFehler({
          id: Number(id),
          text:
            'Dieses Play liegt nicht im Zwischenspeicher. Ohne Netz zeigt der Playmaker nur, ' +
            'was schon einmal geladen wurde.',
        })
      })
    return () => {
      abgebrochen = true
    }
  }, [id])

  const gezeigt = play?.id === Number(id) ? play : (plays.find(p => p.id === Number(id)) ?? null)

  if (!gezeigt && fehler?.id === Number(id)) {
    return <p className="min-h-dvh bg-navy-900 p-6 text-sm text-cream-50/70">{fehler.text}</p>
  }
  if (!gezeigt) {
    return <p className="min-h-dvh bg-navy-900 p-6 text-sm text-cream-50/70">Play wird geladen …</p>
  }

  return (
    <Viewer
      key={gezeigt.id}
      play={gezeigt}
      plays={plays}
      gegenstueck={gegenstueck?.id === gezeigt.counterpartPlayId ? gegenstueck : null}
      onEdit={() => navigate(`/orga/playmaker/${gezeigt.id}/bearbeiten`)}
    />
  )
}

function Viewer({
  play,
  plays,
  gegenstueck,
  onEdit,
}: {
  play: Play
  /** Die ganze Liste — fuer das Blaettern innerhalb der Kategorie. */
  plays: Play[]
  gegenstueck: Play | null
  onEdit: () => void
}) {
  const { istAdmin } = useRolle()
  const [legende, setLegende] = useState(false)
  const [groesse, setGroesse] = useState({ w: 390, h: 500 })
  const flaeche = useRef<HTMLDivElement>(null)

  // Beim Oeffnen laeuft es los, wie eine Karte im Spielwissen: man kommt an, es bewegt sich.
  const wiedergabe = usePlayback(play.steps, { autostart: true })
  /*
   * Auf wen es ankommt — abgeleitet aus den Staenden, nicht gepflegt. Neun Scheiben
   * stehen im Bild, drei davon tun etwas; wer zuschaut, um es zu lernen, soll die drei
   * finden, ohne das Play dreimal laufen zu lassen.
   */
  const achtung = useMemo(() => beteiligte(play.steps), [play.steps])
  /*
   * Blaettern wie in einem Kapitel des Spielwissens, und das Kapitel ist die Kategorie.
   * Die Liste kommt aus demselben Abruf wie die Uebersicht — sie liegt im Cache, und
   * ohne sie blaettert hier eben nichts.
   */
  const blaettern = useMemo(() => nachbarn(plays, play), [plays, play])

  useEffect(() => {
    const messen = () => {
      const rect = flaeche.current?.getBoundingClientRect()
      if (rect) setGroesse({ w: rect.width, h: rect.height })
    }
    messen()
    window.addEventListener('resize', messen)
    return () => window.removeEventListener('resize', messen)
  }, [])

  const pointerFine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches
  const breit = groesse.w >= 900

  // Querformat zaehlt wie Desktop — sonst bleibt am quer gehaltenen Handy ein
  // 182 px hohes Band fuers Feld.
  //
  // Ein Tipp aufs Feld SCHALTET UM, er pausiert nicht nur. Das Feld fuellt am Handy den
  // halben Bildschirm; ein Streiftipp hielt die Wiedergabe lautlos an, und der naechste
  // Druck auf den Knopf startete sie wieder — er stand ja inzwischen auf ▶.
  return (
    <div className="grid h-dvh grid-rows-[52px_1fr_auto_auto] grid-cols-1 overflow-hidden bg-navy-900 text-cream-50 landscape:grid-cols-[1fr_340px] landscape:grid-rows-[52px_minmax(0,1fr)_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-[52px_minmax(0,1fr)_auto]">
      <header className="flex items-center gap-3 border-b border-cream-50/12 px-4 landscape:col-start-2 lg:col-start-2">
        <Link
          to="/orga/playmaker"
          className="-ml-2 flex h-11 shrink-0 items-center rounded-lg px-2.5 font-display text-xs font-bold text-cream-50/70 active:bg-cream-50/10 active:text-cream-50"
        >
          Zurück
        </Link>
        {/* Der Titel steht im span, nicht direkt im h1: index.css setzt ungeschichtet
            h1 { text-wrap: balance }, und ungeschichtetes CSS schlaegt Tailwinds
            @layer utilities — truncate waere am h1 wirkungslos und der Titel braeche um. */}
        <h1 className="min-w-0 flex-1">
          <span className="block truncate font-headline text-lg font-extrabold uppercase tracking-wide text-amber-400">
            {play.title}
          </span>
        </h1>
        <button
          type="button"
          onClick={() => setLegende(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-cream-50/70"
          aria-label="Legende"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cream-50/30 font-display text-xs font-bold">
            ?
          </span>
        </button>
        {istAdmin && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-11 shrink-0 items-center rounded-lg px-2.5 font-display text-xs font-bold text-cream-50/70 active:bg-cream-50/10 active:text-cream-50"
          >
            Ändern
          </button>
        )}
        {/*
          Die Outs stehen nur da, wenn es welche GIBT.

          Drei graue Punkte oben rechts sahen aus wie die Schwierigkeitspunkte aus dem
          Spielwissen — dieselbe Groesse, dieselbe Form, zwei Tipps voneinander entfernt
          und etwas voellig anderes gemeint. Bei null Outs sagten sie ohnehin nichts, was
          die Notiz nicht schon sagt („keine Outs"). Sobald einer rot ist, ist die Sache
          eindeutig, und das Wort daneben macht sie es auch fuer den, der die Punkte zum
          ersten Mal sieht. Nebenbei bekommt der Titel in den meisten Staenden die Breite
          zurueck, die er zum Ausschreiben braucht.
        */}
        {(wiedergabe.step?.outs ?? 0) > 0 && (
          <div
            className="flex shrink-0 items-center gap-1.5"
            role="group"
            aria-label={`${wiedergabe.step?.outs} Outs`}
          >
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-cream-50/50">
              {wiedergabe.step?.outs === 1 ? 'Out' : 'Outs'}
            </span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  /*
                   * Rot, nicht amber. Auf dieser Buehne heisst rot Out — der ausgemachte
                   * Runner ist rot, und die Punkte zaehlen genau diese Outs. Amber gehoert
                   * dem, worauf man achtet: der Ballkette und dem Weg zum naechsten Play.
                   * Der hellere Ton (statt softball-red) misst auf Navy 4,3:1 statt 2,7:1.
                   */
                  className={`h-2.5 w-2.5 rounded-full ${i < (wiedergabe.step?.outs ?? 0) ? 'bg-[#EE5A68]' : 'bg-cream-50/20'}`}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      <div
        ref={flaeche}
        className="min-h-0 bg-navy-900 landscape:col-start-1 landscape:row-span-3 landscape:row-start-1 lg:col-start-1 lg:row-span-3 lg:row-start-1"
        // Umschalten, nicht nur pausieren: siehe Kommentar vor dem return.
        onClick={wiedergabe.toggle}
      >
        {wiedergabe.markers && (
          <PlayBoard
            markers={wiedergabe.markers}
            steps={play.steps}
            previous={wiedergabe.previous}
            spur={wiedergabe.spur}
            beteiligt={achtung}
            ghost={wiedergabe.ghost}
            mode={breit ? 'full' : 'content'}
            width={groesse.w}
            height={groesse.h}
            pointerFine={pointerFine}
          />
        )}
      </div>

      <div className="min-h-0 landscape:col-start-2 landscape:flex landscape:flex-col lg:col-start-2 lg:flex lg:flex-col">
        {/* Der Satz zum Stand, wie die Zeile unter einer Karte im Spielwissen. */}
        <p className="px-4 pt-2.5 text-sm leading-snug text-cream-50/80">{wiedergabe.step?.note ?? ''}</p>
        {achtung.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1.5">
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-cream-50/50">
              Achte auf
            </span>
            {achtung.map(position => (
              <span
                key={position}
                className="font-display rounded-full border border-amber-400/70 px-2 py-0.5 text-[11px] font-extrabold text-amber-400"
              >
                {position}
              </span>
            ))}
          </p>
        )}
        {/* Nur wo Platz ist: am Handy traegt die Zeitleiste allein. */}
        <div className="hidden min-h-0 overflow-y-auto landscape:block lg:block">
          <StepList steps={play.steps} current={wiedergabe.index} onSelect={wiedergabe.seek} />
        </div>
      </div>

      <div className="landscape:col-start-2 lg:col-start-2">
        {gegenstueck && (
          <Link
            to={`/orga/playmaker/${gegenstueck.id}`}
            className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-dashed border-cream-50/25 bg-cream-50/5 p-2.5 active:bg-cream-50/10"
          >
            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg">
              {gegenstueck.steps[0] ? (
                <PlayBoard markers={gegenstueck.steps[0].markers} steps={gegenstueck.steps} width={48} height={40} interactive={false} />
              ) : (
                <div className="h-full w-full bg-cream-50/10" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-xs font-extrabold text-cream-50">
                Gegenstück: {gegenstueck.title}
              </div>
              <div className="truncate text-[11px] text-cream-50/60">{gegenstueck.gameStateNote ?? 'Andere Lage'}</div>
            </div>
          </Link>
        )}
        {blaettern.anzahl > 1 && (
          <div className="flex items-center gap-2 border-t border-cream-50/12 px-4 py-2">
            {/*
              Am ersten Play stand hier ein leerer Platzhalter. Er hielt die Breite und
              sagte sonst nichts — man sah nicht, dass es ueberhaupt einen Weg zurueck
              gibt, sondern nur eine Luecke. Drueben in der Offense steht an derselben
              Stelle der abgeschaltete Knopf, und das ist die bessere Antwort: er zeigt
              die Richtung UND dass sie hier zu Ende ist.
            */}
            {blaettern.vorheriges ? (
              <Link
                to={`/orga/playmaker/${blaettern.vorheriges.id}`}
                aria-label="Vorheriges Play"
                className="font-display flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-cream-50/25 text-cream-50 active:bg-cream-50/10"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-cream-50/25 text-cream-50 opacity-35"
              >
                <ChevronLeft size={20} />
              </span>
            )}
            <span className="font-display flex-1 truncate text-center text-[11px] font-bold uppercase tracking-widest text-cream-50/55">
              Play {blaettern.nummer} von {blaettern.anzahl}
            </span>
            {blaettern.naechstes ? (
              <Link
                to={`/orga/playmaker/${blaettern.naechstes.id}`}
                className="font-display flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-5 text-[11px] font-extrabold uppercase tracking-widest text-navy-900 active:brightness-110"
              >
                Nächstes Play
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/orga/playmaker"
                className="font-display flex h-12 shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-5 text-[11px] font-extrabold uppercase tracking-widest text-navy-900 active:brightness-110"
              >
                Fertig
              </Link>
            )}
          </div>
        )}

        <PlaybackBar
          playing={wiedergabe.playing}
          canPlay={wiedergabe.canPlay}
          onToggle={wiedergabe.toggle}
          onNochmal={wiedergabe.nochmal}
        />
      </div>

      {legende && <LegendSheet onClose={() => setLegende(false)} />}
    </div>
  )
}
