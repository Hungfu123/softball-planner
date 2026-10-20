import { describe, expect, test } from 'vitest';
import { BASE_PATH, FULL_FIELD, HOME, type Box } from './geometry';
import { computeContentBox, fitViewBox, markerRadius, MIN_CONTENT_WIDTH, PADDING } from './layout';
import type { PlayStep } from './types';

function step(markers: Partial<PlayStep['markers']>): PlayStep {
  return {
    ordinal: 1,
    durationMs: 1200,
    note: null,
    outs: 0,
    markers: {
      defenders: markers.defenders ?? [],
      runners: markers.runners ?? [],
      ball: markers.ball ?? { state: 'AT_BAT', holder: null, x: HOME.x, y: HOME.y, trajectory: 'AIR' },
    },
  };
}

describe('computeContentBox', () => {
  test('umschliesst alle Marker aller Staende plus Rand', () => {
    const steps = [
      step({ defenders: [{ position: 'SS', x: 100, y: 140 }] }),
      step({ defenders: [{ position: 'SS', x: 260, y: 60 }] }),
    ];

    const box = computeContentBox(steps);

    expect(box.x).toBeLessThanOrEqual(100 - PADDING);
    expect(box.x + box.w).toBeGreaterThanOrEqual(260 + PADDING);
    expect(box.y).toBeLessThanOrEqual(60 - PADDING);
  });

  test('enthaelt Home auch wenn dort niemand steht', () => {
    const box = computeContentBox([step({ defenders: [{ position: 'CF', x: 155, y: 33 }] })]);

    expect(box.y + box.h).toBeGreaterThanOrEqual(HOME.y);
  });

  test('haelt die Mindestbreite bei einem einzigen Marker ein', () => {
    const box = computeContentBox([step({ defenders: [{ position: 'P', x: 155, y: 175 }] })]);

    expect(box.w).toBeGreaterThanOrEqual(MIN_CONTENT_WIDTH);
  });
});

describe('fitViewBox', () => {
  const box: Box = { x: 50, y: 20, w: 200, h: 220 };

  test('zieht auf das Seitenverhaeltnis der Flaeche auf und schneidet nie ab', () => {
    const { viewBox } = fitViewBox(box, 390, 612);

    expect(viewBox.w).toBeGreaterThanOrEqual(box.w);
    expect(viewBox.h).toBeGreaterThanOrEqual(box.h);
    expect(viewBox.x).toBeLessThanOrEqual(box.x);
    expect(viewBox.y).toBeLessThanOrEqual(box.y);
  });

  test('fuellt die Flaeche vollstaendig — kein Letterbox-Streifen', () => {
    const { viewBox, scale } = fitViewBox(box, 390, 612);

    expect(viewBox.w * scale).toBeCloseTo(390, 5);
    expect(viewBox.h * scale).toBeCloseTo(612, 5);
  });

  test('Home bleibt unten verankert, der Zuwachs geht nach oben', () => {
    const { viewBox } = fitViewBox(box, 390, 900);

    expect(viewBox.y + viewBox.h).toBeCloseTo(box.y + box.h, 5);
  });

  test('zieht bei breiter Flaeche seitlich auf, mittig', () => {
    const { viewBox } = fitViewBox(box, 1100, 400);
    const linksDazu = box.x - viewBox.x;
    const rechtsDazu = viewBox.x + viewBox.w - (box.x + box.w);

    expect(linksDazu).toBeCloseTo(rechtsDazu, 5);
  });
});

describe('markerRadius', () => {
  const scaleFor = (basePathPx: number) => basePathPx / BASE_PATH;

  test('nimmt 30 Prozent des Base-Wegs', () => {
    const radius = markerRadius(scaleFor(100), false);

    expect(radius * 2 * scaleFor(100)).toBeCloseTo(30, 5);
  });

  test('deckelt am Finger bei 44 px', () => {
    const scale = scaleFor(400);

    expect(markerRadius(scale, false) * 2 * scale).toBeCloseTo(44, 5);
  });

  test('deckelt an Maus und Trackpad erst bei 56 px', () => {
    const scale = scaleFor(400);

    expect(markerRadius(scale, true) * 2 * scale).toBeCloseTo(56, 5);
  });

  test('faellt nie unter 26 px', () => {
    const scale = scaleFor(40);

    expect(markerRadius(scale, false) * 2 * scale).toBeCloseTo(26, 5);
  });
});

describe('Vollfeld-Ansicht', () => {
  test('ignoriert den Inhalt und zeigt immer dasselbe Feld', () => {
    const eng = computeContentBox([step({ defenders: [{ position: 'P', x: 155, y: 175 }] })]);

    expect(fitViewBox(FULL_FIELD, 1100, 900).viewBox.w).toBeGreaterThan(eng.w);
  });
});
