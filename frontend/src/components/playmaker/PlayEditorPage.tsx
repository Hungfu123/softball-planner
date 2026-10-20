import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/plays'
import { usePlayEditor, SNAP_RADIUS } from '@/hooks/usePlayEditor'
import { PlayBoard } from './PlayBoard'
import { StepTimeline } from './StepTimeline'
import { StepList } from './StepList'
import { BASES, FULL_FIELD } from './board/geometry'
import { computeContentBox, fitViewBox, hitRadius } from './board/layout'
import type { MarkerRef, Play, PlayStep } from './board/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

/** Wie weit der gegriffene Marker ueber die Fingerkuppe springt, in CSS-Pixeln. */
const LIFT_PX = 28

export default function PlayEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [play, setPlay] = useState<Play | null>(null)
  const [ladefehler, setLadefehler] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getPlay(Number(id))
      .then(setPlay)
      .catch(e => setLadefehler(e instanceof Error ? e.message : 'Play nicht gefunden.'))
  }, [id])

  if (ladefehler) return <p className="p-6 text-sm text-gray-500">{ladefehler}</p>
  if (!play) return <p className="p-6 text-sm text-gray-500">Play wird geladen …</p>

  return <Editor play={play} onBack={() => navigate(`/orga/playmaker/${play.id}`)} />
}

function Editor({ play, onBack }: { play: Play; onBack: () => void }) {
  const speichern = useCallback(
    async (steps: PlayStep[]) => {
      await api.updatePlay(play.id, {
        title: play.title,
        categoryId: play.categoryId,
        gameState: play.gameState,
        gameStateNote: play.gameStateNote,
        counterpartPlayId: play.counterpartPlayId,
        steps: steps.map(stand => ({
          ordinal: stand.ordinal,
          durationMs: stand.durationMs,
          note: stand.note,
          outs: stand.outs,
          markers: stand.markers,
        })),
      })
    },
    [play],
  )

  const editor = usePlayEditor(play, speichern)
  const flaeche = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ ref: MarkerRef; dx: number; dy: number } | null>(null)
  const [hint, setHint] = useState<{ x: number; y: number; snapped: boolean } | null>(null)
  const [vollesFeld, setVollesFeld] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
  const [groesse, setGroesse] = useState({ w: 390, h: 500 })

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

  /**
   * Der Zuschnitt wird waehrend des Ziehens eingefroren. Rechnet man ihn laufend neu,
   * wandert das Bild unter dem Finger und man trifft nichts mehr. Eingefroren wird im
   * Zustand, nicht in einem Ref: waehrend des Renderns liest hier niemand ein Ref.
   */
  const [eingefroren, setEingefroren] = useState<ReturnType<typeof fitViewBox> | null>(null)

  const berechnet = useMemo(
    () =>
      fitViewBox(
        vollesFeld ? FULL_FIELD : computeContentBox(editor.steps),
        Math.max(1, groesse.w),
        Math.max(1, groesse.h),
      ),
    [editor.steps, groesse.w, groesse.h, vollesFeld],
  )
  const geometrie = eingefroren ?? berechnet

  const zuBoard = (clientX: number, clientY: number) => {
    const rect = flaeche.current!.getBoundingClientRect()
    return {
      x: geometrie.viewBox.x + (clientX - rect.left) / geometrie.scale,
      y: geometrie.viewBox.y + (clientY - rect.top) / geometrie.scale,
    }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = zuBoard(e.clientX, e.clientY)
    const marker = editor.step.markers
    const reichweite = Math.max(hitRadius(geometrie.scale), 1)

    type Treffer = { ref: MarkerRef; d: number; x: number; y: number }
    let best: Treffer | null = null
    const pruefe = (ref: MarkerRef, x: number, y: number) => {
      const d = Math.hypot(p.x - x, p.y - y)
      if (best === null || d < best.d) best = { ref, d, x, y } satisfies Treffer
    }
    marker.defenders.forEach(d => pruefe({ kind: 'defender', position: d.position }, d.x, d.y))
    marker.runners
      .filter(r => r.status === 'ACTIVE')
      .forEach(r => pruefe({ kind: 'runner', id: r.id }, r.x, r.y))
    pruefe({ kind: 'ball' }, marker.ball.x, marker.ball.y)

    const treffer = best as Treffer | null
    if (!treffer || treffer.d > reichweite) return
    e.currentTarget.setPointerCapture(e.pointerId)
    editor.beginGesture()
    setEingefroren(berechnet)
    setDrag({ ref: treffer.ref, dx: treffer.x - p.x, dy: treffer.y - p.y })
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return
    const p = zuBoard(e.clientX, e.clientY)
    const lift = LIFT_PX / geometrie.scale
    const x = p.x + drag.dx
    const y = p.y + drag.dy - lift
    editor.moveMarker(drag.ref, x, y)

    const ziel =
      drag.ref.kind === 'runner'
        ? BASES.find(b => Math.hypot(b.x - x, b.y - y) < SNAP_RADIUS)
        : drag.ref.kind === 'ball'
          ? editor.step.markers.defenders.find(d => Math.hypot(d.x - x, d.y - y) < SNAP_RADIUS)
          : undefined
    setHint({ x: ziel?.x ?? x, y: ziel?.y ?? y, snapped: Boolean(ziel) })
  }

  const onPointerUp = () => {
    if (!drag) return
    if (hint) editor.dropMarker(drag.ref, hint.x, hint.y)
    setDrag(null)
    setHint(null)
    setEingefroren(null)
  }

  const vorher = editor.cur > 0 ? editor.steps[editor.cur - 1].markers : null

  return (
    <div className="grid h-dvh grid-rows-[52px_1fr_auto_auto_auto] overflow-hidden lg:grid-cols-[1fr_340px] lg:grid-rows-[52px_auto_minmax(0,1fr)_auto_auto]">
      <header className="flex items-center gap-3 border-b border-cream-200 px-4 lg:col-start-2">
        <button
          type="button"
          onClick={async () => {
            await editor.flushSave()
            onBack()
          }}
          className="font-display text-xs font-bold text-gray-500"
        >
          Zurück
        </button>
        {/* Der Titel steht im span, nicht direkt im h1: index.css setzt ungeschichtet
            h1 { text-wrap: balance }, und ungeschichtetes CSS schlaegt Tailwinds
            @layer utilities — truncate waere am h1 wirkungslos und der Titel braeche um. */}
        <h1 className="min-w-0 flex-1">
          <span className="block truncate font-headline text-lg font-extrabold uppercase tracking-wide text-navy-900">
            {play.title}
          </span>
        </h1>
        <SaveIndicator state={editor.saveState} onRetry={editor.retrySave} />
        <Outs value={editor.step.outs} onChange={editor.setOuts} />
      </header>

      <div ref={flaeche} className="min-h-0 bg-[#93B268] lg:col-start-1 lg:row-span-5 lg:row-start-1">
        <PlayBoard
          markers={editor.step.markers}
          steps={editor.steps}
          previous={vorher}
          mode={vollesFeld ? 'full' : 'content'}
          width={groesse.w}
          height={groesse.h}
          pointerFine={pointerFine}
          dropHint={hint}
          dragging={drag?.ref ?? null}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>

      <input
        value={editor.step.note ?? ''}
        onChange={e => editor.setNote(e.target.value)}
        placeholder="Notiz zu diesem Stand"
        className="h-10 border-0 bg-transparent px-4 text-sm text-navy-900 lg:col-start-2"
        aria-label="Notiz"
      />

      <div className="hidden min-h-0 lg:col-start-2 lg:block">
        <StepList steps={editor.steps} current={editor.cur} onSelect={editor.setCur} />
      </div>

      <div className="flex items-center gap-2 px-4 pb-2.5 lg:col-start-2">
        <ToolButton onClick={editor.addRunner}>Runner +</ToolButton>
        <ToolButton onClick={editor.resetDefense}>Standard</ToolButton>
        <ToolButton onClick={() => setVollesFeld(v => !v)} active={vollesFeld}>
          Feld
        </ToolButton>
        <ToolButton onClick={editor.undo} disabled={!editor.canUndo} aria-label="Rückgängig">
          ↶
        </ToolButton>
      </div>

      <div className="border-t border-cream-200 px-4 pb-3 pt-2 safe-bottom lg:col-start-2">
        <StepTimeline count={editor.steps.length} current={editor.cur} onSeek={editor.setCur} />
        <div className="mt-2 flex items-center gap-2">
          <ToolButton onClick={editor.addStep}>+ Stand</ToolButton>
          <span className="flex-1 whitespace-nowrap text-center font-display text-xs font-bold tabular-nums text-gray-500">
            <span className="hidden min-[340px]:inline">
              Stand {editor.cur + 1} von {editor.steps.length}
            </span>
            <span className="min-[340px]:hidden">
              {editor.cur + 1}/{editor.steps.length}
            </span>
          </span>
          <ToolButton onClick={editor.cycleDuration}>
            {(editor.step.durationMs / 1000).toFixed(1).replace('.', ',')} s
          </ToolButton>
          <ToolButton onClick={() => setLoeschen(true)} disabled={editor.steps.length < 2} aria-label="Stand löschen">
            ✕
          </ToolButton>
        </div>
      </div>

      {loeschen && (
        <ConfirmModal
          title="Stand löschen?"
          message={`Stand ${editor.cur + 1} wird entfernt, die übrigen werden neu nummeriert.`}
          onConfirm={() => {
            editor.deleteStep(editor.cur)
            setLoeschen(false)
          }}
          onCancel={() => setLoeschen(false)}
        />
      )}
    </div>
  )
}

