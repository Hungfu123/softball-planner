#!/usr/bin/env node
/**
 * Erzeugt V68__seed_plays.sql aus dem Katalog weiter unten.
 *
 * Die Koordinaten werden gerechnet, nicht getippt: Grundlage sind dieselben Landmarken
 * wie in frontend/src/components/playmaker/board/geometry.ts. Ein Play beschreibt je
 * Stand nur, WAS sich aendert — alles andere bleibt stehen. Das haelt den Katalog lesbar
 * und verhindert, dass sich in 48 Plays mal eben ein Zahlendreher versteckt.
 *
 *   node scripts/build-seed-plays.mjs > backend/src/main/resources/db/migration/V68__seed_plays.sql
 *
 * ACHTUNG: V68 ist in Produktion angewandt und damit unveraenderlich. Wer sie neu erzeugt
 * und die Aenderung pusht, loest eine Pruefsummen-Kollision aus — Flyway bricht ab und das
 * Backend startet nicht mehr. Korrekturen am Katalog kommen als NEUE Migration; den
 * Unterschied dafuer liefert:
 *
 *   node scripts/build-seed-plays.mjs --seit backend/src/main/resources/db/migration/V68__seed_plays.sql
 *
 * Das gibt UPDATE-Anweisungen fuer genau die Staende aus, die sich geaendert haben.
 */

// ---------------------------------------------------------------- Geometrie

const HOME = { x: 155, y: 218 };
const BASE_PATH = 60;
const HALF_DIAG = (BASE_PATH * Math.SQRT2) / 2;

const B1 = { x: HOME.x + HALF_DIAG, y: HOME.y - HALF_DIAG };
const B2 = { x: HOME.x, y: HOME.y - BASE_PATH * Math.SQRT2 };
const B3 = { x: HOME.x - HALF_DIAG, y: HOME.y - HALF_DIAG };
const MOUND = { x: HOME.x, y: HOME.y - 43 };

const DEFAULT_DEFENSE = {
  P: { x: HOME.x, y: MOUND.y + 7 },
  C: { x: HOME.x, y: HOME.y + 8 },
  '1B': { x: HOME.x + 36, y: HOME.y - 52 },
  '2B': { x: HOME.x + 22, y: HOME.y - 78 },
  SS: { x: HOME.x - 22, y: HOME.y - 78 },
  '3B': { x: HOME.x - 36, y: HOME.y - 52 },
  LF: { x: HOME.x - 90, y: HOME.y - 156 },
  CF: { x: HOME.x, y: HOME.y - 185 },
  RF: { x: HOME.x + 90, y: HOME.y - 156 },
};

const r2 = (n) => Math.round(n * 100) / 100;

/** Punkt auf dem Weg von a nach b, Anteil t. */
const between = (a, b, t) => ({ x: r2(a.x + (b.x - a.x) * t), y: r2(a.y + (b.y - a.y) * t) });

/** ft von a in Richtung b. */
function toward(a, b, ft) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: r2(a.x + ((b.x - a.x) / d) * ft), y: r2(a.y + ((b.y - a.y) / d) * ft) };
}

/** Punkt in Richtung Winkel (0 = Center Field, negativ = links) und Entfernung ab Home. */
function fromHome(deg, ft) {
  const rad = (deg * Math.PI) / 180;
  return { x: r2(HOME.x + Math.sin(rad) * ft), y: r2(HOME.y - Math.cos(rad) * ft) };
}

const RIGHT_GAP = fromHome(22, 170);
const LEFT_GAP = fromHome(-22, 170);
const DEEP_RIGHT = fromHome(38, 185);
const DEEP_LEFT = fromHome(-38, 185);
const SHORT_RIGHT = fromHome(30, 120);
const SHORT_LEFT = fromHome(-30, 120);
const UP_MIDDLE = fromHome(0, 120);

// ---------------------------------------------------------------- Bausteine

/** title, Kategorie-Name und die Beschreibung: { outs, startRunners, steps, gameState? }. */
const play = (title, category, spec) => ({ title, category, ...spec });

/**
 * Ein Stand.
 *   note   Was in diesem Moment passiert — wird beim Abspielen eingeblendet
 *   d      Verteidiger, die sich bewegen: { SS: punkt, '2B': punkt }
 *   r      Runner: { r1: punkt } · null entfernt ihn (Out oder Run)
 *   ball   { at: punkt } oder { hold: 'SS' } oder { loose: punkt }
 *   outs   Outs NACH diesem Stand
 *   ms     Dauer, Vorgabe 1200
 */
const s = (note, opts = {}) => ({ note, ...opts });

/**
 * Ein Runner-Eintrag im Katalog:
 *   punkt                 verschiebt ihn
 *   'OUT' | 'SCORED'      laesst ihn stehen und markiert ihn — ab dem naechsten Stand weg
 *   { p, status }         beides zusammen: dort ist er, und dort ist er raus
 *   null                  entfernt ihn sofort (Versehen, nicht Out und nicht Run)
 */
function runnerEintrag(vorher, wert) {
  if (wert === null) return null;
  if (wert === 'OUT' || wert === 'SCORED') {
    if (!vorher) return null;
    return { ...vorher, status: wert };
  }
  if (wert.status) return { x: r2(wert.p.x), y: r2(wert.p.y), status: wert.status };
  return { x: r2(wert.x), y: r2(wert.y), status: 'ACTIVE' };
}

/** Ein Lauf von 60 ft braucht rund 2,5 s. Daran haengt die Dauer eines Stands. */
const LAUFTEMPO = 24; // ft/s
const FELDTEMPO = 22; // ft/s

function dauerAusWegen(weiteste, weitesterWurf) {
  void weitesterWurf;
  const sekunden = weiteste / LAUFTEMPO;
  const ms = Math.ceil((sekunden * 1000) / 200) * 200;
  return Math.max(1200, Math.min(3000, ms));
}

/**
 * Wer sichert hinter welcher Base ab.
 *
 * Jeder hat in einem Play seine Rolle; wer nicht faengt und nicht wirft, steht trotzdem
 * nicht herum. Lehrbuch und Teamsprache fallen hier zusammen: **RF hinter die 1, CF
 * hinter die 2, LF hinter die 3, der Pitcher hinter die Platte** — und **beim Relay aus
 * dem Outfield geht der Pitcher hinter die Base, auf die geworfen wird**, weil die
 * Outfielder dann selbst am Ball sind.
 *
 * Gezaehlt vor dieser Regel: von 101 Wuerfen in den 51 Plays hatte nur bei 44 ueberhaupt
 * jemand dahintergestanden — dort, wo der Katalog es ausdruecklich hingeschrieben hat.
 * Jetzt steht die Regel an EINER Stelle statt einundfuenfzig Mal, und der Katalog behaelt
 * das letzte Wort: bewegt er den Mann in diesem Stand selbst, bleibt es dabei.
 */
const ABSICHERUNG = [
  { base: B1, mann: 'RF', ersatz: '2B' },
  { base: B2, mann: 'CF', ersatz: 'P' },
  { base: B3, mann: 'LF', ersatz: 'P' },
  { base: HOME, mann: 'P', ersatz: null },
];

/** Weiter als das weg von Home liegt das Outfield — von dort wirft kein Infielder. */
const OUTFIELD_AB = 140;
/** Hinter der Base, auf der Verlaengerung des Wurfs: dort, wo ein Fehlwurf hinginge. */
const HINTER_DER_BASE = 20;
/**
 * Weiter als das laeuft auch ein Outfielder nicht hinter eine Base.
 *
 * 160 ft sind viel, und ein Right Fielder braucht dafuer laenger als der Wurf dauert —
 * er laeuft aber auch nicht erst beim Wurf los, sondern beim Schlag. Das Bild zeigt
 * deshalb seinen Platz, nicht seine Laufzeit.
 */
const HOECHSTER_WEG = 160;

function absichern(defense, vorherDefense, step, ball, vorherBall) {
  const strecke = Math.hypot(ball.x - vorherBall.x, ball.y - vorherBall.y);
  if (strecke < 25) return;

  const ziel = ABSICHERUNG.find((a) => Math.hypot(ball.x - a.base.x, ball.y - a.base.y) <= 14);
  if (!ziel) return;

  // Wer wirft und wer faengt, kann nicht gleichzeitig dahinterstehen.
  const werfer = Object.entries(vorherDefense).find(
    ([, q]) => Math.hypot(q.x - vorherBall.x, q.y - vorherBall.y) < 6,
  )?.[0];
  const empfaenger =
    ball.holder ??
    Object.entries(defense).find(([, q]) => Math.hypot(q.x - ball.x, q.y - ball.y) < 8)?.[0];

  // Kommt der Wurf aus dem Outfield — Relay —, geht der Pitcher hinter die Zielbase.
  const ausDemOutfield = Math.hypot(vorherBall.x - HOME.x, vorherBall.y - HOME.y) > OUTFIELD_AB;
  const reihenfolge = ausDemOutfield && ziel.ersatz === 'P' ? ['P', ziel.mann] : [ziel.mann, ziel.ersatz];

  for (const kandidat of reihenfolge) {
    if (!kandidat) continue;
    if (kandidat === werfer || kandidat === empfaenger) continue;
    if (step.d && kandidat in step.d) continue;

    const richtung = Math.hypot(ziel.base.x - vorherBall.x, ziel.base.y - vorherBall.y) || 1;
    const platz = {
      x: r2(ziel.base.x + ((ziel.base.x - vorherBall.x) / richtung) * HINTER_DER_BASE),
      y: r2(ziel.base.y + ((ziel.base.y - vorherBall.y) / richtung) * HINTER_DER_BASE),
    };
    /*
     * Ein Outfielder sichert nur ab, was VOR ihm liegt.
     *
     * Liegt der Platz hinter der Base naeher an Home als die Base selbst, kommt der Wurf
     * von draussen — beim Relay etwa — und der Mann muesste quer durchs Infield laufen,
     * um sich dahinterzustellen. Das tut kein Outfielder; dafuer ist der Pitcher da.
     * Ohne diese Zeile lief der CF beim Relay aus dem rechten Feld bis zwischen SS und
     * Mound, was im Bild aussah, als haette er die Position verlassen.
     */
    const istOutfielder = kandidat === 'LF' || kandidat === 'CF' || kandidat === 'RF';
    const vonHome = (q) => Math.hypot(q.x - HOME.x, q.y - HOME.y);
    if (istOutfielder && vonHome(platz) < vonHome(ziel.base)) continue;

    // Steht dort schon jemand — meist weil der Katalog ihn hingestellt hat —, ist die
    // Base abgesichert. Zwei Scheiben auf demselben Fleck sind eine Scheibe.
    const besetzt = Object.entries(defense).some(
      ([pos, q]) => pos !== kandidat && Math.hypot(q.x - platz.x, q.y - platz.y) < 12,
    );
    if (besetzt) return;

    const von = defense[kandidat];
    const weg = Math.hypot(platz.x - von.x, platz.y - von.y);
    if (weg > HOECHSTER_WEG) continue;
    // Steht er ohnehin schon dort, bleibt er stehen — sonst zittert er auf der Stelle.
    if (weg < 8) return;

    defense[kandidat] = platz;
    return;
  }
}

