import { useCallback, useEffect, useRef, useState } from 'react';
import { frameAt } from '@/components/playmaker/board/interpolate';
import type { PlayMarkers, PlayStep } from '@/components/playmaker/board/types';

/** Halt am Ende jedes Stands, damit das Auge ankommt, bevor es weitergeht. */
const HOLD_MS = 400;

export type PlaybackSpeed = 0.5 | 1 | 2;

interface Options {
  loop?: boolean;
  speed?: PlaybackSpeed;
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
export function usePlayback(steps: PlayStep[], { loop = false, speed = 1 }: Options = {}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState<PlayMarkers | null>(null);
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
  }, [abbrechen]);

  const seek = useCallback(
    (ziel: number) => {
      abbrechen();
      setPlaying(false);
      setFrame(null);
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
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        timer.current = setTimeout(() => {
          setFrame(null);
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
    /** Der vorige Stand — daraus entstehen Flugbahn und Laufweg. */
    previous: index > 0 ? steps[index - 1].markers : null,
    ghost: index > 1 ? steps[index - 2].markers : null,
    step: aktuell,
    index,
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
