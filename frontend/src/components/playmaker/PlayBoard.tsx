import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BASES,
  CIRCLE_RADIUS,
  FAIR_TERRITORY_PATH,
  FENCE_PATH,
  FOUL_LINES_PATH,
  FULL_FIELD,
  HOME,
  PITCHING_PLATE,
  SKIN_PATH,
  type Box,
} from './board/geometry';
import { ballAnchor, computeContentBox, fitViewBox, markerRadius } from './board/layout';
import type { MarkerRef, PlayMarkers, PlayStep } from './board/types';

/** Die Farben des Boards. Gras, Sand und Optic Yellow sind die drei neuen im Theme. */
const GRASS = '#93B268';
const SKIN = '#E3C9A4';
const CHALK = '#FFFFFF';
const INVENTORY = '#FBF6EC';
const INK = '#10133F';
const RUNNER = '#B91C2A';
const BALL = '#E6F03C';

interface Props {
  markers: PlayMarkers;
  /** Fuer den Zuschnitt: alle Staende des Plays, nicht nur der gezeigte. */
  steps?: PlayStep[];
  /** Vorherige Marker — daraus entstehen Flugbahn und Laufweg. */
  previous?: PlayMarkers | null;
  /** Blasse Bahn des Schrittes davor, fuer Cut-off-Ketten. */
  ghost?: PlayMarkers | null;
  /** 'content' schneidet nach Inhalt zu (Handy), 'full' zeigt immer das ganze Feld. */
  mode?: 'content' | 'full';
  /** Ohne Angabe misst sich das Board selbst. */
  width?: number;
  height?: number;
  pointerFine?: boolean;
  /**
   * Fester Ausschnitt von aussen. Der Editor friert ihn beim Greifen ein; ohne das
   * rechnete das Board bei jedem pointermove neu und zoomte unter dem Finger heraus,
   * waehrend die Koordinatenrechnung beim alten Massstab blieb.
   */
  viewBoxOverride?: Box | null;
  /**
   * Endpunkt der Flugbahn waehrend einer Animation. Ohne ihn wird der Bogen in jedem
   * Bild aus der aktuellen Sehne neu gerechnet und die schon gezeichnete Spur biegt
   * sich mit — es sieht aus, als peitsche die Linie.
   */
  bahnZiel?: { x: number; y: number } | null;
  /** false fuer Vorschauen: dann gilt keine Mindest-Trefferflaeche. */
  interactive?: boolean;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<SVGSVGElement>) => void;
  /** Heller Ring an der echten Ablegestelle, waehrend ein Marker am Finger haengt. */
  dropHint?: { x: number; y: number; snapped: boolean } | null;
  dragging?: MarkerRef | null;
}

/**
 * Das Spielfeld. Eine Komponente fuer Uebersicht, Setup, Editor und Spieleransicht.
 *
 * Zeichenreihenfolge ist Bedeutung: Flaechen, Linien, Platz-Inventar, Bahnen, dann die
 * beweglichen Objekte — Verteidiger, Runner, Ball. Der Ball liegt zuletzt, weil er das
 * kleinste Objekt ist und nie verdeckt werden darf.
 */
