import { useCallback, useEffect, useRef, useState } from 'react';
import { frameAt } from '@/components/playmaker/board/interpolate';
import { ballAnteil, dauerMs } from '@/components/playmaker/board/tempo';
import type { PlayMarkers, PlayStep } from '@/components/playmaker/board/types';

/** Halt am Ende jedes Stands, damit das Auge ankommt, bevor es weitergeht. */
const HOLD_MS = 400;


interface Options {
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
export function usePlayback(steps: PlayStep[], { autostart = false }: Options = {}) {
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
  /**
   * Wo der laufende Uebergang stand, als angehalten wurde (0..1).
   *
   * Pause heisst: das Bild bleibt stehen, wo es steht, und Weiterspielen geht dort
   * weiter. Vorher warf die Pause das Zwischenbild weg — der Ball sprang auf den letzten
   * Stand zurueck — und das Weiterspielen begann den ganzen Uebergang von vorn. Eine
   * Stelle liess sich so gar nicht anhalten.
   *
   * Ein Ref und kein Zustand: der Wert wird im Bildtakt geschrieben und darf kein
   * Neuzeichnen ausloesen.
   */
  const angehalten = useRef(0);

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
    // Frame und Spur bleiben stehen: das Bild friert ein, statt zurueckzuspringen.
  }, [abbrechen]);

  const seek = useCallback(
    (ziel: number) => {
      abbrechen();
      angehalten.current = 0;
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
      /* Kein Dauerlauf: wer es noch einmal sehen will, drueckt „nochmal". */
      setPlaying(false);
      setFrame(null);
      setSpur(null);
      return;
    }

    const von = index;
    const nach = index + 1;
    /*
     * Die Dauer kommt aus der Bewegung, nicht aus `durationMs`: bei der Haelfte aller
     * Staende stand dort der Vorgabewert, und ein Flip zur 1 dauerte so lang wie ein
     * Relay ueber das halbe Feld. Siehe board/tempo.ts — das Feld bleibt in den Daten,
     * es steuert nur die Wiedergabe nicht mehr.
     */
    const dauer = dauerMs(steps[von].markers, steps[nach].markers);

    if (reduziert) {
      timer.current = setTimeout(() => setIndex(nach), dauer);
      return () => abbrechen();
    }

    // Dort weitermachen, wo die Pause war — bei 0 ist das der normale Anfang.
    const start = performance.now() - angehalten.current * dauer;
    const tick = (jetzt: number) => {
      const t = Math.min(1, (jetzt - start) / dauer);
      angehalten.current = t < 1 ? t : 0;
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
  }, [playing, index, steps, reduziert, abbrechen]);

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
        ? {
            von: steps[spur.von].markers,
            nach: steps[spur.von + 1].markers,
            /*
             * Die Uhr des BALLS, nicht die des Standes: die Spur waechst mit dem Ball.
             * Mit dem rohen t bliebe die Linie hinter ihm zurueck, sobald er frueher
             * ankommt als der Stand zu Ende ist — und das tut er meistens.
             */
            t: ballAnteil(steps[spur.von].markers, steps[spur.von + 1].markers, spur.t),
          }
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
    /**
     * Von vorn, wie das „nochmal" unter einer Karte im Spielwissen.
     *
     * Erst auf den ersten Stand, dann anspielen: `play` allein liefe vom Ende aus
     * nirgendwohin, und ein Zuschauer, der etwas verpasst hat, will genau das noch
     * einmal sehen und nicht die Zeitleiste zurueckziehen muessen.
     */
    nochmal: () => {
      seek(0);
      play();
    },
  };
}
