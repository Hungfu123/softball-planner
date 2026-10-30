import { BASES, BASE_PATH, type Point } from './geometry';
import { flugkurve, punktAuf } from './spur';
import type { PlayMarkers, PlayStep } from './types';

/**
 * Menschen beschleunigen und bremsen — Verteidiger und Runner laufen mit ease-in-out.
 */
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Ein geworfener Ball rollt nicht an. Er startet schnell und wird zum Fangen weicher,
 * deshalb ease-out. Dadurch liegt er zur Halbzeit sichtbar weiter als ein Spieler mit
 * derselben Strecke — genau das macht die Gleichzeitigkeit lesbar.
 *
 * Die Kurve ist **dieselbe wie im Spielwissen**: `cubic-bezier(0.23, 1, 0.32, 1)`. Sie
 * startet haerter und laeuft laenger aus als das frueher benutzte quadratische Ease-out
 * (zur Halbzeit 86 % statt 75 % der Strecke). Daran erkennt man die Bewegung der Karten
 * wieder, und der Wurf wirkt wie ein Wurf und nicht wie ein Schieben.
 */
const easeOut = (t: number): number => bezier(t, 0.23, 1, 0.32, 1);

/**
 * Ein CSS-Bezier als Funktion, mit Newton und Bisektion aufgeloest.
 *
 * Die Kurve ist ueber x parametrisiert, gesucht ist aber y zu einer Zeit — also erst das
 * passende Kurven-t finden, dann dort y lesen. Newton geht schnell und kann bei flachen
 * Stellen danebengreifen; die Bisektion fAEngt genau diesen Fall.
 */
function bezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const kurve = (p1: number, p2: number, s: number) =>
    ((1 - s) * (1 - s) * 3 * p1 + 3 * (1 - s) * s * s * 0 + s * s * s) + 3 * (1 - s) * s * s * p2 - 3 * (1 - s) * s * s * 0;
  const an = (p1: number, p2: number, s: number) =>
    3 * p1 * (1 - s) * (1 - s) * s + 3 * p2 * (1 - s) * s * s + s * s * s;
  const ableitung = (p1: number, p2: number, s: number) =>
    3 * p1 * (1 - 4 * s + 3 * s * s) + 3 * p2 * (2 * s - 3 * s * s) + 3 * s * s;
  void kurve;

  let s = t;
  for (let i = 0; i < 6; i++) {
    const abweichung = an(x1, x2, s) - t;
    if (Math.abs(abweichung) < 1e-6) return an(y1, y2, s);
    const d = ableitung(x1, x2, s);
    if (Math.abs(d) < 1e-6) break;
    s -= abweichung / d;
  }

  let unten = 0;
  let oben = 1;
  s = t;
  while (oben - unten > 1e-6) {
    const x = an(x1, x2, s);
    if (x > t) oben = s;
    else unten = s;
    s = (oben + unten) / 2;
  }
  return an(y1, y2, s);
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

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

  // Der Ball folgt GENAU der Kurve, die als Flugbahn gezeichnet wird. Vorher lief er auf
  // der geraden Verbindung, waehrend der Bogen danebenlag — er flog sichtbar neben seiner
  // eigenen Flugbahn her, und genau das sah unrund aus.
  const kurve = flugkurve(a.ball, b.ball, b.ball.trajectory);
  const ballPunkt = punktAuf(kurve, tBall);

  return {
    defenders,
    runners,
    ball: {
      state: b.ball.state,
      // Erst am Ende in die Hand: waehrend des Flugs gehoert der Ball niemandem, sonst
      // klebt er schon auf halber Strecke an der Scheibe des Faengers.
      holder: t >= 1 ? b.ball.holder : null,
      x: ballPunkt.x,
      y: ballPunkt.y,
      trajectory: b.ball.trajectory,
    },
  };
}

/**
 * Wo ein Runner zum Zeitpunkt t steht.
 *
 * Die Raute wird als RING gerechnet: Home liegt bei 0, die 1 bei 60, die 2 bei 120, die 3
 * bei 180 Fuss. Jeder Punkt, der nahe genug an einem Base-Weg liegt, bekommt so eine
 * einzige Zahl — und zwischen zwei Zahlen laeuft man den Ring entlang, nie quer.
 *
 * Das ist der Grund fuer den Umbau: vorher wurde nur dann ueber die Bases geroutet, wenn
 * mindestens ein Ende GENAU auf einer Base lag. In den Plays stehen Runner aber meist auf
 * Bruchteilen — von 60 % zwischen 1 und 2 nach 40 % zwischen 2 und 3. Beide Enden lagen
 * also daneben, und der Runner schnitt die 2 ab, statt sie zu beruehren.
 *
 * Wer gar nicht auf dem Ring steht (nach einem Rundown quer im Feld, ein frei gesetzter
 * Marker), laeuft geradeaus — dort gibt es keinen Weg, dem man folgen koennte.
 */
