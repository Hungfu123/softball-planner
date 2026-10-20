import { BASES, type Point } from './geometry';
import type { PlayMarkers, PlayStep } from './types';

/**
 * Menschen beschleunigen und bremsen — Verteidiger und Runner laufen mit ease-in-out.
 */
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Ein geworfener Ball rollt nicht an. Er startet schnell und wird zum Fangen weicher,
 * deshalb ease-out. Dadurch liegt er zur Halbzeit sichtbar weiter als ein Spieler mit
 * derselben Strecke — genau das macht die Gleichzeitigkeit lesbar.
 */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 2);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const BASE_SNAP = 3;

/**
 * Ein Zwischenbild zwischen zwei Staenden.
 *
 * Gibt IMMER ein neues Objekt zurueck und fasst die uebergebenen Staende nicht an. Im
 * Prototyp schrieb die Wiedergabe in denselben Zustand, aus dem sie las — das erste
 * Zwischenbild loeschte die Staende und die Animation starb mit
 * "Cannot read properties of undefined". Deshalb ist die Unveraenderlichkeit hier
 * ausdruecklich getestet und nicht nur gut gemeint.
 */
export function frameAt(steps: PlayStep[], from: number, to: number, t: number): PlayMarkers {
  const a = steps[from].markers;
  const b = steps[to].markers;
  const tSpieler = easeInOut(t);
  const tBall = easeOut(t);

  const defenders = b.defenders.map((ziel) => {
    const start = a.defenders.find((d) => d.position === ziel.position) ?? ziel;
    return { position: ziel.position, x: lerp(start.x, ziel.x, tSpieler), y: lerp(start.y, ziel.y, tSpieler) };
  });

  const runners = b.runners.map((ziel) => {
    const start = a.runners.find((r) => r.id === ziel.id) ?? ziel;
    const punkt = runnerPath(start, ziel, tSpieler);
    return { id: ziel.id, x: punkt.x, y: punkt.y, status: ziel.status };
  });

  return {
    defenders,
    runners,
    ball: {
      state: b.ball.state,
      // Erst am Ende in die Hand: waehrend des Flugs gehoert der Ball niemandem, sonst
      // klebt er schon auf halber Strecke an der Scheibe des Faengers.
      holder: t >= 1 ? b.ball.holder : null,
      x: lerp(a.ball.x, b.ball.x, tBall),
      y: lerp(a.ball.y, b.ball.y, tBall),
      trajectory: b.ball.trajectory,
    },
  };
}

/**
 * Wo ein Runner zum Zeitpunkt t steht.
 *
 * Laeuft er von einer Base zu einer anderen, folgt er den Base-Wegen: von der ersten zur
 * dritten geht es ueber die zweite. Luftlinie wuerde die Ecke abschneiden und etwas
 * zeigen, was es im Spiel nicht gibt. Abseits der Bases wird geradeaus interpoliert.
 */
export function runnerPath(von: Point, nach: Point, t: number): Point {
  const vonIndex = baseIndex(von);
  const nachIndex = baseIndex(nach);

  if (vonIndex === null || nachIndex === null || vonIndex === nachIndex) {
    return { x: lerp(von.x, nach.x, t), y: lerp(von.y, nach.y, t) };
  }

  const stationen: Point[] = [BASES[vonIndex]];
  let index = vonIndex;
  while (index !== nachIndex) {
    index = (index + 1) % BASES.length;
    stationen.push(BASES[index]);
  }

  if (stationen.length === 2) {
    return { x: lerp(von.x, nach.x, t), y: lerp(von.y, nach.y, t) };
  }

  return entlang(stationen, t);
}

/** Punkt bei Anteil t auf einem Streckenzug, laengenproportional. */
function entlang(punkte: Point[], t: number): Point {
  const laengen: number[] = [];
  let gesamt = 0;
  for (let i = 1; i < punkte.length; i++) {
    const l = Math.hypot(punkte[i].x - punkte[i - 1].x, punkte[i].y - punkte[i - 1].y);
    laengen.push(l);
    gesamt += l;
  }
  if (gesamt === 0) return punkte[0];

  let rest = t * gesamt;
  for (let i = 0; i < laengen.length; i++) {
    if (rest <= laengen[i]) {
      const anteil = laengen[i] === 0 ? 0 : rest / laengen[i];
      return {
        x: lerp(punkte[i].x, punkte[i + 1].x, anteil),
        y: lerp(punkte[i].y, punkte[i + 1].y, anteil),
      };
    }
    rest -= laengen[i];
  }
  return punkte[punkte.length - 1];
}

function baseIndex(p: Point): number | null {
  for (let i = 0; i < BASES.length; i++) {
    if (Math.hypot(p.x - BASES[i].x, p.y - BASES[i].y) <= BASE_SNAP) return i;
  }
  return null;
}
