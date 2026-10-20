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

function buildSteps(spec, startRunners) {
  const defense = { ...DEFAULT_DEFENSE };
  const runners = { ...startRunners };
  let ball = { state: 'AT_BAT', holder: 'P', x: DEFAULT_DEFENSE.P.x, y: DEFAULT_DEFENSE.P.y, trajectory: 'AIR' };
  let outs = spec.outs ?? 0;

  return spec.steps.map((step, index) => {
    if (step.d) for (const [pos, punkt] of Object.entries(step.d)) defense[pos] = punkt;
    if (step.r) {
      for (const [id, punkt] of Object.entries(step.r)) {
        if (punkt === null) delete runners[id];
        else runners[id] = punkt;
      }
    }
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
    if (step.outs !== undefined) outs = step.outs;

    return {
      ordinal: index + 1,
      durationMs: step.ms ?? 1200,
      note: step.note,
      outs,
      markers: {
        defenders: Object.entries(defense).map(([position, p]) => ({ position, x: r2(p.x), y: r2(p.y) })),
        runners: Object.entries(runners).map(([id, p]) => ({ id, x: r2(p.x), y: r2(p.y), status: 'ACTIVE' })),
        ball,
      },
    };
  });
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
        r: { r1: null },
        outs: 1,
        ms: 600,
      }),
      s('2B dreht und wirft weiter auf die 1 — Doppelspiel, wenn der Batter langsam ist.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
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
      s('Kurzer Wurf auf die 2.', { ball: { hold: 'SS' }, r: { r1: null }, outs: 1, ms: 600 }),
      s('Weiter auf die 1.', { d: { '1B': B1 }, ball: { hold: '1B' }, outs: 2 }),
    ],
  }),

  play('Grounder zum 3B — Wurf auf die 1', 'Base-Coverage', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Harter Grounder die Linie entlang.'),
      s('3B fängt im Rückwärtsgehen.', {
        d: { '3B': { x: HOME.x - 44, y: HOME.y - 46 } },
        ball: { at: { x: HOME.x - 44, y: HOME.y - 46 }, ground: true },
        r: { rb: between(HOME, B1, 0.35) },
      }),
      s('Langer Wurf quer rüber, 1B steht an der Base.', {
        d: { '1B': B1 },
        ball: { hold: '1B' },
        r: { rb: between(HOME, B1, 0.8) },
      }),
      s('Out an der 1.', { r: { rb: null }, outs: 2, ms: 600 }),
    ],
  }),

  play('Grounder zum 1B — wer deckt die 1', 'Base-Coverage', {
    outs: 0,
    startRunners: {},
    steps: [
      s('Grounder zum ersten Baseman. Er verlässt die Base — also muss jemand hin.'),
      s('1B fängt, P läuft zur Base. Das ist seine Aufgabe, nicht die des 2B.', {
        d: { '1B': { x: HOME.x + 44, y: HOME.y - 46 }, P: toward(MOUND, B1, 30) },
        ball: { at: { x: HOME.x + 44, y: HOME.y - 46 }, ground: true },
        r: { rb: between(HOME, B1, 0.4) },
      }),
      s('Wurf zum laufenden Pitcher, er trifft die Base mit dem Fuß.', {
        d: { P: B1 },
        ball: { hold: 'P' },
        r: { rb: between(HOME, B1, 0.85) },
      }),
      s('Out.', { r: { rb: null }, outs: 1, ms: 600 }),
    ],
  }),

  play('Comebacker zum Pitcher', 'Base-Coverage', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Der Ball kommt zurück zum Pitcher.'),
      s('P fängt und dreht sich sofort zur 2.', {
        ball: { hold: 'P' },
        d: { '2B': B2 },
        r: { r1: between(B1, B2, 0.45) },
      }),
      s('Wurf auf die 2.', { ball: { hold: '2B' }, r: { r1: null }, outs: 1, ms: 600 }),
      s('Und weiter auf die 1.', { d: { '1B': B1 }, ball: { hold: '1B' }, outs: 2 }),
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
        r: { r1: null },
        outs: 1,
        ms: 600,
      }),
      s('Abdrehen vom Runner weg, dann auf die 1.', { d: { '1B': B1 }, ball: { hold: '1B' }, outs: 2 }),
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
      s('Wurf auf die 2, SS nimmt an — P geht hinter die Base als Absicherung.', {
        d: { SS: B2, P: { x: B2.x + 3, y: B2.y - 22 } },
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
      s('Wurf zurück zur 1, 2B sichert dahinter ab.', {
        d: { '2B': { x: B1.x + 18, y: B1.y - 12 } },
        ball: { hold: '1B' },
        r: { rb: B1 },
      }),
    ],
  }),

  play('Überwurf an der 1 — wer sichert ab', 'Base-Coverage', {
    outs: 1,
    startRunners: {},
    steps: [
      s('Wurf vom SS geht zu hoch.'),
      s('Der Ball fliegt über den 1B hinweg.', {
        d: { '1B': B1 },
        ball: { at: { x: B1.x + 26, y: B1.y - 18 } },
        r: { rb: between(HOME, B1, 0.9) },
      }),
      s('RF war von Anfang an unterwegs — ohne ihn läuft der Runner bis zur 3.', {
        d: { RF: { x: B1.x + 40, y: B1.y - 30 } },
        ball: { loose: { x: B1.x + 34, y: B1.y - 24 } },
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
      s('SS geht als Cut-Mann auf die Linie LF–3B.', {
        d: { SS: between(SHORT_LEFT, B3, 0.45), '3B': B3 },
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
      s('SS stellt sich zwischen CF und 3B.', {
        d: { SS: between(UP_MIDDLE, B3, 0.5), '3B': B3 },
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
      s('SS zieht als Cut-Mann heraus — er, nicht der 2B.', {
        d: { SS: between(SHORT_RIGHT, B3, 0.45), '3B': B3 },
        ball: { at: between(SHORT_RIGHT, B3, 0.45) },
        r: { r1: between(B2, B3, 0.45), rb: B1 },
      }),
      s('Der Runner war zu weit raus — Wurf auf die 3.', {
        ball: { hold: '3B' },
        r: { r1: null },
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
      s('3B ist der Cut-Mann für Home — er stellt sich auf die Linie.', {
        d: { '3B': between(SHORT_LEFT, HOME, 0.4), C: HOME },
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
      s('Dasselbe von rechts — hier ist der 1B der Cut-Mann.'),
      s('RF nimmt auf.', {
        d: { RF: SHORT_RIGHT },
        ball: { at: SHORT_RIGHT, ground: true },
        r: { r2: between(B2, B3, 0.85), rb: between(HOME, B1, 0.3) },
      }),
      s('1B auf die Linie RF–Home.', {
        d: { '1B': between(SHORT_RIGHT, HOME, 0.45), C: HOME },
        ball: { at: between(SHORT_RIGHT, HOME, 0.45) },
        r: { r2: between(B3, HOME, 0.55), rb: B1 },
      }),
      s('Der Wurf ist zu hoch — der Cut fängt ab und hält den Batter auf der 1.', {
        ball: { hold: '1B' },
        r: { r2: null, rb: B1 },
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
      s('Relay dreht und wirft auf die 3.', {
        d: { '3B': B3 },
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
        r: { r1: between(B2, B3, 0.3), rb: between(HOME, B1, 0.7) },
      }),
      s('2B als erster Relay, 1B als zweiter dahinter.', {
        d: { '2B': between(fromHome(40, 200), HOME, 0.45), '1B': between(fromHome(40, 200), HOME, 0.7) },
        ball: { at: between(fromHome(40, 200), HOME, 0.45) },
        r: { r1: between(B3, HOME, 0.4), rb: between(B1, B2, 0.5) },
      }),
      s('Erster Relay wirft zum zweiten.', {
        ball: { hold: '1B' },
        r: { r1: between(B3, HOME, 0.8), rb: B2 },
      }),
      s('Von dort nach Home. Der Run fällt trotzdem — dafür bleibt der Batter auf der 2.', {
        d: { C: HOME },
        ball: { hold: 'C' },
        r: { r1: null },
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
        },
        ball: { loose: { x: HOME.x - 8, y: HOME.y - 14 } },
        r: { r1: between(B1, B2, 0.3), rb: between(HOME, B1, 0.2) },
      }),
      s('P nimmt den Ball auf — er ist am nächsten dran.', {
        d: { P: { x: HOME.x - 8, y: HOME.y - 14 } },
        ball: { hold: 'P' },
        r: { r1: between(B1, B2, 0.6), rb: between(HOME, B1, 0.5) },
      }),
      s('Sicherer Wurf auf die 1 — der 2B deckt dort ab, weil der 1B vorne ist.', {
        ball: { hold: '2B' },
        r: { rb: null },
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
        d: { '3B': toward(DEFAULT_DEFENSE['3B'], HOME, 34), P: toward(MOUND, HOME, 20), SS: B2 },
        ball: { loose: { x: HOME.x - 16, y: HOME.y - 18 } },
        r: { r1: between(B1, B2, 0.3), rb: between(HOME, B1, 0.2) },
      }),
      s('3B nimmt auf und schaut sofort zur 2.', {
        d: { '3B': { x: HOME.x - 16, y: HOME.y - 18 } },
        ball: { hold: '3B' },
        r: { r1: between(B1, B2, 0.6) },
      }),
      s('Wurf auf die 2 — SS deckt ab. Nur machen, wenn der Ball schnell in der Hand ist.', {
        ball: { hold: 'SS' },
        r: { r1: null },
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
        d: { '3B': toward(DEFAULT_DEFENSE['3B'], HOME, 36), SS: B3, P: toward(MOUND, HOME, 18) },
        ball: { loose: { x: HOME.x - 18, y: HOME.y - 16 } },
        r: { r2: between(B2, B3, 0.35), rb: between(HOME, B1, 0.2) },
      }),
      s('SS füllt die Lücke an der 3. Ohne ihn läuft der Runner einfach durch.', {
        d: { '3B': { x: HOME.x - 18, y: HOME.y - 16 } },
        ball: { hold: '3B' },
        r: { r2: between(B2, B3, 0.7) },
      }),
      s('Wurf auf die 1, der Runner bekommt die 3.', {
        d: { '2B': B1 },
        ball: { hold: '2B' },
        r: { r2: B3, rb: null },
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
        r: { r2: null, r1: between(B1, B2, 0.7) },
        outs: 1,
      }),
      s('Klappt das nicht, geht der Wurf an die 1 und man nimmt den sicheren Out.', {
        ball: { hold: '2B' },
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
      s('C nimmt den Ball selbst auf, weil er vor ihm liegt.', {
        d: { C: { x: HOME.x + 6, y: HOME.y - 10 } },
        ball: { hold: 'C' },
        r: { r3: between(B3, HOME, 0.8) },
      }),
      s('Zurück zur Platte und tag — nur wenn der Ball früh genug da ist.', {
        d: { C: HOME },
        r: { r3: null },
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
        d: { P: toward(MOUND, HOME, 22), C: { x: HOME.x, y: HOME.y - 6 }, '1B': toward(DEFAULT_DEFENSE['1B'], HOME, 28), '2B': B1 },
        ball: { loose: { x: HOME.x, y: HOME.y - 8 } },
        r: { rb: between(HOME, B1, 0.25) },
      }),
      s('C hat freie Sicht auf die 1 — der P hätte sich drehen müssen.', {
        ball: { hold: 'C' },
        r: { rb: between(HOME, B1, 0.6) },
      }),
      s('Wurf auf die 1.', { ball: { hold: '2B' }, r: { rb: null }, outs: 2, ms: 600 }),
    ],
  }),

  // ============================================================ First-and-Third
  play('Wurf auf die 2, Runner auf 3 startet', 'First-and-Third', {
    outs: 1,
    startRunners: { r1: B1, r3: B3 },
    steps: [
      s('Runner auf 1 und 3. Der auf 1 läuft — und will genau das.'),
      s('C wirft auf die 2, der Runner von der 3 startet sofort.', {
        d: { C: HOME, SS: B2 },
        ball: { at: between(HOME, B2, 0.6) },
        r: { r1: between(B1, B2, 0.6), r3: between(B3, HOME, 0.35) },
      }),
      s('SS fängt und wirft sofort zurück nach Home.', {
        ball: { hold: 'SS' },
        r: { r3: between(B3, HOME, 0.6), r1: between(B1, B2, 0.85) },
      }),
      s('Zurück zur Platte — der Run ist wichtiger als der Out an der 2.', {
        ball: { hold: 'C' },
        r: { r3: null, r1: B2 },
        outs: 2,
      }),
    ],
  }),

  play('Catcher wirft an den Pitcher — Abfangen in der Mitte', 'First-and-Third', {
    outs: 1,
    startRunners: { r1: B1, r3: B3 },
    gameState: 'CLOSE_LATE',
    gameStateNote: 'Wenn der Run zählt: gar nicht erst zur 2 werfen.',
    steps: [
      s('Dieselbe Lage, knapper Spielstand.'),
      s('C wirft scheinbar zur 2 — der P fängt den Ball ab.', {
        d: { C: HOME, P: { x: MOUND.x, y: MOUND.y - 6 } },
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
        r: { r3: null },
        outs: 1,
      }),
    ],
  }),

  play('Direkter Wurf auf die 3', 'First-and-Third', {
    outs: 2,
    startRunners: { r1: B1, r3: B3 },
    steps: [
      s('Zwei Outs. Jetzt zählt nur noch der dritte, egal wo.'),
      s('Der Runner auf 3 nimmt zu viel Abstand.', {
        d: { C: HOME, '3B': B3 },
        r: { r3: between(B3, HOME, 0.25) },
      }),
      s('Schneller Wurf auf die 3.', { ball: { hold: '3B' }, r: { r3: between(B3, HOME, 0.15) }, ms: 600 }),
      s('Tag — Inning vorbei.', { r: { r3: null }, outs: 3 }),
    ],
  }),

  // ============================================================ Rundown
  play('Rundown zwischen Home und 1', 'Rundown', {
    outs: 1,
    startRunners: { rb: between(HOME, B1, 0.5) },
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
      s('Tag. Ein Wurf reicht, wenn man ihn richtig anläuft.', { r: { rb: null }, outs: 2, ms: 600 }),
    ],
  }),

  play('Rundown zwischen 1 und 2', 'Rundown', {
    outs: 0,
    startRunners: { r1: between(B1, B2, 0.5) },
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
      s('Tag an der 1.', { r: { r1: null }, outs: 1, ms: 600 }),
    ],
  }),

  play('Rundown zwischen 2 und 3', 'Rundown', {
    outs: 1,
    startRunners: { r2: between(B2, B3, 0.5) },
    steps: [
      s('Zwischen 2 und 3 — hier sind SS und 3B zuständig.'),
      s('SS treibt ihn zurück zur 2.', {
        d: { SS: between(B2, B3, 0.7), '3B': B3, '2B': B2 },
        ball: { hold: 'SS' },
        r: { r2: between(B2, B3, 0.3) },
      }),
      s('Wurf zum 2B an der Base.', { ball: { hold: '2B' }, r: { r2: between(B2, B3, 0.12) }, ms: 600 }),
      s('Tag.', { r: { r2: null }, outs: 2, ms: 600 }),
    ],
  }),

  play('Rundown zwischen 3 und Home', 'Rundown', {
    outs: 1,
    startRunners: { r3: between(B3, HOME, 0.5) },
    steps: [
      s('Der teuerste Rundown: hier geht es um einen Run.'),
      s('C läuft ihn zur 3 zurück. Der Runner darf nicht nach Home.', {
        d: { C: between(B3, HOME, 0.7), '3B': B3, P: between(B3, HOME, 0.85) },
        ball: { hold: 'C' },
        r: { r3: between(B3, HOME, 0.3) },
      }),
      s('Wurf zum 3B.', { ball: { hold: '3B' }, r: { r3: between(B3, HOME, 0.12) }, ms: 600 }),
      s('Tag an der 3. P ist nachgerückt, falls der Wurf danebengeht.', {
        r: { r3: null },
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
      s('RF ruft, die anderen weichen. Out.', { outs: 1, ms: 600 }),
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
      s('Out.', { outs: 2, ms: 600 }),
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
      s('Out.', { outs: 2, ms: 600 }),
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
        outs: 2,
      }),
      s('Fällt der Ball: trotzdem Out, und die Runner müssen nicht laufen.', { ms: 2000 }),
    ],
  }),

  // ============================================================ Steal-Defense & Pickoff
  play('Steal auf die 2 — Wurf und Abdeckung', 'Steal-Defense & Pickoff', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Runner auf 1 startet mit dem Wurf.'),
      s('C steht auf, SS geht zur Base. Wer deckt, ist vorher abgesprochen.', {
        d: { C: HOME, SS: B2 },
        ball: { hold: 'C' },
        r: { r1: between(B1, B2, 0.4) },
      }),
      s('Wurf auf die 2.', { ball: { at: between(HOME, B2, 0.7) }, r: { r1: between(B1, B2, 0.75) }, ms: 600 }),
      s('SS fängt und tagt.', { ball: { hold: 'SS' }, r: { r1: null }, outs: 1, ms: 600 }),
    ],
  }),

  play('Steal auf die 3 — Wurf und Abdeckung', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r2: B2 },
    steps: [
      s('Steal auf die 3 kommt seltener — und überrascht deshalb öfter.'),
      s('3B zur Base, SS rückt nach.', {
        d: { C: HOME, '3B': B3, SS: { x: B2.x - 14, y: B2.y + 8 } },
        ball: { hold: 'C' },
        r: { r2: between(B2, B3, 0.4) },
      }),
      s('Wurf die Linie entlang — am Runner vorbei.', {
        ball: { at: between(HOME, B3, 0.7) },
        r: { r2: between(B2, B3, 0.8) },
        ms: 600,
      }),
      s('3B tagt.', { ball: { hold: '3B' }, r: { r2: null }, outs: 2, ms: 600 }),
    ],
  }),

  play('Doppel-Steal, Runner auf 1 und 2', 'Steal-Defense & Pickoff', {
    outs: 0,
    startRunners: { r1: B1, r2: B2 },
    steps: [
      s('Beide laufen. Man kann nur einen bekommen.'),
      s('Der Führungs-Runner geht auf die 3.', {
        d: { C: HOME, '3B': B3, SS: B2 },
        ball: { hold: 'C' },
        r: { r1: between(B1, B2, 0.4), r2: between(B2, B3, 0.4) },
      }),
      s('Wurf auf die 3 — der vordere Runner ist der wertvollere Out.', {
        ball: { at: between(HOME, B3, 0.7) },
        r: { r2: between(B2, B3, 0.8), r1: between(B1, B2, 0.8) },
        ms: 600,
      }),
      s('Out an der 3, die 2 schenken wir her.', {
        ball: { hold: '3B' },
        r: { r2: null, r1: B2 },
        outs: 1,
      }),
    ],
  }),

  play('Pickoff an der 1', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r1: { x: B1.x - 8, y: B1.y + 8 } },
    steps: [
      s('Der Runner nimmt zu viel Abstand.'),
      s('C wirft nach dem Fangen sofort zur 1.', {
        d: { C: HOME, '1B': B1 },
        ball: { at: between(HOME, B1, 0.6) },
      }),
      s('1B fängt an der Base.', { ball: { hold: '1B' }, ms: 600 }),
      s('Tag, bevor der Runner zurück ist.', { r: { r1: null }, outs: 2, ms: 600 }),
    ],
  }),

  play('Pickoff an der 2', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r2: { x: B2.x + 6, y: B2.y + 10 } },
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
        r: { r2: null },
        outs: 2,
        ms: 600,
      }),
    ],
  }),

  play('Pickoff an der 3', 'Steal-Defense & Pickoff', {
    outs: 1,
    startRunners: { r3: { x: B3.x + 8, y: B3.y + 8 } },
    steps: [
      s('Der riskanteste Pickoff: hinter der 3 steht niemand, der absichert.'),
      s('3B geht zurück zur Base, sobald der Wurf durch ist.', {
        d: { C: HOME, '3B': B3 },
        ball: { hold: 'C' },
      }),
      s('Schneller Wurf.', { ball: { hold: '3B' }, ms: 600 }),
      s('Tag. Geht der Wurf daneben, fällt der Run — nur bei sicherem Vorsprung.', {
        r: { r3: null },
        outs: 2,
        ms: 600,
      }),
    ],
  }),

  play('Delayed Steal', 'Steal-Defense & Pickoff', {
    outs: 0,
    startRunners: { r1: B1 },
    steps: [
      s('Der Runner läuft nicht mit dem Wurf, sondern erst, wenn der C zurückwirft.'),
      s('C wirft lässig zum Pitcher zurück — genau da startet der Runner.', {
        d: { C: HOME },
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
        r: { r3: null },
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
          LF: fromHome(-36, 180),
          CF: fromHome(0, 205),
          RF: fromHome(36, 180),
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

  play('Ball am Zaun — Relay-Kette', 'Spielsituationen', {
    outs: 1,
    startRunners: { r1: B1 },
    steps: [
      s('Der Ball springt an den Zaun. Jetzt zählt die Kette.'),
      s('CF jagt ihm nach, SS geht als Relay raus.', {
        d: { CF: fromHome(8, 212), SS: between(fromHome(8, 212), B2, 0.5) },
        ball: { at: fromHome(8, 212), ground: true },
        r: { r1: between(B2, B3, 0.4), rb: between(HOME, B1, 0.8) },
      }),
      s('2B stellt sich hinter den SS — falls der Wurf daneben geht.', {
        d: { '2B': between(fromHome(8, 212), B2, 0.68) },
        ball: { hold: 'SS' },
        r: { r1: between(B3, HOME, 0.3), rb: between(B1, B2, 0.6) },
      }),
      s('Der Run fällt. Wichtig ist, dass der Batter auf der 2 bleibt.', {
        d: { C: HOME },
        ball: { hold: 'C' },
        r: { r1: null, rb: B2 },
      }),
    ],
  }),

  play('Passed Ball, Runner auf 3', 'Spielsituationen', {
    outs: 1,
    startRunners: { r3: B3 },
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
        r: { r3: null },
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
process.stdout.write(zeilen.join('\n'));