/**
 * Wer eine Base deckt, steht NEBEN der Base, nicht darauf.
 *
 * Im Katalog steht an zwei Dutzend Stellen schlicht `B2` — gemeint ist „deckt die 2",
 * gezeichnet wurde aber eine Scheibe genau auf dem Sack. Sobald ein Runner dort ankommt,
 * liegt er darueber und der Verteidiger verschwindet: im Bild fehlte plötzlich der 2B,
 * obwohl er die Base deckte. Auf dem Platz steht ohnehin niemand auf der Base, man
 * stellt sich an die Aussenseite und nimmt den Wurf.
 *
 * Also ruecken wir ihn nach aussen, weg von Home — die Base bleibt frei fuer den, der
 * sie erreichen will. **Zehn Fuss**, und das ist gemessen, nicht geschaetzt: die Scheibe
 * des Verteidigers misst 4,5 Fuss im Radius, die des Runners 3,7 — unter 8,2 Fuss
 * ueberlappen sie, und erst mit etwas Luft darueber liest man zwei Leute statt einem
 * Fleck. Die Scheiben sind groesser als Menschen; der Abstand ist eine Frage des
 * Bildes, nicht des Platzes.
 */
const NEBEN_DER_BASE = 10;

function nebenDieBase(defense) {
  for (const [pos, p] of Object.entries(defense)) {
    // Home hat kein Aussen vom Mittelpunkt aus — dort ist aussen hinter der Platte.
    if (Math.hypot(p.x - HOME.x, p.y - HOME.y) < 1.5) {
      defense[pos] = { x: r2(HOME.x), y: r2(HOME.y + NEBEN_DER_BASE) };
      continue;
    }
    const base = [B1, B2, B3].find((b) => Math.hypot(p.x - b.x, p.y - b.y) < 1.5);
    if (!base) continue;
    const weg = Math.hypot(base.x - HOME.x, base.y - HOME.y) || 1;
    defense[pos] = {
      x: r2(base.x + ((base.x - HOME.x) / weg) * NEBEN_DER_BASE),
      y: r2(base.y + ((base.y - HOME.y) / weg) * NEBEN_DER_BASE),
    };
  }
}

