import { describe, expect, test } from 'vitest';
import { FIRST_BASE, HOME, SECOND_BASE, THIRD_BASE } from './geometry';
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
