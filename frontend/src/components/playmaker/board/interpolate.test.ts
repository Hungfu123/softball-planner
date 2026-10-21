import { describe, expect, test } from 'vitest';
import { BASES, FIRST_BASE, HOME, SECOND_BASE, THIRD_BASE } from './geometry';
import { frameAt, runnerPath } from './interpolate';
import type { PlayStep } from './types';

function step(ordinal: number, over: Partial<PlayStep['markers']>): PlayStep {
  return {
    ordinal,
    durationMs: 1200,
    note: null,
    outs: 0,
    markers: {
      defenders: over.defenders ?? [{ position: 'SS', x: 100, y: 100 }],
      runners: over.runners ?? [],
      ball: over.ball ?? { state: 'IN_FLIGHT', holder: null, x: 0, y: 0, trajectory: 'AIR' },
    },
  };
}

describe('frameAt', () => {
  const a = step(1, {
    defenders: [{ position: 'SS', x: 0, y: 0 }],
    ball: { state: 'IN_FLIGHT', holder: null, x: 0, y: 0, trajectory: 'AIR' },
  });
  const b = step(2, {
    defenders: [{ position: 'SS', x: 100, y: 0 }],
    ball: { state: 'IN_HAND', holder: 'SS', x: 100, y: 0, trajectory: 'AIR' },
  });

  test('veraendert die Eingabe nicht', () => {
    const vorher = JSON.stringify([a, b]);

    frameAt([a, b], 0, 1, 0.5);

    expect(JSON.stringify([a, b])).toBe(vorher);
  });

  test('liefert bei t=0 genau Stand A', () => {
    const frame = frameAt([a, b], 0, 1, 0);

    expect(frame.defenders[0].x).toBeCloseTo(0, 6);
    expect(frame.ball.x).toBeCloseTo(0, 6);
  });

  test('liefert bei t=1 genau Stand B', () => {
    const frame = frameAt([a, b], 0, 1, 1);

    expect(frame.defenders[0].x).toBeCloseTo(100, 6);
    expect(frame.ball.holder).toBe('SS');
  });

  test('der Ball ist zur Haelfte der Zeit weiter als ein Spieler gleicher Strecke', () => {
    const frame = frameAt([a, b], 0, 1, 0.5);

    expect(frame.ball.x).toBeGreaterThan(frame.defenders[0].x);
  });

  test('gibt den Ball erst ganz am Ende in die Hand', () => {
    expect(frameAt([a, b], 0, 1, 0.9).ball.holder).toBeNull();
    expect(frameAt([a, b], 0, 1, 1).ball.holder).toBe('SS');
  });

  test('laesst einen im Folgestand ausgeschiedenen Runner im Zwischenbild verschwinden', () => {
    const mitRunner = step(1, { runners: [{ id: 'r1', x: 10, y: 10, status: 'ACTIVE' }] });
    const raus = step(2, { runners: [{ id: 'r1', x: 20, y: 20, status: 'OUT' }] });

    const frame = frameAt([mitRunner, raus], 0, 1, 1);

    expect(frame.runners.filter((r) => r.status === 'ACTIVE')).toHaveLength(0);
  });
});

describe('runnerPath', () => {
  test('fuehrt von der ersten zur dritten Base ueber die zweite', () => {
    const mitte = runnerPath(FIRST_BASE, THIRD_BASE, 0.5);

    expect(Math.hypot(mitte.x - SECOND_BASE.x, mitte.y - SECOND_BASE.y)).toBeLessThan(2);
  });

  test('laeuft zwischen benachbarten Bases geradeaus', () => {
    const mitte = runnerPath(HOME, FIRST_BASE, 0.5);

    expect(mitte.x).toBeCloseTo((HOME.x + FIRST_BASE.x) / 2, 1);
    expect(mitte.y).toBeCloseTo((HOME.y + FIRST_BASE.y) / 2, 1);
  });

  test('laeuft von der zweiten zur ersten Base direkt zurueck, nicht um die Raute', () => {
    const mitte = runnerPath(SECOND_BASE, FIRST_BASE, 0.5);

    const direkt = { x: (SECOND_BASE.x + FIRST_BASE.x) / 2, y: (SECOND_BASE.y + FIRST_BASE.y) / 2 };
    expect(Math.hypot(mitte.x - direkt.x, mitte.y - direkt.y)).toBeLessThan(2);
  });

  test('laeuft von der dritten zur ersten Base ueber die zweite — kurzer Weg rueckwaerts', () => {
    const mitte = runnerPath(THIRD_BASE, FIRST_BASE, 0.5);

    expect(Math.hypot(mitte.x - SECOND_BASE.x, mitte.y - SECOND_BASE.y)).toBeLessThan(2);
  });

  test('laeuft abseits der Bases geradeaus', () => {
    const von = { x: 10, y: 10 };
    const nach = { x: 30, y: 50 };

    const mitte = runnerPath(von, nach, 0.5);

    expect(mitte.x).toBeCloseTo(20, 5);
    expect(mitte.y).toBeCloseTo(30, 5);
  });
});

