import { useCallback, useEffect, useRef, useState } from 'react';
import { frameAt } from '@/components/playmaker/board/interpolate';
import type { PlayMarkers, PlayStep } from '@/components/playmaker/board/types';

/** Halt am Ende jedes Stands, damit das Auge ankommt, bevor es weitergeht. */
const HOLD_MS = 400;

export type PlaybackSpeed = 0.5 | 1 | 2;

interface Options {
  loop?: boolean;
  speed?: PlaybackSpeed;
  /** Beim Oeffnen von selbst losspielen — so zeigt das Spielwissen seine Karten. */
  autostart?: boolean;
}

/**
 * Spielt eine Folge von Staenden ab.
 *
 * Der gespeicherte Zustand wird dabei nie angefasst: {@link frameAt} liefert ein
 * abgeleitetes Zwischenbild, der Hook haelt es getrennt in {@code frame}. Wer pausiert,
 * sieht wieder den echten Stand.
 *
 * Bei prefers-reduced-motion wird nicht interpoliert, sondern von Stand zu Stand
 * gesprungen — der Halt bleibt, der Inhalt ist vollstaendig, nur die Bewegung faellt weg.
 */
export function usePlayback(steps: PlayStep[], { loop = false, speed = 1, autostart = false }: Options = {}) {
  const [index, setIndex] = useState(0);
  /*
   * Der Selbstanlauf steht im Anfangswert und nicht in einem Effekt: so ist schon das
   * erste Bild in Bewegung, statt dass die Seite kurz steht und dann anspringt.
   *
   * Wer weniger Bewegung bestellt hat, bekommt sie nicht — und bei einem einzigen Stand
   * gibt es nichts abzuspielen.
   */
  const [playing, setPlaying] = useState(
    () =>
      autostart &&
      steps.length >= 2 &&
      !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [frame, setFrame] = useState<PlayMarkers | null>(null);
  /**
   * Fortschritt des laufenden Uebergangs, 0..1 — und von welchem Stand aus.
   *
   * Ohne das zeichnete das Board die Spur vom Stand DAVOR: waehrend der Bewegung von N
   * nach N+1 steht `index` noch auf N, und `previous` war N-1. Man sah also die alte
   * Linie, und die richtige erschien erst beim Umspringen. Beim allerersten Uebergang
   * gab es gar keine, weil es kein N-1 gibt — deshalb hinterliessen die Runner nichts.
   */
  const [spur, setSpur] = useState<{ von: number; t: number } | null>(null);
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduziert =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const abbrechen = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    if (timer.current !== null) clearTimeout(timer.current);
    raf.current = null;
    timer.current = null;
  }, []);

  const pause = useCallback(() => {
    abbrechen();
    setPlaying(false);
    setFrame(null);
    setSpur(null);
  }, [abbrechen]);

  const seek = useCallback(
    (ziel: number) => {
      abbrechen();
      setPlaying(false);
      setFrame(null);
      setSpur(null);
      setIndex(Math.max(0, Math.min(steps.length - 1, ziel)));
    },
    [abbrechen, steps.length],
  );

  const next = useCallback(() => seek(index + 1), [index, seek]);
  const prev = useCallback(() => seek(index - 1), [index, seek]);

  const play = useCallback(() => {
    if (steps.length < 2) return;
    setPlaying(true);
    setIndex((aktuell) => (aktuell >= steps.length - 1 ? 0 : aktuell));
  }, [steps.length]);

  useEffect(() => {
    if (!playing) return;
    if (index >= steps.length - 1) {
      if (loop) {
        timer.current = setTimeout(() => setIndex(0), HOLD_MS);
        return () => abbrechen();
      }
      setPlaying(false);
      setFrame(null);
      setSpur(null);
      return;
    }

    const von = index;
    const nach = index + 1;
    const dauer = steps[nach].durationMs / speed;

    if (reduziert) {
      timer.current = setTimeout(() => setIndex(nach), dauer);
      return () => abbrechen();
    }

    const start = performance.now();
    const tick = (jetzt: number) => {
      const t = Math.min(1, (jetzt - start) / dauer);
      setFrame(frameAt(steps, von, nach, t));
      setSpur({ von, t });
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        timer.current = setTimeout(() => {
          setFrame(null);
          setSpur(null);
          setIndex(nach);
        }, HOLD_MS);
      }
    };
    raf.current = requestAnimationFrame(tick);

    return () => abbrechen();
  }, [playing, index, steps, speed, loop, reduziert, abbrechen]);

  useEffect(() => abbrechen, [abbrechen]);

  const aktuell = steps[Math.min(index, steps.length - 1)];

  return {
    /** Was gezeichnet werden soll: das Zwischenbild, sonst der echte Stand. */
    markers: frame ?? aktuell?.markers ?? null,
    /**
     * Wohin der Ball in diesem Uebergang unterwegs ist.
     *
     * Die Flugbahn wird aus Start und AKTUELLER Ballstelle gezeichnet; waehrend der
     * Animation wandert diese Stelle, der Bogen wurde also in jedem Bild neu gerechnet
     * und peitschte. Mit dem festen Ziel bleibt die Kurve stehen und der Ball laeuft auf
     * ihr entlang.
     */
    /**
     * Die wachsende Spur des laufenden Uebergangs: von welchem Stand, wohin, wie weit.
     * Steht sie, zeichnet das Board stattdessen den fertigen Weg aus `previous`.
     */
    spur:
      spur && playing && spur.von + 1 < steps.length
        ? { von: steps[spur.von].markers, nach: steps[spur.von + 1].markers, t: spur.t }
        : null,
    /** Der vorige Stand — daraus entstehen Flugbahn und Laufweg. */
    previous: index > 0 ? steps[index - 1].markers : null,
    /**
     * Der Stand davor. Er traegt die blasse Bahn des Wurfs, der in den vorigen Stand
     * fuehrte — bei Cut-off-Ketten ist genau diese Kette der Inhalt. Waehrend einer
     * Bewegung uebernimmt das Board `previous` dafuer, damit die alte Linie verblasst,
     * statt im Moment des Starts einfach zu verschwinden.
     */
    ghost: index > 1 ? steps[index - 2].markers : null,
    step: aktuell,
    index,
    /** Linearer Fortschritt im laufenden Uebergang, 0..1 — fuer die Zeitleiste. */
    fortschritt: spur && playing ? spur.t : 0,
    playing,
    canPlay: steps.length >= 2,
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    next,
    prev,
    seek,
  };
}