function buildSteps(spec, startRunners) {
  const defense = { ...DEFAULT_DEFENSE };
  const runners = {};
  for (const [id, p] of Object.entries(startRunners)) runners[id] = { x: r2(p.x), y: r2(p.y), status: 'ACTIVE' };
  let ball = { state: 'AT_BAT', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' };
  let outs = spec.outs ?? 0;

  let kontaktIndex = -1;
  let batterRaus = false;
  let batterAnteil = 0;

  const gebaut = spec.steps.map((step, index) => {
    const vorher = { defense: { ...defense }, runners: { ...runners } };
    if (step.d) for (const [pos, punkt] of Object.entries(step.d)) defense[pos] = punkt;

    // Wer den Ball hat, nimmt ihn mit. Ohne das blieb der Ball liegen, wenn sich sein
    // Halter bewegte — beim Squeeze lag er zwoelf Fuss neben dem Catcher.
    if (ball.holder && step.d && step.d[ball.holder]) {
      const halter = defense[ball.holder];
      ball = { ...ball, x: halter.x, y: halter.y };
    }
    // Wer im VORIGEN Stand out war oder gepunktet hat, ist jetzt weg.
    for (const [id, r] of Object.entries(runners)) if (r.status !== 'ACTIVE') delete runners[id];
    if (step.r) {
      for (const [id, wert] of Object.entries(step.r)) {
        const eintrag = runnerEintrag(runners[id], wert);
        if (eintrag === null) delete runners[id];
        else runners[id] = eintrag;
      }
    }
    // Kontakt: der Ball verlaesst die Hand des Pitchers, ohne dass ihn jemand faengt —
    // also wurde geschlagen. Dann beginnt die Flugbahn an HOME und nicht am Pitcher, und
    // der Batter laeuft los. `keinSchlag` schaltet das ab: ein Passed Ball, ein Pickoff
    // und jeder Wurf des Catchers sind kein Schlag, und es gibt keinen Batter-Runner.
    const kontakt =
      !spec.keinSchlag &&
      !step.keinSchlag &&
      ball.state === 'AT_BAT' &&
      step.ball &&
      !step.ball.hold &&
      (step.ball.at || step.ball.loose);
    if (kontakt) kontaktIndex = index;

    /**
     * Der Batter laeuft. Ohne das stand er vier Staende lang auf der Platte, mitten im
     * Catcher — und das Doppelspiel an der 1 hatte niemanden, den man dort ausmacht.
     * Er erscheint IM Kontaktstand bei Anteil 0, also an der Platte: wer ihn erst auf
     * halber Strecke auftauchen sieht, haelt ihn fuer einen zweiten Runner.
     */
    const setztBatter = Boolean(step.r && 'rb' in step.r);
    if (kontaktIndex === index) {
      // Im Moment des Kontakts steht er an der Platte. Ein Play, das ihn hier schon
      // achtzehn Fuss weiter setzt, zeigt keinen Batter, sondern einen zweiten Runner.
      batterAnteil = 0;
      runners.rb = { x: HOME.x, y: HOME.y, status: 'ACTIVE' };
    } else if (setztBatter) {
      // Ab hier fuehrt das Play selbst — ausser es ist ein Ende (OUT, SCORED, weg).
      const wert = step.r.rb;
      batterRaus = wert === null || typeof wert === 'string' || Boolean(wert.status);
      if (!batterRaus) {
        // Steht er noch auf dem Weg zur 1? Dann laeuft er von dort weiter. Steht er schon
        // auf der 2, hat das Play ihn weitergeschickt und der Automat hat nichts mehr zu
        // suchen — sonst zog er ihn im Folgestand zurueck auf die 1.
        const anteil = ((wert.x - HOME.x) * (B1.x - HOME.x) + (wert.y - HOME.y) * (B1.y - HOME.y)) / (BASE_PATH * BASE_PATH);
        const auf = between(HOME, B1, Math.max(0, Math.min(1, anteil)));
        if (anteil <= 1.01 && Math.hypot(wert.x - auf.x, wert.y - auf.y) <= 3) batterAnteil = Math.max(0, anteil);
        else batterRaus = true;
      }
    } else if (kontaktIndex >= 0 && !batterRaus && runners.rb) {
      // Strecke nach Zeit, nicht nach Stand: ein 0,6-Sekunden-Stand ist ein kurzer
      // Moment, da legt niemand ein Drittel des Base-Wegs zurueck.
      const sekunden = (step.ms ?? 1200) / 1000;
      batterAnteil = Math.min(1, batterAnteil + sekunden * 0.33);
      const q = between(HOME, B1, batterAnteil);
      runners.rb = { x: q.x, y: q.y, status: 'ACTIVE' };
    }

    const vorherBall = { x: ball.x, y: ball.y };
    if (step.ball) {
      if (step.ball.hold) {
        const halter = defense[step.ball.hold];
        ball = { state: 'IN_HAND', holder: step.ball.hold, x: halter.x, y: halter.y, trajectory: 'AIR' };
      } else if (step.ball.loose) {
        ball = { state: 'LOOSE', holder: null, ...step.ball.loose, trajectory: 'GROUND' };
      } else if (step.ball.at) {
        ball = {
          state: 'IN_FLIGHT',
          holder: null,
          ...step.ball.at,
          trajectory: step.ball.ground ? 'GROUND' : 'AIR',
        };
      }
    }
    // Ein fliegender Ball, der GENAU auf einem Verteidiger liegt, verdeckt dessen
    // Kuerzel — die Scheibe bleibt, aber man liest nicht mehr, wer dort steht. Genau in
    // den Faengen ("RF nimmt auf") ist das die Stelle, auf die es ankommt. Also legt er
    // sich kurz vor ihn, dorthin, woher er kommt: ankommend statt angekommen.
    if (!ball.holder) {
      const auf = Object.values(defense).find((q) => Math.hypot(q.x - ball.x, q.y - ball.y) < 2);
      if (auf) {
        const her = vorherBall;
        const dx = her.x - ball.x;
        const dy = her.y - ball.y;
        const l = Math.hypot(dx, dy);
        if (l > 8) ball = { ...ball, x: r2(ball.x + (dx / l) * 7), y: r2(ball.y + (dy / l) * 7) };
      }
    }
    if (step.outs !== undefined) outs = step.outs;

    /*
     * Absicherung, nach jedem Wurf — auch bei Pickoffs und kurzen Wuerfen zwischen den
     * Bases. Ein Wurf, der vorbeigeht, kostet eine Base, wenn niemand dahintersteht, und
     * keine, wenn doch; deshalb gehoert das Hinterherlaufen ins Bild und nicht in eine
     * Fussnote.
     */
    absichern(defense, vorher.defense, step, ball, vorherBall);
    nebenDieBase(defense);

    // Lange Wege brauchen laenger. Alles im selben Takt zu bewegen ist Absicht — aber
    // 80 ft in 1,2 s sehen nicht nach Laufen aus, sondern nach einem Sprung: ein Runner
    // schafft keine 30 ft/s, und genau daran erkennt man, dass ein Bild nicht stimmt.
    let dauer = step.ms ?? 1200;
    if (!step.ms) {
      let weitesterLauf = 0;
      let weitesterWeg = 0;
      for (const [pos, p] of Object.entries(defense)) {
        const alt = vorher.defense[pos];
        if (alt) weitesterWeg = Math.max(weitesterWeg, Math.hypot(p.x - alt.x, p.y - alt.y));
      }
      for (const [id, p] of Object.entries(runners)) {
        const alt = vorher.runners[id];
        if (alt) weitesterLauf = Math.max(weitesterLauf, laufweg(alt, p));
      }
      dauer = dauerAusWegen(Math.max(weitesterLauf, (weitesterWeg * LAUFTEMPO) / FELDTEMPO), 0);
    }

    return {
      ordinal: index + 1,
      durationMs: dauer,
      note: step.note,
      outs,
      markers: {
        defenders: Object.entries(defense).map(([position, p]) => ({ position, x: r2(p.x), y: r2(p.y) })),
        runners: Object.entries(runners).map(([id, r]) => ({ id, x: r2(r.x), y: r2(r.y), status: r.status })),
        ball,
      },
    };
  });

  /**
   * Der Stand VOR dem Kontakt zeigt den Ball an Home, nicht beim Pitcher.
   *
   * Sonst laeuft die abgeleitete Flugbahn im Folgestand vom Pitcher zum Fielder — und
   * liest sich wie ein Wurf statt wie ein Schlag.
   */
  if (kontaktIndex > 0) {
    const davor = gebaut[kontaktIndex - 1];
    davor.markers.ball = {
      state: 'AT_BAT',
      holder: null,
      x: HOME.x,
      y: HOME.y - 2,
      trajectory: 'AIR',
    };
  }

  return gebaut;
}

/**
 * Wie weit ein Runner wirklich laeuft. Wer von der 1 auf einen Punkt zwischen 2 und 3
 * zieht, nimmt nicht die Luftlinie quer durchs Infield, sondern den Base-Weg ueber die 2
 * — die Wiedergabe zeichnet es so, also muss die Dauer dasselbe annehmen.
 */
function laufweg(von, nach) {
  const BASEN = [HOME, B1, B2, B3];
  const nahe = (p) => BASEN.findIndex((b) => Math.hypot(p.x - b.x, p.y - b.y) <= 3);
  const direkt = Math.hypot(nach.x - von.x, nach.y - von.y);
  const a = nahe(von);
  if (a < 0) return direkt;
  let b = nahe(nach);
  let zusatz = 0;
  if (b < 0) {
    // Liegt das Ziel auf einem Base-Weg? Dann ist der Anfang dieses Wegs die letzte Base.
    for (let i = 0; i < 4; i++) {
      const p1 = BASEN[i];
      const p2 = BASEN[(i + 1) % 4];
      const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
      const t = ((nach.x - p1.x) * (p2.x - p1.x) + (nach.y - p1.y) * (p2.y - p1.y)) / l2;
      if (t <= 0.02 || t >= 0.98) continue;
      const q = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
      if (Math.hypot(nach.x - q.x, nach.y - q.y) <= 4) {
        b = i;
        zusatz = Math.hypot(nach.x - BASEN[i].x, nach.y - BASEN[i].y);
        break;
      }
    }
    if (b < 0) return direkt;
  }
  let schritte = (b - a + 4) % 4;
  if (schritte === 0) return zusatz || direkt;
  return schritte * BASE_PATH + zusatz;
}

// ---------------------------------------------------------------- Katalog

const KATALOG = [
  // ============================================================ Base-Coverage
  play('Grounder zum SS — wer deckt die 2', 'Base-Coverage', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Runner auf 1, keine Outs. Grounder geht zum Shortstop.'),
      s('SS fängt, 2B kommt zur Base — nicht SS, der hat den Ball.', {
        d: { SS: { x: HOME.x - 26, y: HOME.y - 74 }, '2B': B2 },
        ball: { at: { x: HOME.x - 26, y: HOME.y - 74 }, ground: true },
        r: { r1: between(B1, B2, 0.5) },
      }),
      s('Wurf auf die 2, Force Out.', {
        ball: { hold: '2B' },
        r: { r1: 'OUT' },
        outs: 1,
        ms: 600,
      }),
      s('2B dreht und wirft weiter auf die 1 — Doppelspiel, wenn der Batter langsam ist.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' } },
        outs: 2,
      }),
    ],
  }),

  play('Grounder zum 2B — wer deckt die 2', 'Base-Coverage', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Grounder nach rechts. Der 2B hat den Ball, also deckt der SS ab.'),
      s('SS zur Base, 2B fängt.', {
        d: { '2B': { x: HOME.x + 26, y: HOME.y - 74 }, SS: B2 },
        ball: { at: { x: HOME.x + 26, y: HOME.y - 74 }, ground: true },
        r: { r1: between(B1, B2, 0.5) },
      }),
      s('Kurzer Wurf auf die 2.', { ball: { hold: 'SS' }, r: { r1: 'OUT' }, outs: 1, ms: 600 }),
      s('Weiter auf die 1.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' } },
        outs: 2,
      }),
    ],
  }),

  play('Grounder zum 3B — Wurf auf die 1', 'Base-Coverage', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Harter Grounder die Linie entlang.'),
      s('3B greift ihn an der Linie ab.', {
        d: { '3B': { x: HOME.x - 44, y: HOME.y - 46 } },
        ball: { at: { x: HOME.x - 44, y: HOME.y - 46 }, ground: true },
      }),
      s('Langer Wurf quer rüber, 1B an der Base — der C geht hinter die 1.', {
        d: { '1B': B1, C: between(HOME, B1, 0.42) },
        ball: { hold: '1B' },
      }),
      s('Out an der 1.', { r: { rb: { p: B1, status: 'OUT' } }, outs: 2 }),
    ],
  }),

  play('Grounder zum 1B — wer deckt die 1', 'Base-Coverage', {
    outs: 0,
    startRunners: {},
    steps: [
      s('Grounder zum ersten Baseman. Er verlässt die Base — also muss jemand hin.'),
      s('1B holt ihn weit vor der Base — jetzt muss jemand an die 1.', {
        // Der P laeuft NICHT auf geradem Weg zum 1B — dort steht der 1B mit dem Ball.
        // Er bricht zur Linie aus und laeuft sie parallel an.
        d: {
          '1B': { x: HOME.x + 30, y: HOME.y - 32 },
          P: { x: HOME.x + 18, y: HOME.y - 54 },
          C: between(HOME, B1, 0.42),
        },
        ball: { at: { x: HOME.x + 30, y: HOME.y - 32 }, ground: true },
      }),
      s('Wurf zum laufenden Pitcher, er trifft die Base mit dem Fuß.', {
        d: { P: B1 },
        ball: { hold: 'P' },
      }),
      s('Out.', { r: { rb: { p: B1, status: 'OUT' } }, outs: 1 }),
    ],
  }),

  play('Comebacker zum Pitcher', 'Base-Coverage', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Runner auf 1. Der Schlag kommt hart zurück zum Pitcher.'),
      s('Comebacker — der P fängt ihn selbst.', {
        ball: { at: { x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y }, ground: true },
      }),
      s('P dreht sich zur 2. Wer dort deckt, ist abgesprochen — hier der 2B.', {
        ball: { hold: 'P' },
        d: { '2B': B2 },
        r: { r1: between(B1, B2, 0.55) },
      }),
      s('Wurf auf die 2.', { ball: { hold: '2B' }, r: { r1: 'OUT' }, outs: 1, ms: 600 }),
      s('Und weiter auf die 1.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' } },
        outs: 2,
      }),
    ],
  }),

  play('Doppelspiel 6-4-3', 'Base-Coverage', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Runner auf 1, ein Grounder ins Loch — das Standard-Doppelspiel.'),
      s('SS fängt seitlich, 2B ist schon unterwegs zur Base.', {
        d: { SS: { x: HOME.x - 34, y: HOME.y - 70 }, '2B': toward(DEFAULT_DEFENSE['2B'], B2, 14) },
        ball: { at: { x: HOME.x - 34, y: HOME.y - 70 }, ground: true },
        r: { r1: between(B1, B2, 0.4) },
      }),
      s('Wurf zur 2, der 2B nimmt im Lauf an.', {
        d: { '2B': B2 },
        ball: { hold: '2B' },
        r: { r1: 'OUT' },
        outs: 1,
        ms: 600,
      }),
      s('Abdrehen vom Runner weg, dann auf die 1.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' } },
        outs: 2,
      }),
    ],
  }),

  play('Single ins LF — Backup hinter der 2', 'Base-Coverage', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Ball fällt ins linke Feld. Jetzt zählt, wer hinter der Base steht.'),
      s('LF läuft an, CF sichert schräg dahinter ab.', {
        d: { LF: SHORT_LEFT, CF: toward(DEFAULT_DEFENSE.CF, SHORT_LEFT, 40) },
        ball: { at: SHORT_LEFT, ground: true },
        r: { rb: between(HOME, B1, 0.6) },
      }),
      s('Wurf auf die 2: SS nimmt an, der 2B steht dahinter. Der P sichert die 3 ab.', {
        d: { SS: B2, '2B': { x: B2.x + 23, y: B2.y + 8 }, P: { x: B3.x - 16, y: B3.y + 12 } },
        ball: { hold: 'SS' },
        r: { rb: B1 },
      }),
    ],
  }),

  play('Single ins RF — Backup hinter der 1', 'Base-Coverage', {
    outs: 0,
    startRunners: {},
    steps: [
      s('Ball ins rechte Feld, der Batter rundet die 1.'),
      s('RF nimmt auf, 1B kommt zurück zur Base.', {
        d: { RF: SHORT_RIGHT, '1B': B1 },
        ball: { at: SHORT_RIGHT, ground: true },
        r: { rb: between(HOME, B1, 0.9) },
      }),
      s('Wurf zurück zur 1, 2B sichert im Foul-Gebiet dahinter ab.', {
        d: { '2B': { x: B1.x - 5, y: B1.y + 17 } },
        ball: { hold: '1B' },
        r: { rb: B1 },
      }),
    ],
  }),

  play('Bases Loaded — Force an Home', 'Base-Coverage', {
    outs: 1,
    startRunners: { r1: B1, r2: B2, r3: B3 },
    steps: [
      s('Bases loaded, ein Out. Der Force gilt an jeder Base — auch an der Platte.'),
      s('Grounder zum SS. Alle drei müssen laufen.', {
        d: { SS: { x: HOME.x - 26, y: HOME.y - 72 }, C: HOME },
        ball: { at: { x: HOME.x - 26, y: HOME.y - 72 }, ground: true },
        r: {
          r3: between(B3, HOME, 0.3),
          r2: between(B2, B3, 0.3),
          r1: between(B1, B2, 0.3),
        },
      }),
      s('Wurf nach Home — der kürzeste Weg und der teuerste Runner.', {
        ball: { hold: 'C' },
        r: {
          r3: { p: HOME, status: 'OUT' },
          r2: between(B2, B3, 0.7),
          r1: between(B1, B2, 0.7),
        },
        outs: 2,
      }),
      s('Und weiter auf die 1 — Doppelspiel, wenn der Wurf sitzt.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' }, r2: B3, r1: B2 },
        outs: 3,
      }),
    ],
  }),

  play('Bases Loaded — der 3B tritt selbst auf die 3', 'Base-Coverage', {
    outs: 0,
    startRunners: { r1: B1, r2: B2, r3: B3 },
    steps: [
      s('Bases loaded, keine Outs. Der Ball kommt scharf zum 3B.'),
      s('Grounder zum 3B, nah an der Base.', {
        d: { '3B': { x: B3.x + 4, y: B3.y + 14 } },
        ball: { at: { x: B3.x + 4, y: B3.y + 14 }, ground: true },
        r: {
          r2: between(B2, B3, 0.35),
          r1: between(B1, B2, 0.35),
          r3: between(B3, HOME, 0.35),
        },
      }),
      s('Er tritt selbst auf die Base — der schnellste Force, ganz ohne Wurf.', {
        d: { '3B': B3 },
        ball: { hold: '3B' },
        r: { r2: { p: B3, status: 'OUT' }, r1: between(B1, B2, 0.7), r3: between(B3, HOME, 0.7) },
        outs: 1,
      }),
      s('Dann der lange Wurf auf die 1. Der Run von der 3 zählt — zwei Outs sind mehr wert.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' }, r3: 'SCORED', r1: B2 },
        outs: 2,
      }),
    ],
  }),

  play('Überwurf an der 1 — wer sichert ab', 'Base-Coverage', {
    outs: 1,
    startRunners: {},
    keinSchlag: true,
    steps: [
      s('Der SS hat den Grounder, der Wurf auf die 1 geht zu hoch.', {
        ball: { hold: 'SS' },
        r: { rb: between(HOME, B1, 0.4) },
      }),
      s('Der Ball fliegt über den 1B hinweg ins Foul-Gebiet.', {
        d: { '1B': B1, RF: { x: B1.x + 34, y: B1.y - 30 } },
        ball: { at: { x: B1.x + 26, y: B1.y + 14 } },
        r: { rb: between(HOME, B1, 0.9) },
      }),
      s('RF war von Anfang an unterwegs — ohne ihn läuft der Runner bis zur 3.', {
        d: { RF: { x: B1.x + 36, y: B1.y + 4 } },
        ball: { loose: { x: B1.x + 22, y: B1.y + 10 } },
        r: { rb: between(B1, B2, 0.25) },
      }),
      s('RF hat ihn, der Runner bleibt auf der 2.', {
        ball: { hold: 'RF' },
        r: { rb: B2 },
      }),
    ],
  }),

  // ============================================================ Cut-off & Relay
  play('Single ins LF, Runner auf 1 — Wurf auf die 3', 'Cut-off & Relay', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Runner auf 1 startet mit dem Schlag.'),
      s('Ball fällt vor dem LF auf.', {
        ball: { at: SHORT_LEFT, ground: true },
        d: { LF: SHORT_LEFT },
        r: { r1: between(B1, B2, 0.6), rb: between(HOME, B1, 0.3) },
      }),
      s('SS geht als Cut-Mann auf die Linie LF–3B, der 2B rückt auf die 2, der P hinter die 3.', {
        d: { SS: between(SHORT_LEFT, B3, 0.45), '3B': B3, '2B': B2, P: { x: B3.x - 16, y: B3.y + 14 } },
        ball: { at: between(SHORT_LEFT, B3, 0.45) },
        r: { r1: between(B2, B3, 0.4), rb: B1 },
      }),
      s('Cut lässt durch — der Wurf geht auf die 3.', {
        ball: { hold: '3B' },
        r: { r1: between(B2, B3, 0.9) },
      }),
    ],
  }),

  play('Single ins CF, Runner auf 1 — Wurf auf die 3', 'Cut-off & Relay', {
    outs: 1,
    startRunners: { r1: B1 },
    steps: [
      s('Ball geht durch die Mitte.'),
      s('CF läuft an.', {
        d: { CF: UP_MIDDLE },
        ball: { at: UP_MIDDLE, ground: true },
        r: { r1: between(B1, B2, 0.55), rb: between(HOME, B1, 0.3) },
      }),
      s('SS stellt sich zwischen CF und 3B, der 2B deckt die 2, der P sichert hinter der 3 ab.', {
        d: { SS: between(UP_MIDDLE, B3, 0.5), '3B': B3, '2B': B2, P: { x: B3.x - 16, y: B3.y + 14 } },
        ball: { at: between(UP_MIDDLE, B3, 0.5) },
        r: { r1: between(B2, B3, 0.5), rb: B1 },
      }),
      s('Wurf durch auf die 3.', { ball: { hold: '3B' }, r: { r1: between(B2, B3, 0.95) } }),
    ],
  }),

  play('Single ins RF, Runner auf 1 — Wurf auf die 3', 'Cut-off & Relay', {
    outs: 1,
    startRunners: { r1: B1 },
    steps: [
      s('Der längste Weg im Spiel: von rechts auf die 3.'),
      s('RF nimmt den Ball auf.', {
        d: { RF: SHORT_RIGHT },
        ball: { at: SHORT_RIGHT, ground: true },
        r: { r1: between(B1, B2, 0.6), rb: between(HOME, B1, 0.3) },
      }),
      s('Ball rechts, also zieht der 2B als Cut heraus. Der SS deckt die 2, der 3B stellt ihn, der P sichert hinter der 3 ab.', {
        d: { '2B': between(SHORT_RIGHT, B3, 0.45), '3B': B3, SS: B2, P: { x: B3.x - 16, y: B3.y + 14 } },
        ball: { at: between(SHORT_RIGHT, B3, 0.45) },
        r: { r1: between(B2, B3, 0.45), rb: B1 },
      }),
      s('Der Runner war zu weit raus — Wurf auf die 3.', {
        ball: { hold: '3B' },
        r: { r1: 'OUT' },
        outs: 2,
      }),
    ],
  }),

  play('Single ins LF, Runner auf 2 — Wurf nach Home', 'Cut-off & Relay', {
    outs: 1,
    startRunners: { r2: B2 },
    gameState: 'CLOSE_LATE',
    gameStateNote: 'Knapp im letzten Inning: der Run darf nicht fallen, alles geht an Home.',
    steps: [
      s('Runner auf 2, knapper Spielstand. Der Run entscheidet.'),
      s('Ball ins linke Feld, der Runner rundet die 3.', {
        d: { LF: SHORT_LEFT },
        ball: { at: SHORT_LEFT, ground: true },
        r: { r2: between(B2, B3, 0.8), rb: between(HOME, B1, 0.3) },
      }),
      s('Der C stellt den SS auf die Linie LF–Home — Ball links, also er. Der 3B bleibt an der 3, der 2B deckt die 2, der P geht hinter die Platte.', {
        d: {
          SS: between(SHORT_LEFT, HOME, 0.4),
          C: HOME,
          '3B': B3,
          '2B': B2,
          P: { x: HOME.x + 6, y: HOME.y + 26 },
        },
        ball: { at: between(SHORT_LEFT, HOME, 0.4) },
        r: { r2: between(B3, HOME, 0.5), rb: B1 },
      }),
      s('Durchlassen, Wurf nach Home.', { ball: { hold: 'C' }, r: { r2: between(B3, HOME, 0.9) } }),
    ],
  }),

  play('Single ins RF, Runner auf 2 — Wurf nach Home', 'Cut-off & Relay', {
    outs: 1,
    startRunners: { r2: B2 },
    steps: [
      s('Dasselbe von rechts — hier ist der 2B der Relay.'),
      s('RF nimmt auf.', {
        d: { RF: SHORT_RIGHT },
        ball: { at: SHORT_RIGHT, ground: true },
        r: { r2: between(B2, B3, 0.85), rb: between(HOME, B1, 0.3) },
      }),
      s('Der C stellt den 2B auf die Linie RF–Home. Der 1B bleibt an der 1, der SS deckt die 2, der P geht hinter die Platte.', {
        d: {
          '2B': between(SHORT_RIGHT, HOME, 0.45),
          C: HOME,
          '1B': B1,
          SS: B2,
          P: { x: HOME.x + 6, y: HOME.y + 26 },
        },
        ball: { at: between(SHORT_RIGHT, HOME, 0.45) },
        r: { r2: between(B3, HOME, 0.55), rb: B1 },
      }),
      s('Der Wurf segelt — der Relay nimmt ihn runter. Der Run zählt, der Batter bleibt auf der 1.', {
        ball: { hold: '2B' },
        r: { r2: 'SCORED', rb: B1 },
      }),
    ],
  }),

  play('Double in die linke Gasse — Relay über SS', 'Cut-off & Relay', {
    outs: 0,
    startRunners: {},
    steps: [
      s('Ball rollt in die linke Gasse. Für einen Wurf ist das zu weit.'),
      s('LF und CF jagen hinterher, LF hat Vorfahrt.', {
        d: { LF: DEEP_LEFT, CF: toward(DEFAULT_DEFENSE.CF, DEEP_LEFT, 50) },
        ball: { at: DEEP_LEFT, ground: true },
        r: { rb: between(HOME, B1, 0.8) },
      }),
      s('SS geht weit raus als Relay — ungefähr halbe Strecke.', {
        d: { SS: between(DEEP_LEFT, B3, 0.5) },
        ball: { at: between(DEEP_LEFT, B3, 0.5) },
        r: { rb: between(B1, B2, 0.6) },
      }),
      s('Relay dreht und wirft auf die 3 — der P steht dahinter.', {
        d: { '3B': B3, P: { x: B3.x - 16, y: B3.y + 14 } },
        ball: { hold: '3B' },
        r: { rb: B2 },
      }),
    ],
  }),

  play('Double in die rechte Gasse — Relay über 2B', 'Cut-off & Relay', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Spiegelbildlich nach rechts: hier geht der 2B raus.'),
      s('RF an der Wand.', {
        d: { RF: DEEP_RIGHT, CF: toward(DEFAULT_DEFENSE.CF, DEEP_RIGHT, 50) },
        ball: { at: DEEP_RIGHT, ground: true },
        r: { rb: between(HOME, B1, 0.85) },
      }),
      s('2B als Relay auf halber Strecke.', {
        d: { '2B': between(DEEP_RIGHT, B2, 0.5) },
        ball: { at: between(DEEP_RIGHT, B2, 0.5) },
        r: { rb: between(B1, B2, 0.7) },
      }),
      s('Wurf auf die 2 — SS deckt ab, weil der 2B draußen ist.', {
        d: { SS: B2 },
        ball: { hold: 'SS' },
        r: { rb: between(B1, B2, 0.95) },
      }),
    ],
  }),

  play('Tiefes RF, Doppel-Relay', 'Cut-off & Relay', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Ganz tief rechts. Eine Kette aus zwei Spielern ist schneller als ein weiter Wurf.'),
      s('RF am Zaun.', {
        d: { RF: fromHome(40, 200) },
        ball: { at: fromHome(40, 200), ground: true },
        r: { r1: between(B1, B2, 0.9), rb: between(HOME, B1, 0.7) },
      }),
      /*
       * Kein zweiter Relay hinter dem ersten.
       *
       * Hier stand der 1B als zweiter Mann hinter dem 2B — die Baseball-Variante, die
       * im Team ausdruecklich nicht gilt. Der Preis war dieselbe Luecke wie beim Ball
       * am Zaun: **die 2 deckte niemand**, und der Batter-Runner laeuft genau dorthin.
       * Also Ball rechts → der 2B ist Cut, der SS deckt die 2, der 1B bleibt an seiner
       * Base, und abgesichert wird von hinten vom Pitcher.
       */
      s('2B geht als Relay raus — der SS deckt die 2, da will der Batter hin.', {
        d: { '2B': between(fromHome(40, 200), HOME, 0.45), SS: B2 },
        ball: { at: between(fromHome(40, 200), HOME, 0.45) },
        r: { r1: between(B2, B3, 0.6), rb: B1 },
      }),
      s('Der Relay wirft nach Home, der P geht hinter die Platte.', {
        ball: { at: between(between(fromHome(40, 200), HOME, 0.45), HOME, 0.6) },
        d: { P: { x: HOME.x + 6, y: HOME.y + 26 } },
        r: { r1: between(B3, HOME, 0.5), rb: B2 },
      }),
      s('Von dort nach Home. Der Run fällt trotzdem — dafür bleibt der Batter auf der 2.', {
        d: { C: HOME },
        ball: { hold: 'C' },
        r: { r1: 'SCORED' },
      }),
    ],
  }),

  // ============================================================ Bunt-Defense
  play('Sac-Bunt, Runner auf 1 — sicherer Out an der 1', 'Bunt-Defense', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Runner auf 1, keine Outs. Der Bunt kommt.'),
      s('P und 3B stürmen vor, 1B kommt von rechts.', {
        d: {
          P: toward(MOUND, HOME, 26),
          '3B': toward(DEFAULT_DEFENSE['3B'], HOME, 30),
          '1B': toward(DEFAULT_DEFENSE['1B'], HOME, 30),
          '2B': B1,
          SS: B2,
        },
        ball: { loose: { x: HOME.x - 8, y: HOME.y - 14 } },
        r: { r1: between(B1, B2, 0.3) },
      }),
      s('P nimmt den Ball auf — er ist am nächsten dran.', {
        d: { P: { x: HOME.x - 8, y: HOME.y - 14 } },
        ball: { hold: 'P' },
        r: { r1: between(B1, B2, 0.6) },
      }),
      s('Sicherer Wurf auf die 1 — der 2B deckt dort ab, weil der 1B vorne ist.', {
        ball: { hold: '2B' },
        r: { r1: B2, rb: { p: B1, status: 'OUT' } },
        outs: 1,
      }),
    ],
  }),

  play('Sac-Bunt, Runner auf 1 — Wurf auf die 2', 'Bunt-Defense', {
    outs: 0,
    startRunners: { r1: B1 },
    gameState: 'CLOSE_LATE',
    gameStateNote: 'Den Führungs-Runner nehmen, wenn der Bunt hart genug ist.',
    steps: [
      s('Derselbe Bunt, andere Entscheidung: wir wollen den vorderen Runner.'),
      s('Bunt rollt hart genug zum 3B.', {
        d: {
          '3B': toward(DEFAULT_DEFENSE['3B'], HOME, 34),
          P: toward(MOUND, HOME, 20),
          SS: B2,
          '1B': toward(DEFAULT_DEFENSE['1B'], HOME, 28),
          '2B': B1,
        },
        ball: { loose: { x: HOME.x - 16, y: HOME.y - 18 } },
        r: { r1: between(B1, B2, 0.3) },
      }),
      s('3B nimmt auf und schaut sofort zur 2.', {
        d: { '3B': { x: HOME.x - 16, y: HOME.y - 18 } },
        ball: { hold: '3B' },
        r: { r1: between(B1, B2, 0.6) },
      }),
      s('Wurf auf die 2 — SS deckt ab. Nur machen, wenn der Ball schnell in der Hand ist.', {
        ball: { hold: 'SS' },
        r: { r1: 'OUT' },
        outs: 1,
      }),
    ],
  }),

  play('Bunt Richtung 3B, Runner auf 2 — SS deckt die 3', 'Bunt-Defense', {
    outs: 0,
    startRunners: { r2: B2 },
    steps: [
      s('Runner auf 2. Der Bunt soll ihn auf die 3 bringen.'),
      s('3B muss vor — damit ist die 3 offen.', {
        d: {
          '3B': toward(DEFAULT_DEFENSE['3B'], HOME, 36),
          SS: B3,
          P: toward(MOUND, HOME, 18),
          '1B': toward(DEFAULT_DEFENSE['1B'], HOME, 28),
        },
        ball: { loose: { x: HOME.x - 18, y: HOME.y - 16 } },
        r: { r2: between(B2, B3, 0.35) },
      }),
      s('SS füllt die Lücke an der 3. Ohne ihn läuft der Runner einfach durch.', {
        d: { '3B': { x: HOME.x - 18, y: HOME.y - 16 } },
        ball: { hold: '3B' },
        r: { r2: between(B2, B3, 0.7) },
      }),
      s('Wurf auf die 1 — der 2B deckt, weil der 1B vorne ist. Der Runner bekommt die 3.', {
        d: { '2B': B1 },
        ball: { hold: '2B' },
        r: { r2: B3, rb: { p: B1, status: 'OUT' } },
        outs: 1,
      }),
    ],
  }),

  play('Runner auf 1 und 2 — Wheel Play', 'Bunt-Defense', {
    outs: 0,
    startRunners: { r1: B1, r2: B2 },
    steps: [
      s('Runner auf 1 und 2. Beim Wheel dreht sich das ganze Infield.'),
      s('3B stürmt, SS rotiert zur 3, 2B zur 1.', {
        d: {
          '3B': toward(DEFAULT_DEFENSE['3B'], HOME, 38),
          SS: B3,
          '2B': B1,
          '1B': toward(DEFAULT_DEFENSE['1B'], HOME, 30),
          P: toward(MOUND, HOME, 20),
        },
        ball: { loose: { x: HOME.x - 20, y: HOME.y - 18 } },
        r: { r1: between(B1, B2, 0.3), r2: between(B2, B3, 0.3) },
      }),
      s('3B nimmt auf und wirft zur 3 — der Führungs-Runner ist das Ziel.', {
        d: { '3B': { x: HOME.x - 20, y: HOME.y - 18 } },
        ball: { hold: 'SS' },
        r: { r2: { p: B3, status: 'OUT' }, r1: between(B1, B2, 0.7) },
        outs: 1,
      }),
      // Eine Alternative zum Stand davor, keine Fortsetzung: derselbe eine Out, nur an
      // einer anderen Base. Deshalb bleibt die Zaehlung bei 1.
      s('Alternative zum Stand davor: Ist der Führungs-Runner zu schnell, geht der Wurf an die 1 — ein sicherer Out statt gar keiner.', {
        ball: { hold: '2B' },
        r: { r1: B2, rb: { p: B1, status: 'OUT' } },
        outs: 1,
        ms: 2000,
      }),
    ],
  }),

  play('Squeeze, Runner auf 3', 'Bunt-Defense', {
    outs: 1,
    startRunners: { r3: B3 },
    steps: [
      s('Runner auf 3. Der Squeeze startet mit dem Wurf — es bleibt keine Zeit zum Überlegen.'),
      s('Runner läuft los, der Bunt geht vor Home.', {
        d: { P: toward(MOUND, HOME, 24), C: HOME },
        ball: { loose: { x: HOME.x + 6, y: HOME.y - 10 } },
        r: { r3: between(B3, HOME, 0.5) },
      }),
      s('Der P nimmt den Ball — der C bleibt an der Platte, sonst deckt sie niemand.', {
        d: { P: { x: HOME.x + 6, y: HOME.y - 10 } },
        ball: { hold: 'P' },
        r: { r3: between(B3, HOME, 0.8) },
      }),
      s('Kurzer Wurf zum Catcher, Tag — nur wenn der Ball früh genug da ist.', {
        ball: { hold: 'C' },
        r: { r3: 'OUT' },
        outs: 2,
        ms: 600,
      }),
    ],
  }),

  play('Bunt direkt vor Home — Catcher übernimmt', 'Bunt-Defense', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Der Bunt bleibt direkt vor der Platte liegen.'),
      s('P stürmt, bleibt aber stehen: der Ball gehört dem Catcher.', {
        d: {
          P: { x: HOME.x - 14, y: HOME.y - 20 },
          C: { x: HOME.x, y: HOME.y - 6 },
          '1B': toward(DEFAULT_DEFENSE['1B'], HOME, 28),
          '2B': B1,
        },
        ball: { loose: { x: HOME.x, y: HOME.y - 8 } },
      }),
      s('C hat freie Sicht auf die 1 — der P ist aus der Wurflinie gegangen.', {
        ball: { hold: 'C' },
      }),
      s('Wurf auf die 1.', {
        ball: { hold: '2B' },
        r: { rb: { p: B1, status: 'OUT' } },
        outs: 2,
      }),
    ],
  }),

  // ============================================================ First-and-Third
  play('Wurf auf die 2, Runner auf 3 startet', 'First-and-Third', {
    outs: 1,
    startRunners: { r1: B1, r3: B3 },
    keinSchlag: true,
    steps: [
      s('Runner auf 1 und 3. Der auf 1 läuft — und will genau das.', {
        d: { C: HOME },
        ball: { hold: 'C' },
      }),
      s('C wirft auf die 2, der Runner von der 3 startet sofort.', {
        d: { SS: B2 },
        ball: { at: between(HOME, B2, 0.6) },
        r: { r1: between(B1, B2, 0.6), r3: between(B3, HOME, 0.35) },
      }),
      s('SS fängt und wirft sofort zurück nach Home.', {
        ball: { hold: 'SS' },
        r: { r3: between(B3, HOME, 0.6), r1: between(B1, B2, 0.85) },
      }),
      s('Zurück zur Platte — der Run ist wichtiger als der Out an der 2.', {
        ball: { hold: 'C' },
        r: { r3: 'OUT', r1: B2 },
        outs: 2,
      }),
    ],
  }),

  play('Catcher wirft an den Pitcher — Abfangen in der Mitte', 'First-and-Third', {
    outs: 1,
    startRunners: { r1: B1, r3: B3 },
    gameState: 'CLOSE_LATE',
    gameStateNote: 'Wenn der Run zählt: gar nicht erst zur 2 werfen.',
    keinSchlag: true,
    steps: [
      s('Dieselbe Lage, knapper Spielstand. Der Ball ist beim Catcher.', {
        d: { C: HOME },
        ball: { hold: 'C' },
      }),
      s('C wirft scheinbar zur 2 — der P fängt den Ball ab.', {
        d: { P: { x: MOUND.x, y: MOUND.y - 6 } },
        ball: { hold: 'P' },
        r: { r1: between(B1, B2, 0.5), r3: between(B3, HOME, 0.3) },
      }),
      s('P dreht sich zum Runner auf 3. Der muss zurück.', {
        r: { r3: between(B3, HOME, 0.15), r1: between(B1, B2, 0.8) },
      }),
      s('Der Runner auf 1 bekommt die 2 geschenkt — der Run zählt mehr.', {
        d: { SS: B2 },
        r: { r3: B3, r1: B2 },
        ms: 2000,
      }),
    ],
  }),

  play('Angetäuschter Wurf auf die 2', 'First-and-Third', {
    outs: 0,
    startRunners: { r1: B1, r3: B3 },
    keinSchlag: true,
    steps: [
      s('Der Catcher täuscht den Wurf nur an.'),
      s('Arm hoch, Ball bleibt in der Hand.', {
        d: { C: HOME },
        ball: { hold: 'C' },
        r: { r1: between(B1, B2, 0.45), r3: between(B3, HOME, 0.3) },
      }),
      s('Der Runner auf 3 ist zu weit raus.', {
        d: { '3B': B3 },
        r: { r3: between(B3, HOME, 0.35) },
        ms: 600,
      }),
      s('Wurf auf die 3 — Tag-Out, wenn er nicht zurückkommt.', {
        ball: { hold: '3B' },
        r: { r3: 'OUT' },
        outs: 1,
      }),
    ],
  }),

  play('Direkter Wurf auf die 3', 'First-and-Third', {
    outs: 2,
    startRunners: { r1: B1, r3: B3 },
    keinSchlag: true,
    steps: [
      s('Zwei Outs. Jetzt zählt nur noch der dritte, egal wo.'),
      s('Der C hat den Ball, der Runner auf 3 nimmt zu viel Abstand.', {
        d: { C: HOME, '3B': B3 },
        ball: { hold: 'C' },
        r: { r3: between(B3, HOME, 0.25) },
      }),
      s('Schneller Wurf auf die 3 — vom Catcher, nicht vom Pitcher.', {
        ball: { hold: '3B' },
        r: { r3: between(B3, HOME, 0.15) },
        ms: 600,
      }),
      s('Tag — Inning vorbei.', { r: { r3: 'OUT' }, outs: 3 }),
    ],
  }),

  // ============================================================ Rundown
  play('Rundown zwischen Home und 1', 'Rundown', {
    outs: 1,
    startRunners: { rb: between(HOME, B1, 0.5) },
    keinSchlag: true,
    steps: [
      s('Der Batter hängt zwischen Home und der 1.'),
      s('1B hat den Ball und läuft ihn an — nicht werfen, laufen.', {
        d: { '1B': between(HOME, B1, 0.75), C: HOME },
        ball: { hold: '1B' },
        r: { rb: between(HOME, B1, 0.35) },
      }),
      s('Erst wenn der Runner festgelegt ist: ein Wurf zum Catcher.', {
        ball: { hold: 'C' },
        r: { rb: between(HOME, B1, 0.2) },
        ms: 600,
      }),
      s('Tag. Ein Wurf reicht, wenn man ihn richtig anläuft.', { r: { rb: 'OUT' }, outs: 2, ms: 600 }),
    ],
  }),

  play('Rundown zwischen 1 und 2', 'Rundown', {
    outs: 0,
    startRunners: { r1: between(B1, B2, 0.5) },
    keinSchlag: true,
    steps: [
      s('Runner steckt zwischen 1 und 2.'),
      s('2B läuft ihn Richtung 1 zurück.', {
        d: { '2B': between(B1, B2, 0.7), '1B': B1, SS: B2 },
        ball: { hold: '2B' },
        r: { r1: between(B1, B2, 0.35) },
      }),
      s('Wurf zum 1B, sobald der Runner festgelegt ist.', {
        ball: { hold: '1B' },
        r: { r1: between(B1, B2, 0.15) },
        ms: 600,
      }),
      s('Tag an der 1.', { r: { r1: 'OUT' }, outs: 1, ms: 600 }),
    ],
  }),

  play('Rundown zwischen 2 und 3', 'Rundown', {
    outs: 1,
    startRunners: { r2: between(B2, B3, 0.5) },
    keinSchlag: true,
    steps: [
      s('Zwischen 2 und 3 — hier sind SS und 3B zuständig.'),
      s('SS treibt ihn zurück zur 2.', {
        d: { SS: between(B2, B3, 0.7), '3B': B3, '2B': B2 },
        ball: { hold: 'SS' },
        r: { r2: between(B2, B3, 0.3) },
      }),
      s('Wurf zum 2B an der Base.', { ball: { hold: '2B' }, r: { r2: between(B2, B3, 0.12) }, ms: 600 }),
      s('Tag.', { r: { r2: 'OUT' }, outs: 2, ms: 600 }),
    ],
  }),

  play('Rundown zwischen 3 und Home', 'Rundown', {
    outs: 1,
    startRunners: { r3: between(B3, HOME, 0.5) },
    keinSchlag: true,
    steps: [
      s('Der teuerste Rundown: hier geht es um einen Run.'),
      s('C läuft ihn zur 3 zurück. Der Runner darf nicht nach Home.', {
        d: { C: between(B3, HOME, 0.7), '3B': B3, P: between(B3, HOME, 0.98) },
        ball: { hold: 'C' },
        r: { r3: between(B3, HOME, 0.3) },
      }),
      s('Wurf zum 3B.', { ball: { hold: '3B' }, r: { r3: between(B3, HOME, 0.12) }, ms: 600 }),
      s('Tag an der 3. P ist nachgerückt, falls der Wurf danebengeht.', {
        r: { r3: 'OUT' },
        outs: 2,
        ms: 600,
      }),
    ],
  }),

  // ============================================================ Pop-up-Priorities
  play('Pop-up hinter der 1 — wer ruft', 'Pop-up-Priorities', {
    outs: 0,
    startRunners: {},
    steps: [
      s('Hoher Ball hinter die erste Base. Drei könnten ihn fangen.'),
      s('1B, 2B und RF laufen alle an.', {
        d: {
          '1B': { x: B1.x + 14, y: B1.y - 20 },
          '2B': { x: B1.x + 4, y: B1.y - 30 },
          RF: { x: B1.x + 24, y: B1.y - 40 },
        },
        ball: { at: { x: B1.x + 10, y: B1.y - 28 } },
        r: { rb: between(HOME, B1, 0.4) },
      }),
      s('Der Outfielder hat Vorfahrt — er läuft nach vorne, die anderen rückwärts.', {
        d: { '1B': { x: B1.x + 6, y: B1.y - 10 }, '2B': { x: B1.x - 6, y: B1.y - 18 } },
        ball: { hold: 'RF' },
        r: { rb: between(HOME, B1, 0.7) },
      }),
      s('RF ruft, die anderen weichen. Out.', { outs: 1, ms: 600, r: { rb: 'OUT' } }),
    ],
  }),

  play('Pop-up hinter der 3 — wer ruft', 'Pop-up-Priorities', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Spiegelbildlich an der dritten Base.'),
      s('3B, SS und LF kommen zusammen.', {
        d: {
          '3B': { x: B3.x - 12, y: B3.y - 18 },
          SS: { x: B3.x - 2, y: B3.y - 28 },
          LF: { x: B3.x - 22, y: B3.y - 38 },
        },
        ball: { at: { x: B3.x - 10, y: B3.y - 26 } },
      }),
      s('LF ruft — Outfielder vor Infielder, immer.', { ball: { hold: 'LF' } }),
      s('Out.', { outs: 2, ms: 600, r: { rb: 'OUT' } }),
    ],
  }),

  play('Pop-up hinterm Infield, Mitte', 'Pop-up-Priorities', {
    outs: 0,
    startRunners: {},
    steps: [
      s('Der unangenehmste Ball: hinter 2 und vor dem CF.'),
      s('SS, 2B und CF laufen an.', {
        d: {
          SS: { x: B2.x - 10, y: B2.y - 22 },
          '2B': { x: B2.x + 10, y: B2.y - 22 },
          CF: { x: B2.x, y: B2.y - 42 },
        },
        ball: { at: { x: B2.x, y: B2.y - 28 } },
      }),
      s('CF kommt von hinten und ruft ab — er sieht den Ball im Laufen besser.', {
        d: { CF: { x: B2.x, y: B2.y - 28 } },
        ball: { hold: 'CF' },
      }),
      s('SS und 2B drehen weg. Out.', {
        d: { SS: { x: B2.x - 20, y: B2.y - 12 }, '2B': { x: B2.x + 20, y: B2.y - 12 } },
        r: { rb: 'OUT' },
        outs: 1,
        ms: 600,
      }),
    ],
  }),

  play('Foul-Pop hinter Home', 'Pop-up-Priorities', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Foul-Pop hinter der Platte. Der Catcher dreht sich — mit dem Rücken zum Feld.'),
      s('C sucht den Ball, 1B und 3B kommen zur Hilfe.', {
        d: {
          C: { x: HOME.x + 6, y: HOME.y + 16 },
          '1B': { x: HOME.x + 26, y: HOME.y + 6 },
          '3B': { x: HOME.x - 26, y: HOME.y + 6 },
        },
        ball: { at: { x: HOME.x + 10, y: HOME.y + 20 } },
      }),
      s('C hat ihn. Der Ball dreht zurück Richtung Feld — deshalb mit dem Rücken dorthin stehen.', {
        ball: { hold: 'C' },
      }),
      s('Out.', { outs: 2, ms: 600, r: { rb: 'OUT' } }),
    ],
  }),

  play('Infield Fly — Lage und Verhalten', 'Pop-up-Priorities', {
    outs: 1,
    startRunners: { r1: B1, r2: B2 },
    steps: [
      s('Runner auf 1 und 2, weniger als zwei Outs: Infield Fly ist möglich.'),
      s('Hoher Ball über dem Infield — der Umpire ruft.', {
        d: { SS: { x: B2.x - 6, y: B2.y + 10 } },
        ball: { at: { x: B2.x - 6, y: B2.y + 2 } },
      }),
      s('Der Batter ist raus, egal ob gefangen wird. Die Runner bleiben stehen.', {
        ball: { hold: 'SS' },
        r: { rb: 'OUT' },
        outs: 2,
      }),
      s('Alternative: Fällt der Ball — trotzdem Out, und die Runner müssen nicht laufen.', { ms: 2000 }),
    ],
  }),

  // ============================================================ Steal-Defense & Pickoff
  play('Steal auf die 2 — Wurf und Abdeckung', 'Steal-Defense & Pickoff', {
    outs: 0,
    startRunners: { r1: B1 },
    keinSchlag: true,
    steps: [
      s('Runner auf 1 startet mit dem Wurf.'),
      s('C steht auf, SS geht zur Base. Wer deckt, ist vorher abgesprochen.', {
        d: { C: HOME, SS: B2 },
        ball: { hold: 'C' },
        r: { r1: between(B1, B2, 0.4) },
      }),
      s('Wurf auf die 2.', { ball: { at: between(HOME, B2, 0.7) }, r: { r1: between(B1, B2, 0.75) } }),
      s('SS fängt und tagt.', { ball: { hold: 'SS' }, r: { r1: 'OUT' }, outs: 1, ms: 600 }),
    ],
  }),

  play('Steal auf die 3 — Wurf und Abdeckung', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r2: B2 },
    keinSchlag: true,
    steps: [
      s('Steal auf die 3 kommt seltener — und überrascht deshalb öfter.'),
      s('3B zur Base, SS und LF sichern hinter der 3 ab.', {
        d: {
          C: HOME,
          '3B': B3,
          SS: { x: B3.x - 16, y: B3.y - 12 },
          LF: { x: B3.x - 34, y: B3.y - 30 },
        },
        ball: { hold: 'C' },
        r: { r2: between(B2, B3, 0.4) },
      }),
      s('Wurf die Linie entlang — am Runner vorbei.', {
        ball: { at: between(HOME, B3, 0.7) },
        r: { r2: between(B2, B3, 0.8) },
      }),
      s('3B tagt.', { ball: { hold: '3B' }, r: { r2: 'OUT' }, outs: 2, ms: 600 }),
    ],
  }),

  play('Doppel-Steal, Runner auf 1 und 2', 'Steal-Defense & Pickoff', {
    outs: 0,
    startRunners: { r1: B1, r2: B2 },
    keinSchlag: true,
    steps: [
      s('Beide laufen. Man kann nur einen bekommen.'),
      s('Der Führungs-Runner geht auf die 3.', {
        d: { C: HOME, '3B': B3, SS: B2 },
        ball: { hold: 'C' },
        r: { r1: between(B1, B2, 0.4), r2: between(B2, B3, 0.4) },
      }),
      s('Wurf auf die 3 — der vordere Runner zählt mehr.', {
        ball: { at: between(HOME, B3, 0.7) },
        r: { r2: between(B2, B3, 0.8), r1: between(B1, B2, 0.8) },
      }),
      s('Out an der 3, die 2 schenken wir her.', {
        ball: { hold: '3B' },
        r: { r2: 'OUT', r1: B2 },
        outs: 1,
      }),
    ],
  }),

  play('Pickoff an der 1', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r1: toward(B1, B2, 11) },
    keinSchlag: true,
    steps: [
      s('Der Runner nimmt zu viel Abstand.'),
      s('C hat den Ball und wirft sofort zur 1.', {
        d: { C: HOME, '1B': B1 },
        ball: { hold: 'C' },
      }),
      s('1B fängt an der Base.', { ball: { hold: '1B' }, ms: 600 }),
      s('Tag, bevor der Runner zurück ist.', { r: { r1: 'OUT' }, outs: 2, ms: 600 }),
    ],
  }),

  play('Pickoff an der 2', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r2: toward(B2, B3, 11) },
    keinSchlag: true,
    steps: [
      s('An der 2 braucht es ein Zeichen — der Runner sieht den Deckenden nicht.'),
      s('SS schleicht hinter dem Runner zur Base.', {
        d: { C: HOME, SS: { x: B2.x - 10, y: B2.y - 4 } },
        ball: { hold: 'C' },
      }),
      s('Wurf, SS ist genau rechtzeitig da.', {
        d: { SS: B2 },
        ball: { hold: 'SS' },
        ms: 600,
      }),
      s('Tag. Timing ist alles — zu früh und der Runner sieht ihn kommen.', {
        r: { r2: 'OUT' },
        outs: 2,
        ms: 600,
      }),
    ],
  }),

  play('Pickoff an der 3', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r3: toward(B3, HOME, 11) },
    keinSchlag: true,
    steps: [
      s('Der riskanteste Pickoff: hinter der 3 steht niemand, der absichert.'),
      s('3B geht zurück zur Base, sobald der Wurf durch ist.', {
        d: { C: HOME, '3B': B3 },
        ball: { hold: 'C' },
      }),
      s('Schneller Wurf.', { ball: { hold: '3B' }, ms: 600 }),
      s('Tag. Geht der Wurf daneben, fällt der Run — nur bei sicherem Vorsprung.', {
        r: { r3: 'OUT' },
        outs: 2,
        ms: 600,
      }),
    ],
  }),

  play('Delayed Steal', 'Steal-Defense & Pickoff', {
    outs: 0,
    startRunners: { r1: B1 },
    keinSchlag: true,
    steps: [
      s('Der Runner läuft nicht mit dem Wurf, sondern erst, wenn der C zurückwirft.', {
        d: { C: HOME },
        ball: { hold: 'C' },
      }),
      s('C wirft lässig zum Pitcher zurück — genau da startet der Runner.', {
        ball: { hold: 'P' },
        r: { r1: between(B1, B2, 0.3) },
      }),
      s('P sieht es und wirft zur 2, der 2B deckt.', {
        d: { '2B': B2 },
        ball: { hold: '2B' },
        r: { r1: between(B1, B2, 0.8) },
      }),
      s('Knapp. Dagegen hilft nur: nach jedem Wurf hinschauen.', { r: { r1: B2 }, ms: 2000 }),
    ],
  }),

  // ============================================================ Spielsituationen
  play('Standard-Aufstellung', 'Spielsituationen', {
    outs: 0,
    startRunners: {},
    steps: [
      s('So steht das Team, wenn nichts dagegen spricht. Ausgangspunkt für jedes neue Play.', {
        ms: 2000,
      }),
    ],
  }),

  play('Infield In, Runner auf 3', 'Spielsituationen', {
    outs: 1,
    startRunners: { r3: B3 },
    gameState: 'CLOSE_LATE',
    gameStateNote: 'Der Run entscheidet das Spiel — wir geben Hits auf, um ihn zu halten.',
    steps: [
      s('Runner auf 3, knapp am Ende. Der Run darf nicht fallen.'),
      s('Das ganze Infield rückt auf Base-Höhe vor.', {
        d: {
          '1B': { x: B1.x - 6, y: B1.y + 10 },
          '2B': { x: HOME.x + 20, y: HOME.y - 60 },
          SS: { x: HOME.x - 20, y: HOME.y - 60 },
          '3B': { x: B3.x + 6, y: B3.y + 10 },
        },
        ms: 2000,
      }),
      s('Jeder Grounder geht jetzt nach Home statt auf die 1.', {
        ball: { loose: { x: HOME.x - 14, y: HOME.y - 40 } },
        r: { r3: between(B3, HOME, 0.4) },
      }),
      s('SS nimmt auf und wirft zum Catcher.', {
        d: { SS: { x: HOME.x - 14, y: HOME.y - 40 }, C: HOME },
        ball: { hold: 'C' },
        r: { r3: 'OUT' },
        outs: 2,
      }),
    ],
  }),

  play('Outfield tief, Vorsprung halten', 'Spielsituationen', {
    outs: 2,
    startRunners: {},
    gameState: 'AHEAD',
    gameStateNote: 'Mit Vorsprung: kein Ball darf über die Köpfe gehen, Singles sind egal.',
    steps: [
      s('Wir führen. Jetzt zählt nur, dass nichts über die Köpfe geht.'),
      s('Das Outfield geht zwanzig Fuß tiefer als sonst.', {
        d: {
          LF: fromHome(-30, 202),
          CF: fromHome(0, 205),
          RF: fromHome(30, 202),
        },
        ms: 2000,
      }),
      s('Der Ball fällt davor — ein Single, aber kein Extra-Base-Hit.', {
        ball: { at: fromHome(10, 150), ground: true },
        d: { CF: fromHome(10, 150) },
        r: { rb: between(HOME, B1, 0.6) },
      }),
      s('Aufnehmen, kurz halten, fertig.', { ball: { hold: 'CF' }, r: { rb: B1 } }),
    ],
  }),

  play('Ball am Zaun — Relay-Kette', 'Cut-off & Relay', {
    outs: 1,
    startRunners: { r1: B1 },
    steps: [
      s('Der Ball springt an den Zaun. Jetzt zählt die Kette.'),
      s('CF jagt ihm nach, SS geht als Relay raus.', {
        d: { CF: fromHome(8, 212), SS: between(fromHome(8, 212), B2, 0.5) },
        ball: { at: fromHome(8, 212), ground: true },
        r: { r1: between(B1, B2, 0.9), rb: between(HOME, B1, 0.8) },
      }),
      /*
       * Der 2B deckt die 2 und stellt sich NICHT als zweiter Relay hinter den SS.
       *
       * Das ist die Teamkonvention, die auch sonst gilt: der Cut-Mann ist der eine
       * Mittelinfielder, der andere deckt die Base. Hinter dem SS stand er hier als
       * Baseball-Doppelrelay — dann lag die 2 frei, und der Batter haette sie geschenkt
       * bekommen. Abgesichert wird der Wurf stattdessen vom Pitcher.
       */
      s('2B deckt die 2 — dorthin geht der Wurf, und der P sichert ab.', {
        d: { '2B': B2 },
        ball: { hold: 'SS' },
        r: { r1: between(B2, B3, 0.6), rb: B1 },
      }),
      s('SS wirft zum 2B, nicht quer übers halbe Feld — und der P geht hinter die Platte.', {
        d: { P: { x: HOME.x + 6, y: HOME.y + 26 }, C: HOME },
        ball: { hold: '2B' },
        r: { r1: between(B3, HOME, 0.5), rb: B2 },
      }),
      s('Von dort nach Home. Der Run fällt — wichtig ist, dass der Batter auf der 2 bleibt.', {
        ball: { hold: 'C' },
        r: { r1: 'SCORED' },
      }),
    ],
  }),

  play('Runner auf 2 und 3 — anschauen, dann werfen', 'Spielsituationen', {
    outs: 1,
    startRunners: { r2: B2, r3: B3 },
    gameState: 'CLOSE_LATE',
    gameStateNote: 'Knapp: der sichere Out ist mehr wert als der Versuch am Runner.',
    steps: [
      s('Runner auf 2 und 3, ein Out. Kein Force — die beiden MÜSSEN nicht laufen.'),
      s('Grounder zum SS. Der Runner auf 3 testet ihn.', {
        d: { SS: { x: HOME.x - 26, y: HOME.y - 72 } },
        ball: { at: { x: HOME.x - 26, y: HOME.y - 72 }, ground: true },
        r: { r3: toward(B3, HOME, 12), r2: toward(B2, B3, 10) },
      }),
      s('Anschauen. Erst wenn er steht, geht der Wurf — sonst läuft er los.', {
        d: { '1B': B1 },
        r: { r3: toward(B3, HOME, 6) },
      }),
      s('Out an der 1, der Run fällt nicht. Dafür bleiben beide, wo sie sind.', {
        ball: { hold: '1B' },
        r: { rb: { p: B1, status: 'OUT' }, r3: B3, r2: B2 },
        outs: 2,
      }),
    ],
  }),

  play('Passed Ball, Runner auf 3', 'Spielsituationen', {
    outs: 1,
    startRunners: { r3: B3 },
    keinSchlag: true,
    steps: [
      s('Der Ball geht am Catcher vorbei. Der Runner auf 3 startet.'),
      s('C dreht sich um und sucht, P startet Richtung Home.', {
        d: { C: { x: HOME.x - 10, y: HOME.y + 22 }, P: toward(MOUND, HOME, 30) },
        ball: { loose: { x: HOME.x - 14, y: HOME.y + 26 } },
        r: { r3: between(B3, HOME, 0.45) },
      }),
      s('P deckt die Platte ab — das ist seine Aufgabe, nicht die des 1B.', {
        d: { P: HOME },
        ball: { hold: 'C' },
        r: { r3: between(B3, HOME, 0.75) },
      }),
      s('Wurf zum Pitcher an der Platte, Tag.', {
        ball: { hold: 'P' },
        r: { r3: 'OUT' },
        outs: 2,
        ms: 600,
      }),
    ],
  }),
];

