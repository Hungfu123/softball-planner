import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ladePlayMitRueckfall } from './ladePlay'
import { usePlayback, type PlaybackSpeed } from '@/hooks/usePlayback'
import { PlayBoard } from './PlayBoard'
import { PlaybackBar } from './PlaybackBar'
import { LegendSheet } from './LegendSheet'
import { StepList } from './StepList'
import type { Play } from './board/types'
import { useRolle } from '@/hooks/useRolle'

const TEMPI: PlaybackSpeed[] = [1, 0.5, 2]

export default function PlayViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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

  if (fehler?.id === Number(id)) return <p className="p-6 text-sm text-gray-500">{fehler.text}</p>
  if (!play || play.id !== Number(id)) {
    return <p className="p-6 text-sm text-gray-500">Play wird geladen …</p>
  }

  return (
    <Viewer
      key={play.id}
      play={play}
      gegenstueck={gegenstueck?.id === play.counterpartPlayId ? gegenstueck : null}
      onEdit={() => navigate(`/orga/playmaker/${play.id}/bearbeiten`)}
    />
  )
}

function Viewer({
  play,
  gegenstueck,
  onEdit,
}: {
  play: Play
  gegenstueck: Play | null
  onEdit: () => void
}) {
  const { istAdmin } = useRolle()
  const [loop, setLoop] = useState(false)
  const [tempoIndex, setTempoIndex] = useState(0)
  const [legende, setLegende] = useState(false)
  const [groesse, setGroesse] = useState({ w: 390, h: 500 })
  const flaeche = useRef<HTMLDivElement>(null)

  const wiedergabe = usePlayback(play.steps, { loop, speed: TEMPI[tempoIndex] })

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
    <div className="grid h-dvh grid-rows-[52px_1fr_auto_auto] grid-cols-1 overflow-hidden landscape:grid-cols-[1fr_340px] landscape:grid-rows-[52px_minmax(0,1fr)_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-[52px_minmax(0,1fr)_auto]">
      <header className="flex items-center gap-3 border-b border-cream-200 px-4 landscape:col-start-2 lg:col-start-2">
        <Link
          to="/orga/playmaker"
          className="-ml-1 flex h-11 shrink-0 items-center px-1 font-display text-xs font-bold text-gray-500"
        >
          Zurück
        </Link>
        {/* Der Titel steht im span, nicht direkt im h1: index.css setzt ungeschichtet
            h1 { text-wrap: balance }, und ungeschichtetes CSS schlaegt Tailwinds
            @layer utilities — truncate waere am h1 wirkungslos und der Titel braeche um. */}
        <h1 className="min-w-0 flex-1">
          <span className="block truncate font-headline text-lg font-extrabold uppercase tracking-wide text-navy-900">
            {play.title}
          </span>
        </h1>
        <button
          type="button"
          onClick={() => setLegende(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-500"
          aria-label="Legende"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cream-300 font-display text-xs font-bold">
            ?
          </span>
        </button>
        {istAdmin && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-11 shrink-0 items-center px-1 font-display text-xs font-bold text-gray-500"
          >
            Ändern
          </button>
        )}
        <div className="flex gap-1.5" role="group" aria-label="Outs">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < (wiedergabe.step?.outs ?? 0) ? 'bg-navy-800' : 'bg-cream-300'}`}
            />
          ))}
        </div>
      </header>

      <div
        ref={flaeche}
        className="min-h-0 bg-[#93B268] landscape:col-start-1 landscape:row-span-3 landscape:row-start-1 lg:col-start-1 lg:row-span-3 lg:row-start-1"
        // Umschalten, nicht nur pausieren: siehe Kommentar vor dem return.
        onClick={wiedergabe.toggle}
      >
        {wiedergabe.markers && (
          <PlayBoard
            markers={wiedergabe.markers}
            steps={play.steps}
            previous={wiedergabe.previous}
            spur={wiedergabe.spur}
            ghost={wiedergabe.ghost}
            mode={breit ? 'full' : 'content'}
            width={groesse.w}
            height={groesse.h}
            pointerFine={pointerFine}
          />
        )}
      </div>

      <div className="min-h-0 landscape:col-start-2 landscape:flex landscape:flex-col lg:col-start-2 lg:flex lg:flex-col">
        <p className="px-4 py-2.5 text-sm leading-snug text-navy-900">{wiedergabe.step?.note ?? ''}</p>
        {/* Nur wo Platz ist: am Handy traegt die Zeitleiste allein. */}
        <div className="hidden min-h-0 overflow-y-auto landscape:block lg:block">
          <StepList steps={play.steps} current={wiedergabe.index} onSelect={wiedergabe.seek} />
        </div>
      </div>

      <div className="landscape:col-start-2 lg:col-start-2">
        {gegenstueck && (
          <Link
            to={`/orga/playmaker/${gegenstueck.id}`}
            className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-dashed border-cream-400 bg-white p-2.5"
          >
            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg">
              <PlayBoard markers={gegenstueck.steps[0].markers} steps={gegenstueck.steps} width={48} height={40} interactive={false} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-xs font-extrabold text-navy-900">
                Gegenstück: {gegenstueck.title}
              </div>
              <div className="truncate text-[11px] text-gray-500">{gegenstueck.gameStateNote ?? 'Andere Lage'}</div>
            </div>
          </Link>
        )}
        <PlaybackBar
          count={play.steps.length}
          index={wiedergabe.index}
          fortschritt={wiedergabe.fortschritt}
          playing={wiedergabe.playing}
          canPlay={wiedergabe.canPlay}
          loop={loop}
          speed={TEMPI[tempoIndex]}
          onSeek={wiedergabe.seek}
          onPrev={wiedergabe.prev}
          onNext={wiedergabe.next}
          onToggle={wiedergabe.toggle}
          onLoop={() => setLoop(v => !v)}
          onSpeed={() => setTempoIndex(i => (i + 1) % TEMPI.length)}
        />
      </div>

      {legende && <LegendSheet onClose={() => setLegende(false)} />}
    </div>
  )
}
