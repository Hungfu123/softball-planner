import { describe, expect, test } from 'vitest';
import { flugkurve, punktAuf, teilPfad } from './spur';
import { frameAt } from './interpolate';
import { DEFAULT_DEFENSE, POSITIONS } from './geometry';
import type { PlayStep } from './types';

const A = { x: 155, y: 218 };
const B = { x: 245, y: 62 };

describe('flugkurve', () => {
  test('ein Fly weicht zur Seite aus, ein Grounder nicht', () => {
    const mitte = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const ab = (p: { x: number; y: number }) => Math.hypot(p.x - mitte.x, p.y - mitte.y);

    expect(ab(flugkurve(A, B, 'AIR').c)).toBeGreaterThan(10);
    expect(ab(flugkurve(A, B, 'GROUND').c)).toBeLessThan(0.001);
  });
});

describe('teilPfad', () => {
  test('endet dort, wo der Ball gerade ist — nicht am Ziel', () => {
    const k = flugkurve(A, B, 'AIR');
    const bei = punktAuf(k, 0.35);
    const d = teilPfad(k, 0.35);
    const [, x, y] = d.match(/Q[-\d.]+,[-\d.]+ ([-\d.]+),([-\d.]+)/)!;

    expect(Number(x)).toBeCloseTo(bei.x, 1);
    expect(Number(y)).toBeCloseTo(bei.y, 1);
  });

  test('behaelt die Form, waehrend sie waechst', () => {
    // De Casteljau schneidet exakt: ein Punkt auf dem Teilweg liegt auch auf dem ganzen.
    const k = flugkurve(A, B, 'AIR');
    const halb = punktAuf(flugkurve(A, punktAuf(k, 0.6), 'GROUND'), 0); // Start bleibt Start
    expect(halb).toEqual(A);

    const aufTeil = punktAuf({ p0: k.p0, c: { x: k.p0.x + (k.c.x - k.p0.x) * 0.6, y: k.p0.y + (k.c.y - k.p0.y) * 0.6 }, p1: punktAuf(k, 0.6) }, 0.5);
    const aufGanz = punktAuf(k, 0.3);
    expect(aufTeil.x).toBeCloseTo(aufGanz.x, 6);
    expect(aufTeil.y).toBeCloseTo(aufGanz.y, 6);
  });

  test('bei t=0 ist nichts gelaufen', () => {
    const d = teilPfad(flugkurve(A, B, 'AIR'), 0);
    expect(d).toContain(`M${A.x},${A.y}`);
    expect(d).toContain(`${A.x.toFixed(2)},${A.y.toFixed(2)}`);
  });
});

describe('frameAt — der Ball fliegt auf seiner Bahn', () => {
  function stand(ordinal: number, ball: { x: number; y: number; trajectory: 'AIR' | 'GROUND' }): PlayStep {
    return {
      ordinal,
      durationMs: 1200,
      note: null,
      outs: 0,
      markers: {
        defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
        runners: [],
        ball: { state: 'IN_FLIGHT', holder: null, ...ball },
      },
    };
  }

  test('liegt zur Halbzeit auf der Kurve, nicht auf der Sehne', () => {
    const steps = [stand(1, { ...A, trajectory: 'AIR' }), stand(2, { ...B, trajectory: 'AIR' })];
    const frame = frameAt(steps, 0, 1, 0.5);

    /*
     * Geprueft wird die BAHN, nicht die Zeitkurve: der Ball muss auf dem Bogen liegen,
     * egal mit welchem Ease-out er darauf unterwegs ist. Vorher stand die Formel des
     * Ease-outs hier zweimal, und ein Wechsel der Kurve liess diesen Test fallen,
     * obwohl die Bahn stimmte.
     */
    const k = flugkurve(A, B, 'AIR');
    const naechster = Array.from({ length: 1001 }, (_, i) => punktAuf(k, i / 1000))
      .map(pt => Math.hypot(frame.ball.x - pt.x, frame.ball.y - pt.y))
      .reduce((a, b) => Math.min(a, b));
    expect(naechster).toBeLessThan(0.01);

    // Und weiter als die Haelfte, aber nicht auf der geraden Verbindung.
    const laenge = Math.hypot(B.x - A.x, B.y - A.y);
    expect(Math.hypot(frame.ball.x - A.x, frame.ball.y - A.y)).toBeGreaterThan(laenge * 0.5);
    const sehne = { x: A.x + (B.x - A.x) * 0.75, y: A.y + (B.y - A.y) * 0.75 };
    expect(Math.hypot(frame.ball.x - sehne.x, frame.ball.y - sehne.y)).toBeGreaterThan(3);
  });
});
