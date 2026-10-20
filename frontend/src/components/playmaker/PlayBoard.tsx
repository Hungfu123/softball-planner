import { useMemo } from 'react';
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
import { computeContentBox, fitViewBox, markerRadius } from './board/layout';
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
  width?: number;
  height?: number;
  pointerFine?: boolean;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: React.PointerEvent<SVGSVGElement>) => void;
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
  width = 390,
  height = 612,
  pointerFine = false,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  dropHint = null,
  dragging = null,
}: Props) {
  const { viewBox, scale, radius } = useMemo(() => {
    const content: Box =
      mode === 'full'
        ? FULL_FIELD
        : computeContentBox(steps ?? [{ ordinal: 1, durationMs: 1200, note: null, outs: 0, markers }]);
    const fitted = fitViewBox(content, width, height);
    return { ...fitted, radius: markerRadius(fitted.scale, pointerFine) };
  }, [markers, steps, mode, width, height, pointerFine]);

  const ballPosition = ballAnchor(markers, radius);
  const ballRadius = radius * 0.42;
  const runnerSide = radius * 1.414;

  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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
          d={`M${ghost.ball.x},${ghost.ball.y} L${markers.ball.x},${markers.ball.y}`}
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
            d={`M${previous.ball.x},${previous.ball.y} L${markers.ball.x},${markers.ball.y}`}
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
        .filter((runner) => runner.status === 'ACTIVE')
        .map((runner) => (
          <g key={runner.id} data-marker="runner" data-id={runner.id}>
            <rect
              x={runner.x - runnerSide / 2}
              y={runner.y - runnerSide / 2}
              width={runnerSide}
              height={runnerSide}
              rx={radius * 0.14}
              transform={`rotate(45 ${runner.x} ${runner.y})`}
              fill={RUNNER}
            />
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
  );
}

/**
 * Ein gehaltener Ball sitzt auf der Kante der Scheibe, nicht in ihrer Mitte.
 *
 * Mittig waere er unsichtbar: er traegt keine Kontur und die Scheibe ist dunkel. Auf der
 * Kante bricht seine Silhouette den Kreis auf und man sieht, wer ihn hat.
 */
function ballAnchor(markers: PlayMarkers, radius: number): { x: number; y: number } {
  if (!markers.ball.holder) return { x: markers.ball.x, y: markers.ball.y };
  const halter = markers.defenders.find((d) => d.position === markers.ball.holder);
  if (!halter) return { x: markers.ball.x, y: markers.ball.y };
  // Nach rechts oben, weil dort am seltensten ein zweiter Marker steht.
  const winkel = -Math.PI / 4;
  return { x: halter.x + Math.cos(winkel) * radius, y: halter.y + Math.sin(winkel) * radius };
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
