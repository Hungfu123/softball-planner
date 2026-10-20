import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/plays'
import { usePlayback, type PlaybackSpeed } from '@/hooks/usePlayback'
import { PlayBoard } from './PlayBoard'
import { PlaybackBar } from './PlaybackBar'
import { LegendSheet } from './LegendSheet'
import type { Play } from './board/types'

const TEMPI: PlaybackSpeed[] = [1, 0.5, 2]

export default function PlayViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [play, setPlay] = useState<Play | null>(null)
  const [gegenstueck, setGegenstueck] = useState<Play | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getPlay(Number(id))
      .then(p => {
        setPlay(p)
        if (p.counterpartPlayId) {
          api.getPlay(p.counterpartPlayId).then(setGegenstueck).catch(() => setGegenstueck(null))
        } else {
          setGegenstueck(null)
        }
      })
      .catch(() =>
        setFehler(
          'Dieses Play liegt nicht im Zwischenspeicher. Ohne Netz zeigt der Playmaker nur, ' +
            'was schon einmal geladen wurde.',
        ),
      )
  }, [id])

  if (fehler) return <p className="p-6 text-sm text-gray-500">{fehler}</p>
  if (!play) return <p className="p-6 text-sm text-gray-500">Play wird geladen …</p>

  return (
    <Viewer
      key={play.id}
      play={play}
      gegenstueck={gegenstueck}
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

  return (
    <div className="grid h-dvh grid-rows-[52px_1fr_auto_auto] overflow-hidden wide:grid-cols-[1fr_340px] wide:grid-rows-[52px_1fr_auto]">
      <header className="flex items-center gap-3 border-b border-cream-200 px-4 wide:col-start-2">
        <Link to="/orga/playmaker" className="font-display text-xs font-bold text-gray-500">
          Zurück
        </Link>
        <h1 className="flex-1 truncate font-headline text-lg font-extrabold uppercase tracking-wide text-navy-900">
          {play.title}
        </h1>
        <button
          type="button"
          onClick={() => setLegende(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-cream-300 font-display text-xs font-bold text-gray-500"
          aria-label="Legende"
        >
          ?
        </button>
        <button type="button" onClick={onEdit} className="font-display text-xs font-bold text-gray-500">
          Ändern
        </button>
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
        className="min-h-0 bg-[#93B268] wide:col-start-1 wide:row-span-3 wide:row-start-1"
        onClick={wiedergabe.pause}
      >
        {wiedergabe.markers && (
          <PlayBoard
            markers={wiedergabe.markers}
            steps={play.steps}
            previous={wiedergabe.previous}
            ghost={wiedergabe.ghost}
            mode={breit ? 'full' : 'content'}
            width={groesse.w}
            height={groesse.h}
            pointerFine={pointerFine}
          />
        )}
      </div>

      <p className="px-4 py-2.5 text-sm leading-snug text-navy-900 wide:col-start-2">
        {wiedergabe.step?.note ?? ''}
      </p>

      <div className="wide:col-start-2">
        {gegenstueck && (
          <Link
            to={`/orga/playmaker/${gegenstueck.id}`}
            className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-dashed border-cream-400 bg-white p-2.5"
          >
            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg">
              <PlayBoard markers={gegenstueck.steps[0].markers} steps={gegenstueck.steps} width={48} height={40} />
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
