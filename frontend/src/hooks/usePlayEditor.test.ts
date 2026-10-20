import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

    act(() => result.current.beginGesture());
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
    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 99, 99));

    const stand1 = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    expect(stand1.x).toBeCloseTo(DEFAULT_DEFENSE.SS.x, 5);
  });

  test('nimmt waehrend einer Geste nur einen Schnappschuss', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.beginGesture());
    for (let i = 1; i <= 20; i++) {
      act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, i, i));
    }
    act(() => result.current.undo());

    // Ein Undo bringt den Marker ganz zurueck, nicht nur um ein Pixel.
    const ss = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    expect(ss.x).toBeCloseTo(DEFAULT_DEFENSE.SS.x, 5);
    expect(result.current.canUndo).toBe(false);
  });

  test('macht die letzte Bewegung rueckgaengig', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    // Eine Geste: einmal greifen, dann beliebig viele Zwischenschritte.
    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 5, 5));
    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 10, 20));
    act(() => result.current.undo());

    const ss = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    expect(ss.x).toBeCloseTo(DEFAULT_DEFENSE.SS.x, 5);
  });

  test('haelt fuenf Stufen Rueckgaengig vor', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    for (let i = 1; i <= 7; i++) {
      act(() => result.current.beginGesture());
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

    act(() => result.current.beginGesture());
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

  test('verbraucht beim Tippen einer Notiz keine Rueckgaengig-Stufe', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 10, 20));
    for (const text of ['C', 'Cu', 'Cut', 'Cut-', 'Cut-M', 'Cut-Ma', 'Cut-Mann']) {
      act(() => result.current.setNote(text));
    }
    act(() => result.current.undo());

    // Das eine Undo muss die Markerbewegung treffen, nicht einen Buchstaben.
    const ss = result.current.steps[0].markers.defenders.find(d => d.position === 'SS')!;
    expect(ss.x).toBeCloseTo(DEFAULT_DEFENSE.SS.x, 5);
  });

  test('merkt sich nichts, wenn ein Marker nur angetippt und nicht bewegt wird', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.beginGesture());
    act(() => result.current.endGesture());

    expect(result.current.canUndo).toBe(false);
  });

  test('meldet einen gescheiterten Sicherungsversuch an den Aufrufer', async () => {
    const kaputt = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => usePlayEditor(play(), kaputt));

    act(() => result.current.beginGesture());
    act(() => result.current.moveMarker({ kind: 'defender', position: 'SS' }, 1, 1));

    let erfolg: boolean | undefined;
    await act(async () => {
      erfolg = await result.current.flushSave();
    });

    expect(erfolg).toBe(false);
    expect(result.current.saveState).toBe('fehler');
  });

  test('schaltet die Dauer eines Stands durch 600, 1200 und 2000', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.cycleDuration());
    expect(result.current.steps[0].durationMs).toBe(2000);

    act(() => result.current.cycleDuration());
    expect(result.current.steps[0].durationMs).toBe(600);
  });
});

describe('usePlayEditor — Sicherung', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  test('meldet schon waehrend der Entprellung etwas Ungesichertes', async () => {
    const sichern = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePlayEditor(play(), sichern));

    expect(result.current.hatUngesichertes).toBe(false);
    act(() => result.current.setNote('Grounder'));

    // Die Anfrage laeuft erst in 800 ms. Vorher haftete der Schutz vorm Verlassen am
    // Fehlerzustand — genau in diesem Fenster ging alles verloren.
    expect(result.current.hatUngesichertes).toBe(true);
    expect(sichern).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() => expect(result.current.hatUngesichertes).toBe(false));
  });

  test('eine spaet zurueckkehrende Sicherung spricht die neuere Aenderung nicht frei', async () => {
    let loesen: (() => void) | null = null;
    const sichern = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>(res => (loesen = () => res())))
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => usePlayEditor(play(), sichern));

    act(() => result.current.setNote('erste'));
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() => expect(sichern).toHaveBeenCalledTimes(1));

    // Waehrend die erste Anfrage haengt, kommt eine zweite Aenderung.
    act(() => result.current.setNote('zweite'));
    await act(async () => {
      loesen!();
    });

    expect(result.current.hatUngesichertes).toBe(true);
  });
});

describe('usePlayEditor — Runner und Ball', () => {
  test('Dauer und Outs verbrauchen keine Rueckgaengig-Stufe', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.cycleDuration());
    act(() => result.current.setOuts(2));

    // Fuenf Stufen sind knapp. Durchschalten ist selbst die Umkehr.
    expect(result.current.canUndo).toBe(false);
  });

  test('Out nimmt den Runner aus den Folgestaenden, Zuruecknehmen gibt ihn zurueck', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.addRunner());
    const id = result.current.step.markers.runners[0].id;
    act(() => result.current.addStep());
    act(() => result.current.setCur(0));

    act(() => result.current.setRunnerStatus(id, 'OUT'));
    expect(result.current.steps[0].markers.runners[0].status).toBe('OUT');
    expect(result.current.steps[1].markers.runners).toHaveLength(0);

    act(() => result.current.setRunnerStatus(id, 'ACTIVE'));
    expect(result.current.steps[0].markers.runners[0].status).toBe('ACTIVE');
    expect(result.current.steps[1].markers.runners).toHaveLength(1);
  });

  test('die Flugbahn laesst sich auf flach stellen', () => {
    const { result } = renderHook(() => usePlayEditor(play(), save));

    act(() => result.current.setBallTrajectory('GROUND'));

    expect(result.current.step.markers.ball.trajectory).toBe('GROUND');
  });
});
