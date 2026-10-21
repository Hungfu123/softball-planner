import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFreiesFeld } from '@/hooks/useFreiesFeld'
import { PlayBoard } from './PlayBoard'
import { useBoardGesten } from './useBoardGesten'
import { BASES } from './board/geometry'
import { LegendSheet } from './LegendSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

/** Die drei Bases in BILDSCHIRM-Reihenfolge: links die 3, rechts die 1. */
const RUNNER_BASES = [
  { index: 3, label: '3' },
  { index: 2, label: '2' },
  { index: 1, label: '1' },
]

/**
 * Das freie Feld.
 *
 * Ein Board zum Draufzeigen, kein Play. Es entsteht nichts im Katalog: kein Titel, keine
 * Kategorie, keine Staende. Trotzdem bleibt der Stand stehen, bis man ihn selbst
 * zuruecksetzt — er liegt im Geraet, nicht auf dem Server, und genau deshalb funktioniert
 * die Seite ohne Netz. Sie ruft kein /api auf.
 *
 * Fuer die Pause gedacht: aufmachen, schieben, reden. Die Bewegung ist der Finger, nicht
 * eine Animation — deshalb gibt es keine Staende, keine Zeitleiste und kein Abspielen.
 */
export default function FreiesFeldPage() {
  const feld = useFreiesFeld()
  const flaeche = useRef<HTMLDivElement>(null)
  const [groesse, setGroesse] = useState({ w: 390, h: 500 })
  /**
   * Zuschnitt nach Inhalt, nicht ganzes Feld.
   *
   * Das ganze Feld ist breiter als hoch; auf einem hochkant gehaltenen Handy bleibt
   * darueber fast die Haelfte leeres Gras und die Raute klebt unten. Beim Play ist das
   * richtig — dort ist Home der Anker und oben passiert das Spiel. Hier will man das
   * Infield gross. Mit "Feld" schaltet man auf den ganzen Platz, wenn ein Outfielder
   * weit draussen steht.
   */
  const [vollesFeld, setVollesFeld] = useState(false)
  const [legende, setLegende] = useState(false)
  const [zuruecksetzen, setZuruecksetzen] = useState(false)

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
    markers: feld.markers,
    // Ein einziger Stand: der Zuschnitt richtet sich nach dem, was dasteht.
    steps: [{ ordinal: 1, durationMs: 1200, note: null, outs: 0, markers: feld.markers }],
    vollesFeld,
    groesse,
    pointerFine,
    flaeche,
    beginGesture: feld.beginGesture,
    endGesture: feld.endGesture,
    moveMarker: feld.moveMarker,
    dropMarker: feld.dropMarker,
    onTapRunner: feld.removeRunner,
  })

  /**
   * Die blasse und die kraeftige Ballbahn.
   *
   * Dasselbe Mittel wie in den Plays: `previous` traegt den letzten Wurf, `ghost` den
   * davor. Hier kommen beide aus dem Gedaechtnis des freien Feldes statt aus Staenden.
   */
  const bahn = (punkt: { x: number; y: number } | null) =>
    punkt ? { ...feld.markers, ball: { ...feld.markers.ball, ...punkt } } : null

  return (
    // Querformat und Desktop wie im Editor: Feld links ueber die ganze Hoehe, Leiste
    // rechts. grid-cols-1 begrenzt im Hochformat die Spalte — ohne das waechst sie auf
    // die breiteste Inhaltsbreite und schiebt die Kopfzeile aus dem Bild.
    <div className="grid h-dvh grid-cols-1 grid-rows-[52px_1fr_auto] overflow-hidden landscape:grid-cols-[1fr_340px] landscape:grid-rows-[52px_minmax(0,1fr)_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-[52px_minmax(0,1fr)_auto]">
      <header className="flex items-center gap-3 border-b border-cream-200 px-4 landscape:col-start-2 lg:col-start-2">
        <Link to="/orga/playmaker" className="font-display text-xs font-bold text-gray-500">
          Zurück
        </Link>
        <h1 className="min-w-0 flex-1">
          <span className="block truncate font-headline text-lg font-extrabold uppercase tracking-wide text-navy-900">
            Freies Feld
          </span>
        </h1>
        <button
          type="button"
          onClick={() => setLegende(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-cream-300 font-display text-xs font-bold text-gray-500"
          aria-label="Legende"
        >
          ?
        </button>
      </header>

      <div
        ref={flaeche}
        className="min-h-0 bg-[#93B268] landscape:col-start-1 landscape:row-span-3 landscape:row-start-1 lg:col-start-1 lg:row-span-3 lg:row-start-1"
      >
        <PlayBoard
          markers={feld.markers}
          previous={bahn(feld.ballVorher)}
          ghost={bahn(feld.ballDavor)}
          mode={vollesFeld ? 'full' : 'content'}
          width={groesse.w}
          height={groesse.h}
          pointerFine={pointerFine}
          {...boardProps}
        />
      </div>

      <div className="border-t border-cream-200 px-4 pb-3 pt-2 safe-bottom landscape:col-start-2 lg:col-start-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Runner
          </span>
          {RUNNER_BASES.map(b => {
            const besetzt = feld.markers.runners.some(
              r => Math.hypot(r.x - BASES[b.index].x, r.y - BASES[b.index].y) < 12,
            )
            return (
              <button
                key={b.index}
                type="button"
                onClick={() => feld.toggleBase(b.index)}
                aria-pressed={besetzt}
                aria-label={`Runner auf ${b.label}`}
                className={`h-11 w-11 rounded-xl font-display text-sm font-bold ${
                  besetzt ? 'bg-softball-red-700 text-cream-50' : 'border border-cream-300 bg-white text-navy-900'
                }`}
              >
                {b.label}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Knopf onClick={() => setVollesFeld(v => !v)} active={vollesFeld}>
            Feld
          </Knopf>
          <Knopf onClick={feld.undo} disabled={!feld.canUndo} aria-label="Rückgängig">
            ↶
          </Knopf>
          <span className="flex-1" />
          <Knopf onClick={() => setZuruecksetzen(true)}>Zurücksetzen</Knopf>
        </div>
      </div>

      {legende && <LegendSheet onClose={() => setLegende(false)} />}

      {zuruecksetzen && (
        <ConfirmModal
          title="Feld zurücksetzen?"
          message="Standardaufstellung, keine Runner, Ball an Home. Die aufgebaute Situation ist dann weg."
          confirmLabel="Zurücksetzen"
          onConfirm={() => {
            feld.reset()
            setZuruecksetzen(false)
          }}
          onCancel={() => setZuruecksetzen(false)}
        />
      )}
    </div>
  )
}

function Knopf({
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
