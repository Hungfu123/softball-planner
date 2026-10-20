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

  if (vonIndex !== null && nachIndex === null) {
    // Ziel liegt nicht auf einer Base, aber auf einem Base-WEG: dann endet der Lauf
    // unterwegs, und der Weg dahin fuehrt trotzdem ueber die Bases. Ohne das sprang ein
    // Runner von der 1 quer durchs Infield auf einen Punkt zwischen 2 und 3.
    const auf = aufBaseWeg(nach);
    if (auf !== null && auf !== vonIndex) {
      const weg = [...bisBase(vonIndex, auf), nach];
      if (weg.length > 2) return entlang(weg, t);
    }
  }

  if (vonIndex === null || nachIndex === null || vonIndex === nachIndex) {
    return { x: lerp(von.x, nach.x, t), y: lerp(von.y, nach.y, t) };
  }

  // Beide Richtungen pruefen. Nur vorwaerts zu zaehlen schickte einen Runner, der von
  // der 2 zurueck auf die 1 muss (Rundown!), einmal um die ganze Raute.
  //
  // Entschieden wird nicht nach Laenge, sondern danach, ob der Weg UNTERWEGS ueber Home
  // fuehrt: wer von der 3 zur 1 zurueck muss, laeuft nicht ueber die Platte — das waere
  // ein Run und danach ein neuer Batter. Bleiben beide Wege zulaessig, gewinnt der kuerzere.
  const vorwaerts = kette(vonIndex, nachIndex, 1);
  const rueckwaerts = kette(vonIndex, nachIndex, -1);
  //
  // Und: rueckwaerts geht niemand nach HOME. Wer von der 1 zur Platte will, punktet —
  // er laeuft ueber die 2 und die 3. Ohne diese Regel gewann der kuerzere Weg, und der
  // Runner spazierte die First-Base-Linie zurueck in den Catcher.
  const vorwaertsZulaessig = !fuehrtUeberHome(vorwaerts);
  const rueckwaertsZulaessig = !fuehrtUeberHome(rueckwaerts) && nachIndex !== 0;

  let stationen: Point[];
  if (vorwaertsZulaessig && !rueckwaertsZulaessig) stationen = vorwaerts;
  else if (rueckwaertsZulaessig && !vorwaertsZulaessig) stationen = rueckwaerts;
  else stationen = vorwaerts.length <= rueckwaerts.length ? vorwaerts : rueckwaerts;

  if (stationen.length === 2) {
    return { x: lerp(von.x, nach.x, t), y: lerp(von.y, nach.y, t) };
  }

  return entlang(stationen, t);
}

/**
 * Von welcher Base aus laeuft man auf diesen Punkt zu? Liegt er dicht an einem Base-Weg,
 * ist das dessen Anfang; sonst null.
 */
function aufBaseWeg(p: Point): number | null {
  for (let i = 0; i < BASES.length; i++) {
    const a = BASES[i];
    const b = BASES[(i + 1) % BASES.length];
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const anteil = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    if (anteil <= 0.02 || anteil >= 0.98) continue;
    const nah = { x: a.x + anteil * (b.x - a.x), y: a.y + anteil * (b.y - a.y) };
    if (Math.hypot(p.x - nah.x, p.y - nah.y) <= 4) return i;
  }
  return null;
}

/** Stationen von Base a bis Base b, vorwaerts und ohne ueber Home zu laufen. */
function bisBase(von: number, nach: number): Point[] {
  const vorwaerts = kette(von, nach, 1);
  return fuehrtUeberHome(vorwaerts) ? [BASES[von], BASES[nach]] : vorwaerts;
}

/** Beruehrt der Weg Home als Zwischenstation? Start und Ziel zaehlen nicht. */
function fuehrtUeberHome(stationen: Point[]): boolean {
  return stationen.slice(1, -1).some(p => p === BASES[0]);
}

/** Stationen von a nach b, in der angegebenen Laufrichtung. */
function kette(von: number, nach: number, richtung: 1 | -1): Point[] {
  const stationen: Point[] = [BASES[von]];
  let index = von;
  while (index !== nach) {
    index = (index + richtung + BASES.length) % BASES.length;
    stationen.push(BASES[index]);
  }
  return stationen;
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