function ToolButton({
  children,
  onClick,
  disabled,
  active,
  ...rest
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 shrink-0 rounded-xl px-3.5 font-display text-sm font-bold disabled:opacity-40 ${
        active ? 'bg-navy-800 text-cream-50' : 'border border-cream-300 bg-white text-navy-900'
      }`}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * "Sichert …" steht nur, solange wirklich eine Anfrage laeuft — im Prototyp blinkte es bei
 * jeder Beruehrung auf. Scheitert das Sichern, wird es rot und bleibt stehen, bis es
 * geklappt hat: ein still verlorenes halb gebautes Play ist das Schlimmste, was hier
 * passieren kann.
 */
function SaveIndicator({ state, onRetry }: { state: string; onRetry: () => void }) {
  if (state === 'fehler') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="whitespace-nowrap font-display text-xs font-bold text-softball-red-600"
      >
        Nicht gesichert · Erneut
      </button>
    )
  }
  return (
    <span className="whitespace-nowrap font-display text-xs font-bold text-gray-500">
      {state === 'speichert' ? 'Sichert …' : 'Gesichert'}
    </span>
  )
}

function Outs({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Outs">
      {[0, 1, 2].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i + 1 ? i : i + 1)}
          className={`h-2.5 w-2.5 rounded-full ${i < value ? 'bg-navy-800' : 'bg-cream-300'}`}
          aria-label={`${i + 1} Outs`}
        />
      ))}
    </div>
  )
}
