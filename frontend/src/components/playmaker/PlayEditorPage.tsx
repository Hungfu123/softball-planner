import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/plays'
import { ladePlayMitRueckfall } from './ladePlay'
import { usePlayEditor } from '@/hooks/usePlayEditor'
import { PlayBoard } from './PlayBoard'
import { useBoardGesten } from './useBoardGesten'
import { StepTimeline } from './StepTimeline'
import { StepList } from './StepList'
import type { Play, PlayStep } from './board/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { RunnerSheet } from './RunnerSheet'
import { BallSheet } from './BallSheet'
import { PlayDetailsSheet, type Stammdaten } from './PlayDetailsSheet'

export default function PlayEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [play, setPlay] = useState<Play | null>(null)
  // Die id steht am Fehler mit dran: so braucht der Effekt sie nicht synchron
  // zurueckzusetzen, und ein Fehler von Play 3 bleibt beim Wechsel auf 7 nicht stehen.
  const [ladefehler, setLadefehler] = useState<{ id: number; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    // Abbruchmarke: wechselt die id, waehrend die Anfrage laeuft, darf die alte Antwort
    // das neue Play nicht mehr ueberschreiben.
    let abgebrochen = false
    ladePlayMitRueckfall(Number(id))
      .then(geladen => {
        if (!abgebrochen) setPlay(geladen)
      })
      .catch(e => {
        if (!abgebrochen) {
          setLadefehler({ id: Number(id), text: e instanceof Error ? e.message : 'Play nicht gefunden.' })
        }
      })
    return () => {
      abgebrochen = true
    }
  }, [id])

  if (ladefehler?.id === Number(id)) {
    return <p className="min-h-dvh bg-navy-900 p-6 text-sm text-cream-50/70">{ladefehler.text}</p>
  }
  // Nicht nur "schon geladen", sondern "das RICHTIGE geladen": nach einem Wechsel der id
  // liegt noch das alte Play im Zustand.
  if (!play || play.id !== Number(id)) {
    return <p className="min-h-dvh bg-navy-900 p-6 text-sm text-cream-50/70">Play wird geladen …</p>
  }

  // key: usePlayEditor liest die Staende EINMAL beim Anlegen. Ohne eigenen Baum je Play
  // behielte ein Wechsel von Play 3 zu Play 7 die Staende von Play 3 — und sicherte sie
  // dann unter der neuen id.
  return <Editor key={play.id} play={play} onBack={() => navigate(`/orga/playmaker/${play.id}`)} />
}

