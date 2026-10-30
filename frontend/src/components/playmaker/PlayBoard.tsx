import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BASES,
  CIRCLE_RADIUS,
  FENCE_PATH,
  FOUL_LINES_PATH,
  FULL_FIELD,
  HOME,
  PITCHING_PLATE,
  SKIN_PATH,
  type Box,
} from './board/geometry';
import { ballAnchor, computeContentBox, fitViewBox, markerRadius } from './board/layout';
import { flugkurve, teilPfad } from './board/spur';
import type { MarkerRef, PlayMarkers, PlayStep, PositionCode } from './board/types';
import { FARBE } from './board/farben';

/*
 * Das Board spielt auf derselben Buehne wie das Spielwissen: Navy als Platz, Cream fuer
 * Menschen, Linien und Ball, Amber fuer die Laeufer, auf die man achtet, Rot fuer Out.
 *
 * Vorher war der Platz gruen mit Sand und weissen Linien, also ein zweites Programm
 * neben den Karten. Die Farben sind BEWUSST nicht fotografisch: ein Bild aus zwei
 * Farben sagt schneller, wer gemeint ist, als eines aus sechs.
 *
 * `FELD` ist der Platz, nicht die Buehne um ihn herum — innerhalb des Ausschnitts ist
 * beides dasselbe Navy, damit das Feld nicht als Kasten im Kasten liegt.
 */
