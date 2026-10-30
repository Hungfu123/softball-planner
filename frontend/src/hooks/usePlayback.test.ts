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

/*
 * Die Wiedergabe laeuft von selbst an, sobald man ein Play oeffnet — so zeigt auch das
 * Spielwissen seine Karten: man kommt an und es bewegt sich, statt dass man erst einen
 * Knopf suchen muss. Wer weniger Bewegung bestellt hat, bekommt sie nicht.
 */
describe('Nochmal', () => {
  test('setzt auf den ersten Stand zurueck und laeuft wieder', () => {
    const { result } = renderHook(() => usePlayback([stand(1, 600, 10), stand(2, 600, 90)]));

    act(() => result.current.seek(1));
    expect(result.current.index).toBe(1);

    act(() => result.current.nochmal());

    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
  });
});

describe('Selbstanlauf', () => {
  test('laeuft bei autostart von allein los', () => {
    const { result } = renderHook(() => usePlayback([stand(1, 600, 10), stand(2, 600, 90)], { autostart: true }));

    expect(result.current.playing).toBe(true);
  });

  test('bleibt ohne autostart stehen', () => {
    const { result } = renderHook(() => usePlayback([stand(1, 600, 10), stand(2, 600, 90)]));

    expect(result.current.playing).toBe(false);
  });

  test('laeuft bei einem einzigen Stand nicht los, da gibt es nichts zu zeigen', () => {
    const { result } = renderHook(() => usePlayback([stand(1, 600, 10)], { autostart: true }));

    expect(result.current.playing).toBe(false);
  });
});


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

describe('usePlayback — die Spur haengt am laufenden Uebergang', () => {
  const steps = [stand(1, 1200, 0), stand(2, 1200, 100), stand(3, 1200, 200)];

  test('zeigt die Spur vom AKTUELLEN Stand aus, nicht vom Stand davor', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(400));

    // Waehrend der Bewegung 1 → 2 ist der Startpunkt Stand 1, nicht "nichts".
    // Vorher zeichnete das Board aus `previous`, und das war beim ersten Uebergang null:
    // deshalb hinterliessen Ball und Runner keine Linie.
    expect(result.current.spur).not.toBeNull();
    expect(result.current.spur!.von).toBe(steps[0].markers);
    expect(result.current.spur!.nach).toBe(steps[1].markers);
    expect(result.current.spur!.t).toBeGreaterThan(0);
    expect(result.current.spur!.t).toBeLessThan(1);
  });

  test('die Spur waechst mit der Zeit', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(300));
    const frueh = result.current.spur!.t;
    act(() => frame(600));
    const spaet = result.current.spur!.t;

    expect(spaet).toBeGreaterThan(frueh);
  });

  test('die Zeitleiste steht nicht still, waehrend sich etwas bewegt', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(300));
    const a = result.current.fortschritt;
    act(() => frame(600));
    const b = result.current.fortschritt;

    // Der Stand ist derselbe — der Knopf muss sich trotzdem bewegen.
    expect(result.current.index).toBe(0);
    expect(b).toBeGreaterThan(a);
  });

  test('Pause raeumt die Spur weg, damit kein halber Weg stehen bleibt', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.play());
    act(() => frame(0));
    act(() => frame(400));
    expect(result.current.spur).not.toBeNull();

    act(() => result.current.pause());
    expect(result.current.spur).toBeNull();
    expect(result.current.fortschritt).toBe(0);
  });

  test('toggle haelt an und startet nicht neu', () => {
    const { result } = renderHook(() => usePlayback(steps));

    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
  });
});
