import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { usePlayback } from './usePlayback';
import { DEFAULT_DEFENSE, POSITIONS } from '@/components/playmaker/board/geometry';
import type { PlayStep } from '@/components/playmaker/board/types';

/**
 * Prueft den Zeitplan der Wiedergabe.
 *
 * Im Browser laesst sich das nicht messen: requestAnimationFrame wird in einer Umgebung
 * ohne echten Bildschirm auf etwa ein Bild je Sekunde gedeckelt, und die Animation haengt
 * daran. Hier laufen Uhr und Bildtakt unter Kontrolle, also steht fest, was wirklich
 * passiert — nicht, was die Umgebung zulaesst.
 */

function stand(ordinal: number, durationMs: number, x: number): PlayStep {
  return {
    ordinal,
    durationMs,
    note: null,
    outs: 0,
    markers: {
      defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
      runners: [],
      ball: { state: 'IN_FLIGHT', holder: null, x, y: 100, trajectory: 'AIR' },
    },
  };
}

let rafCallbacks: FrameRequestCallback[] = [];

/** Ein Bild erzeugen: die Uhr vorstellen und die angemeldeten Rueckrufe ausloesen. */
function frame(ms: number) {
  vi.advanceTimersByTime(ms);
  const faellig = rafCallbacks;
  rafCallbacks = [];
  faellig.forEach(cb => cb(performance.now()));
}

beforeEach(() => {
  vi.useFakeTimers();
  rafCallbacks = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('usePlayback — Zeitplan', () => {
  const steps = [stand(1, 1200, 0), stand(2, 1200, 100), stand(3, 600, 200)];

  test('spielt erst ab zwei Staenden', () => {
    const { result } = renderHook(() => usePlayback([stand(1, 1200, 0)]));

    expect(result.current.canPlay).toBe(false);
    act(() => result.current.play());
    expect(result.current.playing).toBe(false);
  });

  test('braucht fuer einen Uebergang die Dauer des Zielstands plus 400 ms Halt', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));

    // Kurz vor Ablauf steht der Stand noch auf 1.
    act(() => frame(1199));
    expect(result.current.index).toBe(0);

    // Dauer voll, aber der Halt laeuft noch.
    act(() => frame(1));
    expect(result.current.index).toBe(0);

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.index).toBe(1);
  });

  test('beruecksichtigt die Dauer JE Stand, nicht eine feste', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(1200));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.index).toBe(1);

    // Der dritte Stand ist mit 600 ms als "schnell" markiert.
    act(() => frame(0));
    act(() => frame(599));
    expect(result.current.index).toBe(1);
    act(() => frame(1));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.index).toBe(2);
  });

  test('halbiert die Zeit bei doppeltem Tempo', () => {
    const { result } = renderHook(() => usePlayback(steps, { speed: 2 }));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(600));
    act(() => vi.advanceTimersByTime(400));

    expect(result.current.index).toBe(1);
  });

  test('bewegt sich in jedem Bild, nicht nur am Standende', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));

    const positionen: number[] = [];
    for (let i = 0; i < 6; i++) {
      act(() => frame(100));
      positionen.push(result.current.markers!.ball.x);
    }

    // Streng monoton: jedes Bild bringt den Ball weiter.
    expect(positionen).toHaveLength(6);
    for (let i = 1; i < positionen.length; i++) {
      expect(positionen[i]).toBeGreaterThan(positionen[i - 1]);
    }
  });

  test('haelt am letzten Stand an, wenn die Schleife aus ist', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(1200));
    act(() => vi.advanceTimersByTime(400));
    act(() => frame(0));
    act(() => frame(600));
    act(() => vi.advanceTimersByTime(400));

    expect(result.current.index).toBe(2);
    expect(result.current.playing).toBe(false);
  });

  test('faengt mit Schleife wieder von vorne an', () => {
    const { result } = renderHook(() => usePlayback(steps, { loop: true }));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(1200));
    act(() => vi.advanceTimersByTime(400));
    act(() => frame(0));
    act(() => frame(600));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.index).toBe(2);

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
  });
});
