import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { usePlayEditor } from './usePlayEditor';
import { DEFAULT_DEFENSE, POSITIONS } from '@/components/playmaker/board/geometry';
import type { Play } from '@/components/playmaker/board/types';

function play(): Play {
  return {
    id: 1,
    title: 'Testplay',
    categoryId: 1,
    gameState: 'ANY',
    gameStateNote: null,
    counterpartPlayId: null,
    steps: [
      {
        ordinal: 1,
        durationMs: 1200,
        note: 'Ausgangslage',
        outs: 0,
        markers: {
          defenders: POSITIONS.map(position => ({ position, ...DEFAULT_DEFENSE[position] })),
          runners: [],
          ball: { state: 'AT_BAT', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' },
        },
      },
    ],
  };
}

const save = vi.fn().mockResolvedValue(undefined);

describe('usePlayEditor', () => {
  test('legt einen neuen Stand als Kopie des aktuellen an', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 10, 20));
    act(() => result.current.addStep());

    expect(result.current.steps).toHaveLength(2);
    expect(result.current.cur).toBe(1);
    const neu = result.current.steps[1].markers.defenders.find(d => d.position === 'SS')!;
    expect(neu.x).toBeCloseTo(10, 5);
    expect(neu.y).toBeCloseTo(20, 5);
  });

  test('aendert im kopierten Stand nicht den vorherigen mit', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.addStep());
    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 99, 99));

    const stand1 = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    expect(stand1.x).toBeCloseTo(DEFAULT_DEFENSE.SS.x, 5);
  });

  test('macht die letzte Bewegung rueckgaengig', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 10, 20));
    act(() => result.current.undo());

    const ss = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    expect(ss.x).toBeCloseTo(DEFAULT_DEFENSE.SS.x, 5);
  });

  test('haelt fuenf Stufen Rueckgaengig vor', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    for (let i = 1; i <= 7; i++) {
      act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, i, i));
    }
    for (let i = 0; i < 5; i++) {
      act(() => result.current.undo());
    }

    const ss = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    // Fuenf Schritte zurueck von Position 7 landet bei Position 2 — aelter geht nicht.
    expect(ss.x).toBeCloseTo(2, 5);
    expect(result.current.canUndo).toBe(false);
  });

  test('nummeriert nach dem Loeschen neu durch', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.addStep());
    act(() => result.current.addStep());
    act(() => result.current.deleteStep(1));

    expect(result.current.steps.map(s => s.ordinal)).toEqual([1, 2]);
  });

  test('laesst den letzten Stand nicht loeschen', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.deleteStep(0));

    expect(result.current.steps).toHaveLength(1);
  });

  test('setzt die Normalaufstellung zurueck', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.moveMarker({ kind: 'defender', position: 'CF' }, 1, 1));
    act(() => result.current.resetDefense());

    const cf = result.current.steps[0].markers.defenders.find(d => d.position === 'CF')!;
    expect(cf.x).toBeCloseTo(DEFAULT_DEFENSE.CF.x, 5);
  });

  test('fuegt einen Runner an Home hinzu und gibt ihm eine eigene id', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.addRunner());
    act(() => result.current.addRunner());

    const ids = result.current.steps[0].markers.runners.map(r => r.id);
    expect(new Set(ids).size).toBe(2);
  });

  test('schaltet die Dauer eines Stands durch 600, 1200 und 2000', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.cycleDuration());
    expect(result.current.steps[0].durationMs).toBe(2000);

    act(() => result.current.cycleDuration());
    expect(result.current.steps[0].durationMs).toBe(600);
  });
});