const FELD = FARBE.grund;
const SKIN_DECK = FARBE.hell;   // mit kleiner Deckkraft: der Sand ist nur eine Ahnung
const LINIE = FARBE.hell;
const INVENTORY = FARBE.hell;   // Bases, Platte, Pitcher-Circle
const INK = FARBE.grund;        // Schrift AUF hellen Flaechen
const RUNNER = FARBE.gut;
const RUNNER_AUS = FARBE.raus;
const BALL = FARBE.hell;
const NAHT = FARBE.naht;

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
   * Der laufende Uebergang: von welchem Stand, wohin, wie weit (0..1).
   *
   * Damit waechst die Spur MIT dem Ball, statt fertig dazustehen oder — schlimmer — vom
   * Stand davor aus gezeichnet zu werden. Die Form bleibt dabei stehen, weil der Teilweg
   * exakt aus derselben Kurve geschnitten wird, auf der der Ball fliegt.
   */
  spur?: { von: PlayMarkers; nach: PlayMarkers; t: number } | null;
  /**
   * Die Positionen, auf die es in diesem Play ankommt — sie bekommen einen amberfarbenen
   * Ring. Ohne Angabe ringelt nichts: im Editor baut man das Play, da ist alles wichtig.
   */
  beteiligt?: PositionCode[] | null;
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
  beteiligt = null,
  interactive = true,
  viewBoxOverride = null,
  spur = null,
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
      <Feld viewBox={viewBox} />

      {/*
        Die blasse Bahn davor.

        Waehrend einer Bewegung ist das der Weg, der IN den Startstand fuehrte — sonst
        verschwaende die alte Linie in dem Moment, in dem die neue bei null anfaengt, und
        es ruckt. Steht die Wiedergabe, ist es der Wurf davor: bei Cut-off-Ketten ist die
        Kette der Inhalt.
      */}
      {(() => {
        const blass = spur
          ? previous && { von: previous.ball, nach: spur.von.ball }
          : ghost && previous && { von: ghost.ball, nach: previous.ball };
        if (!blass) return null;
        return (
          <path
            data-spur="ball-blass"
            d={teilPfad(flugkurve(blass.von, blass.nach, blass.nach.trajectory), 1)}
            fill="none"
            stroke={BALL}
            strokeWidth={2.4}
            strokeDasharray="5 4"
            strokeLinecap="round"
            opacity={0.35}
          />
        );
      })()}
      {/*
        Nur die Ballbahn. Der Runner bekommt keine Linie: er bewegt sich sichtbar, und eine
        zweite Spur daneben machte das Bild voll, ohne etwas zu sagen, was die Bewegung
        nicht schon zeigt.
      */}
      {spur ? (
        <path
          data-spur="ball"
          d={teilPfad(flugkurve(spur.von.ball, spur.nach.ball, spur.nach.ball.trajectory), spur.t)}
          fill="none"
          stroke={BALL}
          strokeWidth={2.4}
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
      ) : (
        previous && (
          <path
            data-spur="ball"
            d={teilPfad(flugkurve(previous.ball, markers.ball, markers.ball.trajectory), 1)}
            fill="none"
            stroke={BALL}
            strokeWidth={2.4}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        )
      )}

      {markers.defenders.map((defender) => (
        <g key={defender.position} data-marker="defender" data-id={defender.position}>
          {beteiligt?.includes(defender.position) && (
            <circle
              data-achtung=""
              cx={defender.x} cy={defender.y} r={radius * 1.35}
              fill="none" stroke={FARBE.gut} strokeWidth={radius * 0.16} opacity={0.9}
            />
          )}
          <circle cx={defender.x} cy={defender.y} r={radius} fill={FARBE.hell} />
          <text
            x={defender.x}
            y={defender.y + radius * 0.22}
            textAnchor="middle"
            fill={INK}
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
            {/*
              Der Ring ist gemessen, nicht geschmueckt. Amber auf Cream misst 1,55:1 —
              steht der Runner auf einem Verteidiger, verschwimmen beide Scheiben; der
              dunkle Ring trennt sie und ist auf der Buehne selbst unsichtbar. Rot misst
              auf der Buehne nur 2,68:1 und braucht umgekehrt einen hellen Ring, damit
              ein ausgemachter Runner nicht im Hintergrund versinkt.
            */}
            <circle
              cx={runner.x} cy={runner.y} r={runnerRadius}
              fill={runner.status === 'OUT' ? RUNNER_AUS : RUNNER}
              stroke={runner.status === 'OUT' ? FARBE.hell : FARBE.grund}
              strokeWidth={runnerRadius * 0.18}
            />
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
        {/* Der Nahtring. Derselbe Ball wie auf den Karten — und er unterscheidet die
            kleine helle Scheibe von den grossen hellen Scheiben der Verteidiger. */}
        <circle
          cx={ballPosition.x} cy={ballPosition.y} r={ballRadius * 0.62}
          fill="none" stroke={NAHT} strokeWidth={ballRadius * 0.34}
        />
      </g>
      {dragging && <g data-dragging={dragging.kind} />}
    </svg>
    </div>
  );
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

/**
 * Der Platz: Gras, Sand, Linien, Bases, Platte, Circle.
 *
 * Eigene, gemerkte Komponente, weil nichts davon sich je aendert — ausser dem Gras, das
 * bis an die Kanten des Ausschnitts reicht. Waehrend einer Animation rechnet React sonst
 * sechzigmal je Sekunde ein Dutzend Pfade nach, die alle gleich bleiben. Das ist die
 * einzige Stelle im Board, an der sich Merken ueberhaupt lohnt: die Marker aendern sich
 * in jedem Bild, der Platz nie.
 */
const Feld = memo(function Feld({ viewBox }: { viewBox: Box }) {
  return (
    <>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill={FELD} />
        <path d={SKIN_PATH} fill={SKIN_DECK} opacity={0.08} />
        <path d={FOUL_LINES_PATH} fill="none" stroke={LINIE} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
        <path d={FENCE_PATH} fill="none" stroke={LINIE} strokeWidth={1.4} strokeLinecap="round" opacity={0.4} />

        <circle cx={PITCHING_PLATE.x} cy={PITCHING_PLATE.y} r={CIRCLE_RADIUS} fill={INVENTORY} opacity={0.12} />
        <rect
          x={PITCHING_PLATE.x - 2}
          y={PITCHING_PLATE.y - 0.75}
          width={4}
          height={1.5}
          rx={0.3}
          fill={INVENTORY}
          opacity={0.8}
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
            opacity={0.8}
          />
        ))}
        <path
          d={`M${HOME.x - 2.4},${HOME.y - 4.4} L${HOME.x + 2.4},${HOME.y - 4.4} L${HOME.x + 2.4},${HOME.y - 2} ` +
            `L${HOME.x},${HOME.y + 0.8} L${HOME.x - 2.4},${HOME.y - 2} Z`}
          fill={INVENTORY}
          opacity={0.8}
        />
    </>
  );
});
