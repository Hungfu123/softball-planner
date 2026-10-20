import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PlayBoard } from './PlayBoard';
import { DEFAULT_DEFENSE, POSITIONS } from './board/geometry';
import type { PlayMarkers, PlayStep } from './board/types';

function markers(overrides: Partial<PlayMarkers> = {}): PlayMarkers {
  return {
    defenders: POSITIONS.map((position) => ({ position, ...DEFAULT_DEFENSE[position] })),
    runners: [{ id: 'r1', x: 196, y: 174, status: 'ACTIVE' }],
    ball: { state: 'IN_HAND', holder: 'P', x: 155, y: 175, trajectory: 'AIR' },
    ...overrides,
  };
}

const step: PlayStep = { ordinal: 1, durationMs: 1200, note: null, outs: 0, markers: markers() };

describe('PlayBoard', () => {
  test('zeichnet neun Verteidiger mit ihrem Kuerzel', () => {
    const { container } = render(<PlayBoard markers={step.markers} />);

    const labels = [...container.querySelectorAll('[data-marker="defender"] text')].map((n) => n.textContent);
    expect(labels).toHaveLength(9);
    expect(labels).toContain('SS');
    expect(labels).toContain('CF');
  });

  test('legt den Ball zuletzt in den Baum, damit er obenauf liegt', () => {
    const { container } = render(<PlayBoard markers={step.markers} />);

    const marker = [...container.querySelectorAll('[data-marker]')];
    expect(marker.at(-1)?.getAttribute('data-marker')).toBe('ball');
  });

  test('setzt den gehaltenen Ball an die Kante der Scheibe, nicht in ihre Mitte', () => {
    const { container } = render(<PlayBoard markers={step.markers} />);

    const ball = container.querySelector('[data-marker="ball"] circle')!;
    const abstand = Math.hypot(
      Number(ball.getAttribute('cx')) - DEFAULT_DEFENSE.P.x,
      Number(ball.getAttribute('cy')) - DEFAULT_DEFENSE.P.y,
    );
    expect(abstand).toBeGreaterThan(0);
  });

  test('zeichnet den freien Ball an seiner eigenen Stelle', () => {
    const frei = markers({ ball: { state: 'LOOSE', holder: null, x: 200, y: 90, trajectory: 'GROUND' } });
    const { container } = render(<PlayBoard markers={frei} />);

    const ball = container.querySelector('[data-marker="ball"] circle')!;
    expect(Number(ball.getAttribute('cx'))).toBeCloseTo(200, 5);
    expect(Number(ball.getAttribute('cy'))).toBeCloseTo(90, 5);
  });

  test('laesst Runner mit Status OUT weg', () => {
    const raus = markers({ runners: [{ id: 'r1', x: 196, y: 174, status: 'OUT' }] });
    const { container } = render(<PlayBoard markers={raus} />);

    expect(container.querySelectorAll('[data-marker="runner"]')).toHaveLength(0);
  });

  test('haelt alle Marker innerhalb des viewBox', () => {
    const { container } = render(<PlayBoard markers={step.markers} width={390} height={612} />);

    const svg = container.querySelector('svg')!;
    const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    for (const node of container.querySelectorAll('[data-marker] circle, [data-marker] rect')) {
      const cx = Number(node.getAttribute('cx') ?? node.getAttribute('x'));
      const cy = Number(node.getAttribute('cy') ?? node.getAttribute('y'));
      expect(cx).toBeGreaterThanOrEqual(vx);
      expect(cx).toBeLessThanOrEqual(vx + vw);
      expect(cy).toBeGreaterThanOrEqual(vy);
      expect(cy).toBeLessThanOrEqual(vy + vh);
    }
  });
});