export function runnerPath(von: Point, nach: Point, t: number): Point {
  const a = ringStelle(von);
  const b = ringStelle(nach);
  if (a === null || b === null) {
    return { x: lerp(von.x, nach.x, t), y: lerp(von.y, nach.y, t) };
  }

  const vorwaerts = (b - a + RING) % RING;
  const rueckwaerts = (a - b + RING) % RING;

  /**
   * Beruehrt der Weg Home UNTERWEGS? Dann ist er keiner: wer von der 3 zur 1 zurueck muss,
   * laeuft nicht ueber die Platte — das waere ein Run und danach ein neuer Batter. Nach
   * Home zu laufen ist erlaubt, rueckwaerts hinein nicht.
   */
  const vorwaertsOk = a + vorwaerts <= RING;
  const rueckwaertsOk = a - rueckwaerts >= 0 && b > 0;

  let richtung: 1 | -1;
  let strecke: number;
  if (vorwaertsOk && !rueckwaertsOk) [richtung, strecke] = [1, vorwaerts];
  else if (rueckwaertsOk && !vorwaertsOk) [richtung, strecke] = [-1, rueckwaerts];
  else if (!vorwaertsOk && !rueckwaertsOk) {
    return { x: lerp(von.x, nach.x, t), y: lerp(von.y, nach.y, t) };
  } else [richtung, strecke] = vorwaerts <= rueckwaerts ? [1, vorwaerts] : [-1, rueckwaerts];

  return ringPunkt(a + richtung * strecke * t);
}

/** Umfang der Raute in Fuss: vier Wege zu sechzig. */
const RING = 4 * BASE_PATH;

/**
 * Wie weit ein Marker neben dem Base-Weg liegen darf und trotzdem darauf laeuft.
 * Drei Fuss (der alte Base-Fang) waren zu knapp: ein Lead ist absichtlich ein Stueck
 * neben der Linie gezeichnet, laeuft aber selbstverstaendlich auf ihr.
 */
const RING_TOLERANZ = 6;

/**
 * Die Stelle eines Punktes auf dem Ring, oder null, wenn er nicht darauf liegt.
 * Gemessen ab Home gegen den Uhrzeigersinn: Home 0, 1 bei 60, 2 bei 120, 3 bei 180.
 */
function ringStelle(p: Point): number | null {
  let beste: number | null = null;
  let bestAbstand = RING_TOLERANZ;
  for (let i = 0; i < BASES.length; i++) {
    const von = BASES[i];
    const nach = BASES[(i + 1) % BASES.length];
    const dx = nach.x - von.x;
    const dy = nach.y - von.y;
    const l2 = dx * dx + dy * dy;
    const anteil = Math.max(0, Math.min(1, ((p.x - von.x) * dx + (p.y - von.y) * dy) / l2));
    const auf = { x: von.x + anteil * dx, y: von.y + anteil * dy };
    const abstand = Math.hypot(p.x - auf.x, p.y - auf.y);
    // Strikt kleiner, damit Home bei 0 landet und nicht bei 240: der Punkt liegt auf dem
    // Ende des letzten Wegs genauso wie auf dem Anfang des ersten. Bei 240 greift die
    // Regel "nie rueckwaerts nach Home" nicht, und der Runner spaziert die First-Base-
    // Linie zurueck in den Catcher.
    if (abstand < bestAbstand) {
      bestAbstand = abstand;
      beste = i * BASE_PATH + anteil * BASE_PATH;
    }
  }
  return beste;
}

/** Zurueck zu Koordinaten. Werte ausserhalb [0, RING] werden umgeschlagen. */
function ringPunkt(s: number): Point {
  const gesamt = ((s % RING) + RING) % RING;
  const abschnitt = Math.min(BASES.length - 1, Math.floor(gesamt / BASE_PATH));
  const anteil = (gesamt - abschnitt * BASE_PATH) / BASE_PATH;
  const von = BASES[abschnitt];
  const nach = BASES[(abschnitt + 1) % BASES.length];
  return { x: lerp(von.x, nach.x, anteil), y: lerp(von.y, nach.y, anteil) };
}