export function PlayBoard({
  markers,
  steps,
  previous = null,
  ghost = null,
  mode = 'content',
  width,
  height,
  pointerFine = false,
  interactive = true,
  viewBoxOverride = null,
  bahnZiel = null,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  dropHint = null,
  dragging = null,
}: Props) {
  /**
   * Die viewBox wird exakt auf das Seitenverhaeltnis der Flaeche gezogen, deshalb steht
   * preserveAspectRatio auf "none". Das setzt voraus, dass die uebergebene Groesse der
   * echten Elementgroesse entspricht — sonst wird verzerrt statt eingepasst. In der
   * Uebersicht und im Setup stimmte das nicht: das Hero-Feld war am Handy um Faktor 2,15
   * und am Desktop um 5,89 flachgedrueckt. Deshalb misst sich das Board selbst, wenn ihm
   * niemand eine Groesse gibt.
   */
  const huelle = useRef<HTMLDivElement>(null);
  const [gemessen, setGemessen] = useState({ w: width ?? 390, h: height ?? 612 });

  useLayoutEffect(() => {
    if (width !== undefined && height !== undefined) {
      setGemessen(alt => (alt.w === width && alt.h === height ? alt : { w: width, h: height }));
      return;
    }
    const element = huelle.current;
    if (!element) return;
    const messen = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // Nur setzen, wenn sich wirklich etwas geaendert hat. Ein neues Objekt mit
      // denselben Zahlen loest trotzdem einen Render aus — der Beobachter feuert dann
      // erneut, und die Seite laeuft in eine Schleife. Gemessen: die Wiedergabe fiel
      // dadurch von 120 auf 1 Bild je Sekunde, ohne eine einzige lange Aufgabe.
      setGemessen(alt =>
        Math.abs(alt.w - rect.width) < 0.5 && Math.abs(alt.h - rect.height) < 0.5
          ? alt
          : { w: rect.width, h: rect.height },
      );
    };
    messen();
    // Ohne ResizeObserver (aeltere Browser, jsdom) bleibt es bei der einmaligen Messung —
    // besser ein Board in der richtigen Form als gar keins.
    if (typeof ResizeObserver === 'undefined') return;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, [width, height]);

  const { viewBox, radius } = useMemo(() => {
    const content: Box =
      mode === 'full'
        ? FULL_FIELD
        : computeContentBox(steps ?? [{ ordinal: 1, durationMs: 1200, note: null, outs: 0, markers }]);
    const fitted = viewBoxOverride
      ? { viewBox: viewBoxOverride, scale: gemessen.w / viewBoxOverride.w }
      : fitViewBox(content, gemessen.w, gemessen.h);
    return { ...fitted, radius: markerRadius(fitted.scale, pointerFine, interactive) };
  }, [markers, steps, mode, gemessen.w, gemessen.h, pointerFine, interactive, viewBoxOverride]);

  const ballPosition = ballAnchor(markers, radius);
  const ballRadius = radius * 0.42;
  /**
   * Der Runner ist eine Scheibe wie der Verteidiger, nur kleiner und rot.
   *
   * Vorher war er eine Raute: Form trug die Bedeutung, Farbe verstaerkte sie. Die Raute
   * wirkte am Handy aber wie ein Fremdkoerper neben neun Kreisen, und sie sass auf den
   * Bases sichtbar schief. Jetzt unterscheiden drei Dinge: Farbe, Groesse und das
   * Kuerzel, das nur der Verteidiger traegt.
   */
  const runnerRadius = radius * 0.82;

  return (
    <div ref={huelle} style={{ width: '100%', height: '100%' }}>
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
    >
      {/* Gras bis an jede Kante — das Board hat keinen Rand, es ist Platz. */}
      <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill={GRASS} />
      <path d={FAIR_TERRITORY_PATH} fill={GRASS} />
      <path d={SKIN_PATH} fill={SKIN} />
      <path d={FOUL_LINES_PATH} fill="none" stroke={CHALK} strokeWidth={1.8} strokeLinecap="round" />
      <path d={FENCE_PATH} fill="none" stroke={CHALK} strokeWidth={1.8} strokeLinecap="round" />

      <circle cx={PITCHING_PLATE.x} cy={PITCHING_PLATE.y} r={CIRCLE_RADIUS} fill={INVENTORY} opacity={0.22} />
      <rect
        x={PITCHING_PLATE.x - 2}
        y={PITCHING_PLATE.y - 0.75}
        width={4}
        height={1.5}
        rx={0.3}
        fill={INVENTORY}
        stroke={INK}
        strokeWidth={0.4}
      />
      {BASES.slice(1).map((base, index) => (
        <rect
          key={index}
          x={base.x - 2 + innerOffset(index).dx}
          y={base.y - 2 + innerOffset(index).dy}
          width={4}
          height={4}
          transform={`rotate(45 ${base.x + innerOffset(index).dx} ${base.y + innerOffset(index).dy})`}
          fill={INVENTORY}
          stroke={INK}
          strokeWidth={0.4}
        />
      ))}
      <path
        d={`M${HOME.x - 2.4},${HOME.y - 4.4} L${HOME.x + 2.4},${HOME.y - 4.4} L${HOME.x + 2.4},${HOME.y - 2} ` +
          `L${HOME.x},${HOME.y + 0.8} L${HOME.x - 2.4},${HOME.y - 2} Z`}
        fill={INVENTORY}
        stroke={INK}
        strokeWidth={0.4}
      />

      {ghost && (
        <path
          d={ballPfad(ghost.ball, markers.ball)}
          fill="none"
          stroke={BALL}
          strokeWidth={2.4}
          strokeDasharray="5 4"
          strokeLinecap="round"
          opacity={0.35}
        />
      )}
      {previous && (
        <>
          <path
            d={ballPfad(previous.ball, bahnZiel ? { ...markers.ball, ...bahnZiel } : markers.ball)}
            fill="none"
            stroke={BALL}
            strokeWidth={2.4}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
          {markers.runners.map((runner) => {
            const vorher = previous.runners.find((r) => r.id === runner.id);
            if (!vorher) return null;
            return (
              <path
                key={`rp-${runner.id}`}
                d={`M${vorher.x},${vorher.y} L${runner.x},${runner.y}`}
                fill="none"
                stroke={RUNNER}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            );
          })}
        </>
      )}

      {markers.defenders.map((defender) => (
        <g key={defender.position} data-marker="defender" data-id={defender.position}>
          <circle cx={defender.x} cy={defender.y} r={radius} fill={INK} />
          <text
            x={defender.x}
            y={defender.y + radius * 0.22}
            textAnchor="middle"
            fill={INVENTORY}
            fontWeight={700}
            fontSize={radius * 0.62}
            style={{ pointerEvents: 'none' }}
          >
            {defender.position}
          </text>
        </g>
      ))}

      {markers.runners
        .filter((runner) => runner.status !== 'SCORED')
        .map((runner) => (
          <g
            key={runner.id}
            data-marker="runner"
            data-id={runner.id}
            data-status={runner.status}
            opacity={runner.status === 'OUT' ? 0.75 : 1}
          >
            <circle cx={runner.x} cy={runner.y} r={runnerRadius} fill={RUNNER} />
            {/* Out: durchgestrichen. Er bleibt in DIESEM Stand sichtbar, damit man den
                Tag noch sieht, und fehlt erst im naechsten. */}
            {runner.status === 'OUT' && (
              <>
                <path
                  d={`M${runner.x - runnerRadius * 0.72},${runner.y - runnerRadius * 0.72} L${runner.x + runnerRadius * 0.72},${runner.y + runnerRadius * 0.72}`}
                  stroke={INVENTORY}
                  strokeWidth={radius * 0.22}
                  strokeLinecap="round"
                />
                <path
                  d={`M${runner.x + runnerRadius * 0.72},${runner.y - runnerRadius * 0.72} L${runner.x - runnerRadius * 0.72},${runner.y + runnerRadius * 0.72}`}
                  stroke={INVENTORY}
                  strokeWidth={radius * 0.22}
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
        ))}

      {dropHint && (
        <circle
          cx={dropHint.x}
          cy={dropHint.y}
          r={dropHint.snapped ? radius * 1.25 : radius}
          fill="none"
          stroke={INVENTORY}
          strokeWidth={dropHint.snapped ? 1.2 : 1.6}
          strokeDasharray={dropHint.snapped ? '3 2.5' : undefined}
          opacity={0.95}
          data-drop-hint={dropHint.snapped ? 'snap' : 'free'}
        />
      )}

      <g data-marker="ball">
        <circle cx={ballPosition.x} cy={ballPosition.y} r={ballRadius} fill={BALL} />
      </g>
      {dragging && <g data-dragging={dragging.kind} />}
    </svg>
    </div>
  );
}

/**
 * Die Bahn des Balls zwischen zwei Staenden.
 *
 * Ein Fly fliegt im Bogen, ein Grounder laeuft gerade — sonst sehen beide gleich aus und
 * die Unterscheidung steht nur in der Notiz. Der Bogen weicht zur Seite aus, auf der mehr
 * Platz ist: rechtwinklig zur Verbindung, mit einem Achtel ihrer Laenge.
 */
function ballPfad(von: { x: number; y: number }, nach: PlayMarkers['ball']): string {
  if (nach.trajectory === 'GROUND') return `M${von.x},${von.y} L${nach.x},${nach.y}`;
  const dx = nach.x - von.x;
  const dy = nach.y - von.y;
  const laenge = Math.hypot(dx, dy);
  if (laenge < 1) return `M${von.x},${von.y} L${nach.x},${nach.y}`;
  const hoehe = laenge / 8;
  const mx = (von.x + nach.x) / 2 - (dy / laenge) * hoehe;
  const my = (von.y + nach.y) / 2 + (dx / laenge) * hoehe;
  return `M${von.x},${von.y} Q${mx.toFixed(2)},${my.toFixed(2)} ${nach.x},${nach.y}`;
}

/**
 * 1B und 3B liegen komplett im Fair Territory, die Aussenkante buendig an der Linie.
 * Die als Raute gedrehten Symbole haben Kanten parallel zur Foul-Linie, deshalb reicht
 * eine Verschiebung um die halbe Kantenlaenge nach innen.
 */
function innerOffset(index: number): { dx: number; dy: number } {
  if (index === 0) return { dx: -1.41, dy: -1.41 }; // 1B nach innen
  if (index === 2) return { dx: 1.41, dy: -1.41 }; // 3B nach innen
  return { dx: 0, dy: 0 }; // 2B liegt ohnehin im Fair
}
