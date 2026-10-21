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

  test('zeichnet einen Out-Runner durchgestrichen, statt ihn wegzulassen', () => {
    const raus = markers({ runners: [{ id: 'r1', x: 196, y: 174, status: 'OUT' }] });
    const { container } = render(<PlayBoard markers={raus} />);

    // Er bleibt in DIESEM Stand sichtbar, damit man den Tag noch sieht.
    const runner = container.querySelector('[data-marker="runner"]')!;
    expect(runner.getAttribute('data-status')).toBe('OUT');
    expect(runner.querySelectorAll('path')).toHaveLength(2);
  });

  test('laesst einen Runner, der gepunktet hat, weg', () => {
    const run = markers({ runners: [{ id: 'r1', x: 155, y: 220, status: 'SCORED' }] });
    const { container } = render(<PlayBoard markers={run} />);

    expect(container.querySelectorAll('[data-marker="runner"]')).toHaveLength(0);
  });

  test('zeichnet einen Fly im Bogen und einen Grounder gerade', () => {
    const vorher = markers({ ball: { state: 'IN_FLIGHT', holder: null, x: 155, y: 218, trajectory: 'AIR' } });
    const fly = markers({ ball: { state: 'IN_FLIGHT', holder: null, x: 245, y: 62, trajectory: 'AIR' } });
    const grounder = markers({ ball: { state: 'IN_FLIGHT', holder: null, x: 245, y: 62, trajectory: 'GROUND' } });

    const { container: a } = render(<PlayBoard markers={fly} previous={vorher} />);
    const { container: b } = render(<PlayBoard markers={grounder} previous={vorher} />);

    // Geprueft wird die Form, nicht der Buchstabe: beide Bahnen sind quadratische
    // Bezier-Kurven, aber beim Grounder liegt der Steuerpunkt AUF der Sehne.
    const steuerpunkt = (c: HTMLElement) => {
      const d = c.querySelector('path[stroke="#E6F03C"]')!.getAttribute('d')!;
      const [, x, y] = d.match(/Q([-\d.]+),([-\d.]+)/)!;
      return { x: Number(x), y: Number(y) };
    };
    const sehnenMitte = { x: (155 + 245) / 2, y: (218 + 62) / 2 };
    const abstand = (p: { x: number; y: number }) => Math.hypot(p.x - sehnenMitte.x, p.y - sehnenMitte.y);

    expect(abstand(steuerpunkt(a))).toBeGreaterThan(10);
    expect(abstand(steuerpunkt(b))).toBeLessThan(0.5);
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

describe('PlayBoard — die Spur waehrend der Wiedergabe', () => {
  const von: PlayMarkers = markers({
    runners: [{ id: 'r1', x: 197.43, y: 175.57, status: 'ACTIVE' }],
    ball: { state: 'IN_FLIGHT', holder: null, x: 155, y: 218, trajectory: 'AIR' },
  });
  const nach: PlayMarkers = markers({
    runners: [{ id: 'r1', x: 112.57, y: 175.57, status: 'ACTIVE' }],
    ball: { state: 'IN_FLIGHT', holder: null, x: 245, y: 62, trajectory: 'AIR' },
  });

  test('zeichnet Ball- und Laufspur auch beim ERSTEN Uebergang, wo es kein Davor gibt', () => {
    // Genau hier fehlte vorher jede Linie: gezeichnet wurde aus `previous`, und das ist
    // beim ersten Uebergang null.
    const { container } = render(
      <PlayBoard markers={von} previous={null} spur={{ von, nach, t: 0.5 }} />,
    );

    expect(container.querySelector('path[stroke="#E6F03C"]')).not.toBeNull();
    expect(container.querySelector('path[stroke="#B91C2A"]')).not.toBeNull();
  });

  test('die Ballspur waechst mit t', () => {
    const laenge = (t: number) => {
      const { container } = render(<PlayBoard markers={von} spur={{ von, nach, t }} />);
      const d = container.querySelector('path[stroke="#E6F03C"]')!.getAttribute('d')!;
      const [, x, y] = d.match(/Q[-\d.]+,[-\d.]+ ([-\d.]+),([-\d.]+)/)!;
      return Math.hypot(Number(x) - von.ball.x, Number(y) - von.ball.y);
    };

    expect(laenge(0.8)).toBeGreaterThan(laenge(0.3));
    expect(laenge(0.1)).toBeLessThan(laenge(0.3));
  });

  test('die Laufspur folgt den Bases, statt die Ecke abzuschneiden', () => {
    const { container } = render(<PlayBoard markers={nach} spur={{ von, nach, t: 1 }} />);
    const d = container.querySelector('path[stroke="#B91C2A"]')!.getAttribute('d')!;
    const punkte = [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]) }));

    // Von der 1 zur 3 fuehrt der Weg ueber die 2 (155, 133.15).
    expect(punkte.some(p => Math.hypot(p.x - 155, p.y - 133.15) < 4)).toBe(true);
  });
});