// ---------------------------------------------------------------- SQL

const esc = (text) => text.replace(/'/g, "''");

const zeilen = [
  '-- Start-Plays fuer den Playmaker. Erzeugt von scripts/build-seed-plays.mjs.',
  '--',
  '-- Einmalig: wer ein Start-Play aendert, aendert seine eigene Zeile; wer es loescht, ist es',
  '-- los. Diese Migration fuegt nur ein und aktualisiert nie.',
  '',
];

let n = 0;
for (const eintrag of KATALOG) {
  n += 1;
  const steps = buildSteps(eintrag, eintrag.startRunners ?? {});
  const lage = eintrag.gameState ?? 'ANY';
  const notiz = eintrag.gameStateNote ? `'${esc(eintrag.gameStateNote)}'` : 'NULL';

  zeilen.push(`-- ${n}. ${eintrag.title}`);
  zeilen.push(
    `INSERT INTO play (title, category_id, game_state, game_state_note)\n` +
      `SELECT '${esc(eintrag.title)}', id, '${lage}', ${notiz}\n` +
      `FROM play_category WHERE name = '${esc(eintrag.category)}';`,
  );
  for (const step of steps) {
    const markers = esc(JSON.stringify(step.markers));
    const note = step.note ? `'${esc(step.note)}'` : 'NULL';
    zeilen.push(
      `INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)\n` +
        `SELECT id, ${step.ordinal}, ${step.durationMs}, ${note}, ${step.outs}, '${markers}'::jsonb\n` +
        `FROM play WHERE title = '${esc(eintrag.title)}';`,
    );
  }
  zeilen.push('');
}

zeilen.push(`-- ${n} Plays.`);
const ausgabe = zeilen.join('\n');

/**
 * Liest eine Seed-Migration als (Titel, Stand) -> Inhalt.
 *
 * Verglichen wird der ganze Stand, nicht einzelne Felder: eine verschobene Scheibe steckt
 * im markers-JSON, und Dauer oder Notiz koennen gleichzeitig wandern.
 */
function staende(text) {
  const muster =
    /SELECT id, (\d+), (\d+), (NULL|'(?:[^']|'')*'), (\d+), '(\{[\s\S]*?\})'::jsonb\s*\nFROM play WHERE title = '((?:[^']|'')+)';/g;
  const raus = new Map();
  for (const m of text.matchAll(muster)) {
    const [, ordinal, dauer, note, outs, markers, titel] = m;
    raus.set(`${titel}\u0000${ordinal}`, { ordinal, dauer, note, outs, markers, titel });
  }
  return raus;
}

const seit = process.argv.indexOf('--seit');
if (seit > 0 && process.argv[seit + 1]) {
  const { readFileSync } = await import('node:fs');
  const alt = staende(readFileSync(process.argv[seit + 1], 'utf8'));
  const neu = staende(ausgabe);

  const stuecke = [];
  for (const [schluessel, n] of neu) {
    const a = alt.get(schluessel);
    if (!a) continue;
    if (a.dauer === n.dauer && a.note === n.note && a.outs === n.outs && a.markers === n.markers) continue;
    stuecke.push(
      `-- ${n.titel} – Stand ${n.ordinal}`,
      'UPDATE play_step SET',
      `    duration_ms = ${n.dauer},`,
      `    note = ${n.note},`,
      `    outs = ${n.outs},`,
      `    markers = '${n.markers}'::jsonb`,
      `WHERE ordinal = ${n.ordinal} AND play_id = (SELECT id FROM play WHERE title = '${n.titel}');`,
      '',
    );
  }
  if (stuecke.length === 0) {
    process.stderr.write('Keine Unterschiede — es gibt nichts zu korrigieren.\n');
    process.exit(1);
  }
  process.stdout.write(
    [
      '-- Korrektur der Start-Plays. Erzeugt von scripts/build-seed-plays.mjs --seit <migration>.',
      '--',
      '-- Eine schon angewandte Migration wird NICHT geaendert: das waere eine Pruefsummen-',
      '-- Kollision, Flyway braeche ab und das Backend startete nicht mehr.',
      '',
      ...stuecke,
    ].join('\n'),
  );
} else {
  process.stdout.write(ausgabe);
}