function Editor({ play, onBack }: { play: Play; onBack: () => void }) {
  /**
   * Titel, Kategorie, Lage und Gegenstueck liegen im Zustand, nicht nur im Prop.
   *
   * Das Autosichern schickt sie bei jeder Standaenderung mit. Blieben sie am Prop haengen,
   * ueberschriebe der naechste Zug eine gerade geaenderte Kategorie wieder mit der alten.
   */
  const [stamm, setStamm] = useState<Stammdaten>({
    title: play.title,
    categoryId: play.categoryId,
    gameState: play.gameState,
    gameStateNote: play.gameStateNote,
    counterpartPlayId: play.counterpartPlayId,
  })
  const [aendern, setAendern] = useState(false)

  const speichern = useCallback(
    async (steps: PlayStep[]) => {
      await api.updatePlay(play.id, {
        ...stamm,
        steps: steps.map(stand => ({
          ordinal: stand.ordinal,
          durationMs: stand.durationMs,
          note: stand.note,
          outs: stand.outs,
          markers: stand.markers,
        })),
      })
    },
    [play.id, stamm],
  )

  const editor = usePlayEditor(play, speichern)
  const flaeche = useRef<HTMLDivElement>(null)
  const [vollesFeld, setVollesFeld] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
  /** Angetippter Runner — gezogen wurde nicht, also will der Benutzer etwas anderes. */
  const [runnerSheet, setRunnerSheet] = useState<string | null>(null)
  /** Angetippter Ball — dahinter steckt die Frage nach Bogen oder flach. */
  const [ballSheet, setBallSheet] = useState(false)
  const [groesse, setGroesse] = useState({ w: 390, h: 500 })

  /**
   * Ungesichertes darf nicht lautlos verschwinden.
   *
   * Der Fall, um den es geht: am Platz ist kein Netz, der Kopf steht rot auf "Nicht
   * gesichert", und der Trainer tippt auf Zurueck. Vorher navigierte die Seite
   * bedingungslos und drei gebaute Staende waren weg. Jetzt blockiert die Navigation
   * innerhalb der App, und das Schliessen des Tabs fragt nach — wie beim Spieltag-Planer.
   *
   * Nicht nur bei Fehler: auch waehrend Entprellung und laufender Anfrage ist etwas
   * ungesichert. Dieselbe Groesse benutzt der Spieltag-Planer.
   */
  const ungesichert = editor.hatUngesichertes
  /**
   * Das eigene Zurueck ist kein Weglaufen.
   *
   * Der Knopf sichert erst und navigiert dann. Der Blocker liest in demselben Tick aber
   * noch den alten Wert — die Seite blieb stehen und fragte, ob man ungesicherte
   * Aenderungen verwerfen will, obwohl gerade erfolgreich gesichert wurde.
   */
  const verlaesstAbsichtlich = useRef(false)
  const blocker = useBlocker(() => ungesichert && !verlaesstAbsichtlich.current)

  useEffect(() => {
    if (!ungesichert) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [ungesichert])

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

  const { boardProps } = useBoardGesten({
    markers: editor.step.markers,
    steps: editor.steps,
    vollesFeld,
    groesse,
    pointerFine,
    flaeche,
    beginGesture: editor.beginGesture,
    endGesture: editor.endGesture,
    moveMarker: editor.moveMarker,
    dropMarker: editor.dropMarker,
    onTapRunner: setRunnerSheet,
    onTapBall: () => setBallSheet(true),
  })

  const vorher = editor.cur > 0 ? editor.steps[editor.cur - 1].markers : null

  // Querformat zaehlt wie Desktop: die Leisten gehen nach rechts, das Feld bekommt
  // die ganze Hoehe. Ohne das blieben am quer gehaltenen Handy 127 px fuers Feld —
  // ein Band, in dem die Raute verschwindet.
  return (
    <div className="grid h-dvh grid-rows-[52px_1fr_auto_auto_auto] grid-cols-1 overflow-hidden bg-navy-900 text-cream-50 landscape:grid-cols-[1fr_340px] landscape:grid-rows-[52px_auto_minmax(0,1fr)_auto_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-[52px_auto_minmax(0,1fr)_auto_auto]">
      <header className="flex items-center gap-3 border-b border-cream-50/12 px-4 landscape:col-start-2 lg:col-start-2">
        <button
          type="button"
          onClick={async () => {
            // Nur verlassen, wenn das Sichern geklappt hat. flushSave faengt den Fehler
            // selbst ab und meldet ihn als false — vorher ging die Seite trotzdem weiter.
            if (await editor.flushSave()) {
              verlaesstAbsichtlich.current = true
              onBack()
            }
          }}
          className="-ml-1 flex h-11 shrink-0 items-center px-1 font-display text-xs font-bold text-cream-50/70 active:text-cream-50"
        >
          Zurück
        </button>
        {/* Der Titel steht im span, nicht direkt im h1: index.css setzt ungeschichtet
            h1 { text-wrap: balance }, und ungeschichtetes CSS schlaegt Tailwinds
            @layer utilities — truncate waere am h1 wirkungslos und der Titel braeche um. */}
        <h1 className="min-w-0 flex-1">
          {/* Der Titel ist der Knopf: so ist das Aendern dort, wo das Ding steht, das man
              aendern will — und es kostet keinen weiteren Platz in der engen Kopfzeile. */}
          <button
            type="button"
            onClick={() => setAendern(true)}
            // Der zugaengliche Name enthaelt den Titel, nicht nur die Handlung: sonst
            // heisst die Ueberschrift der Seite fuer einen Screenreader "Play ändern"
            // und das Play selbst kommt gar nicht mehr vor.
            aria-label={`${stamm.title} ändern`}
            className="flex h-11 w-full items-center truncate text-left font-headline text-lg font-extrabold uppercase tracking-wide text-amber-400 cursor-pencil"
          >
            {stamm.title}
          </button>
        </h1>
        <SaveIndicator state={editor.saveState} onRetry={editor.retrySave} />
        <Outs value={editor.step.outs} onChange={editor.setOuts} />
      </header>

      <div
        ref={flaeche}
        className="min-h-0 bg-navy-900 landscape:col-start-1 landscape:row-span-5 landscape:row-start-1 lg:col-start-1 lg:row-span-5 lg:row-start-1"
      >
        <PlayBoard
          markers={editor.step.markers}
          steps={editor.steps}
          previous={vorher}
          mode={vollesFeld ? 'full' : 'content'}
          width={groesse.w}
          height={groesse.h}
          pointerFine={pointerFine}
          {...boardProps}
        />
      </div>

      <input
        value={editor.step.note ?? ''}
        onChange={e => editor.setNote(e.target.value)}
        placeholder="Notiz zu diesem Stand"
        className="h-10 border-0 bg-transparent px-4 text-sm text-cream-50 placeholder:text-cream-50/40 landscape:col-start-2 lg:col-start-2"
        aria-label="Notiz"
      />

      {/* Der Rahmen scrollt, nicht die Liste: in einer Grid-Zeile minmax(0,1fr) hat ein
          blosses block-Element keine gebundene Hoehe, und die Liste lief am quer
          gehaltenen Handy ueber die Werkzeugleiste darunter. */}
      <div className="hidden min-h-0 overflow-y-auto landscape:col-start-2 landscape:block lg:col-start-2 lg:block">
        <StepList steps={editor.steps} current={editor.cur} onSelect={editor.setCur} />
      </div>

      <div className="flex items-center gap-2 px-4 pb-2.5 landscape:col-start-2 lg:col-start-2">
        <ToolButton onClick={editor.addRunner}>Runner +</ToolButton>
        <ToolButton onClick={editor.resetDefense}>Standard</ToolButton>
        <ToolButton onClick={() => setVollesFeld(v => !v)} active={vollesFeld}>
          Feld
        </ToolButton>
        <ToolButton onClick={editor.undo} disabled={!editor.canUndo} aria-label="Rückgängig">
          ↶
        </ToolButton>
      </div>

      <div className="border-t border-cream-50/12 px-4 pb-3 pt-2 safe-bottom landscape:col-start-2 lg:col-start-2">
        <StepTimeline count={editor.steps.length} current={editor.cur} onSeek={editor.setCur} />
        <div className="mt-2 flex items-center gap-2">
          <ToolButton onClick={editor.addStep}>+ Stand</ToolButton>
          <span className="flex-1 whitespace-nowrap text-center font-display text-xs font-bold tabular-nums text-cream-50/60">
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

      {runnerSheet && (
        <RunnerSheet
          status={editor.step.markers.runners.find(r => r.id === runnerSheet)?.status ?? 'ACTIVE'}
          onActive={() => {
            editor.setRunnerStatus(runnerSheet, 'ACTIVE')
            setRunnerSheet(null)
          }}
          onOut={() => {
            editor.setRunnerStatus(runnerSheet, 'OUT')
            setRunnerSheet(null)
          }}
          onScored={() => {
            editor.setRunnerStatus(runnerSheet, 'SCORED')
            setRunnerSheet(null)
          }}
          onRemove={() => {
            editor.removeRunner(runnerSheet)
            setRunnerSheet(null)
          }}
          onClose={() => setRunnerSheet(null)}
        />
      )}

      {aendern && (
        <PlayDetailsSheet
          play={{ ...play, ...stamm }}
          onSpeichern={async neueStamm => {
            await api.updatePlay(play.id, {
              ...neueStamm,
              steps: editor.steps.map(stand => ({
                ordinal: stand.ordinal,
                durationMs: stand.durationMs,
                note: stand.note,
                outs: stand.outs,
                markers: stand.markers,
              })),
            })
            setStamm(neueStamm)
          }}
          onClose={() => setAendern(false)}
        />
      )}

      {ballSheet && (
        <BallSheet
          trajectory={editor.step.markers.ball.trajectory}
          onChange={editor.setBallTrajectory}
          onClose={() => setBallSheet(false)}
        />
      )}

      {blocker.state === 'blocked' && (
        <ConfirmModal
          title="Nicht gesichert"
          message="Die letzten Änderungen sind noch nicht gespeichert. Beim Verlassen gehen sie verloren."
          confirmLabel="Trotzdem verlassen"
          cancelLabel="Hierbleiben"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}

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
        active ? 'bg-cream-50 text-navy-900' : 'border border-cream-50/25 text-cream-50 active:bg-cream-50/10'
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
        className="whitespace-nowrap font-display text-xs font-bold text-[#EE5A68]"
      >
        Nicht gesichert · Erneut
      </button>
    )
  }
  return (
    <span className="whitespace-nowrap font-display text-xs font-bold text-cream-50/55">
      {state === 'speichert' ? 'Sichert …' : 'Gesichert'}
    </span>
  )
}

function Outs({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex shrink-0" role="group" aria-label="Outs">
      {[0, 1, 2].map(i => (
        // Die Flaeche ist 24x44, der Punkt bleibt 10: am Finger trifft man sonst zwischen
        // die Punkte, und die Outs springen auf den falschen Wert.
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i + 1 ? i : i + 1)}
          className="flex h-11 w-6 items-center justify-center"
          aria-label={`${i + 1} Outs`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${i < value ? 'bg-amber-400' : 'bg-cream-50/20'}`} />
        </button>
      ))}
    </div>
  )
}
