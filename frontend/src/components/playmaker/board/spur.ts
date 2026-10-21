import { runnerPath } from './interpolate';
import type { Point } from './geometry';
import type { Trajectory } from './types';

/**
 * Die Spur, die Ball und Runner waehrend der Wiedergabe hinter sich herziehen.
 *
 * Warum eigene Datei und nicht im Board: das Board zeichnet, es rechnet nicht. Und die
 * Kurve muss an ZWEI Stellen dieselbe sein — der Ball fliegt auf ihr, und die
 * gestrichelte Linie zeigt sie. Lagen die beiden auseinander, flog der Ball neben seiner
 * eigenen Flugbahn her; genau das sah unrund aus.
 */

/** Quadratische Bezier: Start, Steuerpunkt, Ziel. Ein Grounder hat den Steuerpunkt in der Mitte. */
export interface Flugkurve {
  p0: Point;
  c: Point;
  p1: Point;
}

/**
 * Der Bogen weicht rechtwinklig zur Verbindung aus, mit einem Achtel ihrer Laenge.
 * Ein flacher Ball bekommt denselben Typ mit Steuerpunkt auf der Sehne — dann ist die
 * Kurve eine Gerade, und alles andere rechnet gleich weiter.
 */
export function flugkurve(von: Point, nach: Point, trajectory: Trajectory): Flugkurve {
  const mitte = { x: (von.x + nach.x) / 2, y: (von.y + nach.y) / 2 };
  if (trajectory === 'GROUND') return { p0: von, c: mitte, p1: nach };

  const dx = nach.x - von.x;
  const dy = nach.y - von.y;
  const laenge = Math.hypot(dx, dy);
  if (laenge < 1) return { p0: von, c: mitte, p1: nach };

  const hoehe = laenge / 8;
  return {
    p0: von,
    c: { x: mitte.x - (dy / laenge) * hoehe, y: mitte.y + (dx / laenge) * hoehe },
    p1: nach,
  };
}

/** Wo der Ball zum Zeitpunkt t ist — auf der Kurve, nicht daneben. */
export function punktAuf(k: Flugkurve, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * k.p0.x + 2 * u * t * k.c.x + t * t * k.p1.x,
    y: u * u * k.p0.y + 2 * u * t * k.c.y + t * t * k.p1.y,
  };
}

/**
 * Das Stueck der Kurve von 0 bis t — exakt, nicht angenaehert.
 *
 * De Casteljau: der Anfang einer quadratischen Bezier ist wieder eine quadratische
 * Bezier mit verschobenem Steuerpunkt. Deshalb behaelt die Spur ihre Form, waehrend sie
 * waechst, statt sich in jedem Bild neu zu kruemmen.
 */
export function teilPfad(k: Flugkurve, t: number): string {
  const anteil = Math.max(0, Math.min(1, t));
  const c = { x: k.p0.x + (k.c.x - k.p0.x) * anteil, y: k.p0.y + (k.c.y - k.p0.y) * anteil };
  const ende = punktAuf(k, anteil);
  return `M${k.p0.x},${k.p0.y} Q${c.x.toFixed(2)},${c.y.toFixed(2)} ${ende.x.toFixed(2)},${ende.y.toFixed(2)}`;
}

/** Wie viele Stuetzpunkte die Laufspur bekommt. Mehr braucht es bei 60 ft nicht. */
const STUETZEN = 16;

/**
 * Die Laufspur eines Runners bis t — entlang der Base-Wege, nicht als Sehne.
 *
 * Eine gerade Linie waere eine Luege: der Runner laeuft ueber die Base, die Spur schnitt
 * die Ecke ab. Gezeichnet wird deshalb derselbe Weg, auf dem er sich bewegt.
 */
export function laufspur(von: Point, nach: Point, t: number): string {
  const anteil = Math.max(0, Math.min(1, t));
  if (anteil <= 0) return '';
  const punkte: Point[] = [];
  for (let i = 0; i <= STUETZEN; i++) {
    punkte.push(runnerPath(von, nach, (anteil * i) / STUETZEN));
  }
  return punkte
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}