describe('runnerPath — Richtung und Base-Wege', () => {
  const nahe = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  test('laeuft von der 1 nach Home ueber die 2 und die 3, nicht rueckwaerts die Linie entlang', () => {
    // Auf halber Strecke muss er irgendwo hinter der 2 sein. Rueckwaerts laege er
    // zwischen 1 und Home — genau das zeigte der Prototyp.
    const mitte = runnerPath(BASES[1], BASES[0], 0.5);

    expect(nahe(mitte, BASES[2])).toBeLessThan(35);
    expect(nahe(mitte, { x: (BASES[1].x + BASES[0].x) / 2, y: (BASES[1].y + BASES[0].y) / 2 })).toBeGreaterThan(40);
  });

  test('laesst den Rundown von der 2 zurueck auf die 1 rueckwaerts laufen', () => {
    const mitte = runnerPath(BASES[2], BASES[1], 0.5);
    const direkt = { x: (BASES[2].x + BASES[1].x) / 2, y: (BASES[2].y + BASES[1].y) / 2 };

    expect(nahe(mitte, direkt)).toBeLessThan(1);
  });

  test('fuehrt zu einem Ziel MITTEN auf einem Base-Weg ueber die Bases', () => {
    // Von der 1 auf einen Punkt zwischen 2 und 3: die Luftlinie schneidet die 2 ab.
    const ziel = { x: (BASES[2].x + BASES[3].x) / 2, y: (BASES[2].y + BASES[3].y) / 2 };
    const mitte = runnerPath(BASES[1], ziel, 0.5);

    expect(nahe(mitte, BASES[2])).toBeLessThan(25);
    const luftlinie = { x: (BASES[1].x + ziel.x) / 2, y: (BASES[1].y + ziel.y) / 2 };
    expect(nahe(mitte, luftlinie)).toBeGreaterThan(10);
  });
})

describe('runnerPath — der Ring, auch zwischen den Bases', () => {
  const nahe = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const zwischen = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  test('beruehrt die 2, auch wenn BEIDE Enden zwischen den Bases liegen', () => {
    // Genau der Fall aus den Start-Plays: 60 % zwischen 1 und 2 nach 40 % zwischen 2 und 3.
    // Vorher lief der Runner die Sehne und schnitt die 2 ab.
    const von = zwischen(BASES[1], BASES[2], 0.6);
    const nach = zwischen(BASES[2], BASES[3], 0.4);

    let dichtesteAnZwei = Infinity;
    for (let i = 0; i <= 20; i++) {
      dichtesteAnZwei = Math.min(dichtesteAnZwei, nahe(runnerPath(von, nach, i / 20), BASES[2]));
    }
    expect(dichtesteAnZwei).toBeLessThan(1);
  });

  test('laeuft von der 1 zur 3 ueber die 2', () => {
    let dichteste = Infinity;
    for (let i = 0; i <= 20; i++) {
      dichteste = Math.min(dichteste, nahe(runnerPath(BASES[1], BASES[3], i / 20), BASES[2]));
    }
    expect(dichteste).toBeLessThan(1);
  });

  test('bleibt im Rundown zwischen 1 und 2 auf der Strecke', () => {
    const von = zwischen(BASES[1], BASES[2], 0.7);
    const nach = zwischen(BASES[1], BASES[2], 0.2);
    const mitte = runnerPath(von, nach, 0.5);

    expect(nahe(mitte, zwischen(BASES[1], BASES[2], 0.45))).toBeLessThan(1);
  });

  test('wer gar nicht auf dem Weg steht, laeuft geradeaus', () => {
    const frei = { x: 200, y: 100 };
    const ziel = { x: 120, y: 90 };
    const mitte = runnerPath(frei, ziel, 0.5);

    expect(nahe(mitte, { x: 160, y: 95 })).toBeLessThan(0.001);
  });
})
