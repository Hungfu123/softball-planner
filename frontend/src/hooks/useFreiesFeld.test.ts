import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { standardfeld, useFreiesFeld } from './useFreiesFeld';
import { BASES, HOME } from '@/components/playmaker/board/geometry';

const SPEICHER = 'playmaker-freies-feld';

/**
 * Gerendert wird in StrictMode — also mit doppelt aufgerufenen Updater-Funktionen.
 *
 * Genau daran ist die Ballbahn zuerst gescheitert: ein Ref wurde INNERHALB des Updaters
 * gesetzt, der erste Durchlauf setzte das Flag, der zweite uebersprang die Zuweisung, und
 * React behielt den zweiten. Ohne StrictMode im Test faellt so etwas nicht auf.
 */
const rendere = () => renderHook(() => useFreiesFeld(), { wrapper: StrictMode });

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('useFreiesFeld — Ausgangslage', () => {
  test('neun Verteidiger, keine Runner, Ball an Home', () => {
    const { result } = rendere();

    expect(result.current.markers.defenders).toHaveLength(9);
    expect(result.current.markers.runners).toHaveLength(0);
    expect(result.current.markers.ball.x).toBe(HOME.x);
    expect(result.current.markers.ball.y).toBe(HOME.y);
    // Nicht in der Hand des Pitchers wie in einem Play: das freie Feld faengt beim Schlag an.
    expect(result.current.markers.ball.holder).toBeNull();
  });
});

describe('useFreiesFeld — Runner', () => {
  test('Base antippen setzt einen Runner, nochmal antippen nimmt ihn weg', () => {
    const { result } = rendere();

    act(() => result.current.toggleBase(1));
    expect(result.current.markers.runners).toHaveLength(1);
    expect(result.current.markers.runners[0].x).toBeCloseTo(BASES[1].x, 5);

    act(() => result.current.toggleBase(1));
    expect(result.current.markers.runners).toHaveLength(0);
  });

  test('ein angetippter Runner verschwindet — auf dem freien Feld gibt es keine Outs', () => {
    const { result } = rendere();

    act(() => result.current.toggleBase(2));
    const id = result.current.markers.runners[0].id;
    act(() => result.current.removeRunner(id));

    expect(result.current.markers.runners).toHaveLength(0);
  });
});

describe('useFreiesFeld — Ballbahn', () => {
  test('merkt sich, wo der Ball lag, als die Geste anfing', () => {
    const { result } = rendere();

    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'ball' }, 95, 114));

    expect(result.current.ballVorher).toEqual({ x: HOME.x, y: HOME.y });
    expect(result.current.markers.ball.x).toBe(95);
  });

  test('der Anfang bleibt waehrend der Geste stehen, auch nach vielen Schritten', () => {
    const { result } = rendere();

    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'ball' }, 150, 200));
    act(() => result.current.moveMarker({ kind: 'ball' }, 120, 160));
    act(() => result.current.moveMarker({ kind: 'ball' }, 95, 114));

    // Nicht "wo er beim vorigen Ereignis lag" — sonst waere die Bahn ein Millimeter lang.
    expect(result.current.ballVorher).toEqual({ x: HOME.x, y: HOME.y });
  });

  test('beim zweiten Wurf rutscht die alte Bahn eine Stufe nach hinten', () => {
    const { result } = rendere();

    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'ball' }, 95, 114));
    act(() => result.current.endGesture());

    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'ball' }, 155, 133));
    act(() => result.current.endGesture());

    expect(result.current.ballVorher).toEqual({ x: 95, y: 114 });
    expect(result.current.ballDavor).toEqual({ x: HOME.x, y: HOME.y });
  });
});

describe('useFreiesFeld — Stand und Zuruecksetzen', () => {
  test('der Stand landet im Geraet und kommt von dort zurueck', () => {
    const { result, unmount } = rendere();
    act(() => result.current.toggleBase(3));
    expect(localStorage.getItem(SPEICHER)).toContain('runners');
    unmount();

    const zweiter = rendere();
    expect(zweiter.result.current.markers.runners).toHaveLength(1);
  });

  test('kaputter Speicher ergibt ein frisches Feld, keinen Absturz', () => {
    localStorage.setItem(SPEICHER, '{"markers":{"defenders":[]}}');
    const { result } = rendere();

    expect(result.current.markers.defenders).toHaveLength(9);
    expect(result.current.markers.runners).toHaveLength(0);
  });

  test('Zuruecksetzen stellt die Standardaufstellung her und ist umkehrbar', () => {
    const { result } = rendere();
    act(() => result.current.toggleBase(1));
    act(() => result.current.toggleBase(2));
    expect(result.current.markers.runners).toHaveLength(2);

    act(() => result.current.reset());
    expect(result.current.markers.runners).toHaveLength(0);
    expect(result.current.markers.ball.x).toBe(standardfeld().ball.x);

    act(() => result.current.undo());
    expect(result.current.markers.runners).toHaveLength(2);
  });

  test('Rueckgaengig nimmt den letzten Zug zurueck', () => {
    const { result } = rendere();
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.toggleBase(1));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.markers.runners).toHaveLength(0);
  });
});

describe('useFreiesFeld — nichts verschwindet', () => {
  test('ein Marker bleibt im sichtbaren Feld', () => {
    const { result } = rendere();

    // Weit hinter den Zaun ziehen: das freie Feld zeigt den ganzen Platz mit festem
    // Ausschnitt, dort waere der Ball weg — und damit nicht mehr greifbar.
    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'ball' }, 500, -400));

    expect(result.current.markers.ball.y).toBeGreaterThan(-30);
    expect(result.current.markers.ball.x).toBeLessThan(400);
  });
})
