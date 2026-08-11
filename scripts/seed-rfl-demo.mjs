#!/usr/bin/env node
/**
 * seed-rfl-demo.mjs — Rebuilds the "RFL-Demo" Spielbogen (RFL live-scoring sheet) that used to
 * live only as rows in a dev database (id 143, since lost). That was the fastest way to check
 * any change to the Spielbogen sheet or the PDF export against real variety: it covered every
 * notation form the sheet can produce in one game. Losing it taught the lesson that reference
 * data which only exists in a dev DB isn't stored anywhere — so this script, not the rows it
 * creates, is the actual deliverable.
 *
 * It drives the public REST API only (never touches the DB directly) to create one complete
 * Spielbogen containing every notation form:
 *   - all hit types, including inside-the-park home run (INSIDE_PARK_HR)
 *   - walk, hit by pitch, strikeout
 *   - groundout with a fielder chain, fly out, double play, triple play
 *   - reached on error (this is result=OUT + isError=true, NOT a separate result type)
 *   - sacrifice bunt, sacrifice fly
 *   - stolen base, caught stealing, steal of home (counts as a run)
 *   - wild pitch, passed ball
 *   - a substitution and a position change
 *   - an automatic out
 *
 * Usage:
 *   node scripts/seed-rfl-demo.mjs                 # create a new RFL demo Spielbogen
 *   node scripts/seed-rfl-demo.mjs --delete <id>    # delete a Spielbogen this script created
 *
 * Environment variables (all optional, defaults match local dev):
 *   API_BASE_URL   default "http://localhost:8080"
 *   API_USER       default "admin"
 *   API_PASSWORD   default "Deadsox123!"
 *   SEED_DEBUG     set to log every HTTP request this script makes to stderr
 *
 * Requires Node 18+ (uses the built-in fetch). No npm dependencies.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const USER = process.env.API_USER || 'admin';
const PASSWORD = process.env.API_PASSWORD || 'Deadsox123!';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64');

async function api(method, path, body) {
  if (process.env.SEED_DEBUG) console.error(`--> ${method} ${path} ${body ? JSON.stringify(body) : ''}`);
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: AUTH_HEADER,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> HTTP ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`
    );
  }
  return parsed;
}

// 10 slots per side = the max the domain allows (batting orders only ever run X1..X10 — there is
// no X11+, a previous test-data mistake that the app correctly rejected).
const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH'];

function buildSlots(prefix) {
  return POSITIONS.map((position, i) => ({
    slot: i + 1,
    name: `${prefix} ${String(i + 1).padStart(2, '0')}`,
    position,
    battingOrder: i + 1,
  }));
}

async function createSpielbogen() {
  const today = new Date().toISOString().slice(0, 10);
  const bogen = await api('POST', '/api/spielbogen', {
    date: today,
    location: 'Demo-Platz',
    homeTeamName: 'RFL Demo Heim',
    awayTeamName: 'RFL Demo Gast',
  });
  console.log(`Spielbogen erstellt: id=${bogen.id}`);
  return bogen.id;
}

async function setLineups(id) {
  await api('PUT', `/api/spielbogen/${id}/lineup`, { side: 'HOME', slots: buildSlots('Heim') });
  await api('PUT', `/api/spielbogen/${id}/lineup`, { side: 'AWAY', slots: buildSlots('Gast') });
}

async function fetchSlotMap(id) {
  const lineup = await api('GET', `/api/spielbogen/${id}/lineup`);
  const map = { HOME: {}, AWAY: {} };
  for (const slot of lineup.home) map.HOME[slot.battingOrder] = slot.id;
  for (const slot of lineup.away) map.AWAY[slot.battingOrder] = slot.id;
  return map;
}

async function recordAtBat(id, payload) {
  return api('POST', `/api/spielbogen/${id}/at-bats`, payload);
}

async function recordStealing(id, payload) {
  return api('POST', `/api/spielbogen/${id}/stealing-events`, payload);
}

async function recordSubstitution(id, payload) {
  return api('POST', `/api/spielbogen/${id}/substitutions`, payload);
}

async function recordPositionSwap(id, payload) {
  return api('POST', `/api/spielbogen/${id}/position-swaps`, payload);
}

/**
 * Plays out enough of a game to exercise every notation form. The backend auto-switches sides
 * (and advances the inning) the moment 3 weighted outs land for the current side+inning — via
 * `maybeAutoSwitchSide`, triggered from both at-bat and stealing-event recording — so this script
 * never calls the explicit `/switch-side` endpoint itself; it only has to keep its own `inning`/
 * `side` bookkeeping in sync with what the backend will already have flipped to.
 */
async function playDemoGame(id, slots) {
  const away = (order) => slots.AWAY[order];
  const home = (order) => slots.HOME[order];

  // ---- Top 1 (AWAY): single, walk, HBP, double, strikeout, groundout, sac fly ----
  await recordAtBat(id, { side: 'AWAY', slotId: away(1), inning: 1, result: 'SINGLE',
    baseStateAfter: { firstSlotId: away(1) } });
  await recordAtBat(id, { side: 'AWAY', slotId: away(2), inning: 1, result: 'WALK',
    baseStateAfter: { firstSlotId: away(2), secondSlotId: away(1) } });
  await recordAtBat(id, { side: 'AWAY', slotId: away(3), inning: 1, result: 'HIT_BY_PITCH',
    baseStateAfter: { firstSlotId: away(3), secondSlotId: away(2), thirdSlotId: away(1) } });
  await recordAtBat(id, { side: 'AWAY', slotId: away(4), inning: 1, result: 'DOUBLE',
    runsScored: 2, rbi: 2, baseStateAfter: { secondSlotId: away(4), thirdSlotId: away(3) } });
  await recordAtBat(id, { side: 'AWAY', slotId: away(5), inning: 1, result: 'STRIKEOUT' }); // out 1
  await recordAtBat(id, { side: 'AWAY', slotId: away(6), inning: 1, result: 'OUT',
    outType: 'GROUNDER', fielderChain: [6, 3] }); // out 2
  await recordAtBat(id, { side: 'AWAY', slotId: away(7), inning: 1, result: 'OUT',
    outType: 'FLY', fielderChain: [8], sacrificeType: 'FLY', runsScored: 1, rbi: 1 }); // out 3 -> auto-switch to HOME

  // ---- Bottom 1 (HOME): single, double play, triple, homerun, inside-the-park HR, strikeout ----
  await recordAtBat(id, { side: 'HOME', slotId: home(1), inning: 1, result: 'SINGLE',
    baseStateAfter: { firstSlotId: home(1) } });
  await recordAtBat(id, { side: 'HOME', slotId: home(2), inning: 1, result: 'OUT',
    outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3] }); // out 1+2 (weighted 2)
  await recordAtBat(id, { side: 'HOME', slotId: home(3), inning: 1, result: 'TRIPLE',
    baseStateAfter: { thirdSlotId: home(3) } });
  await recordAtBat(id, { side: 'HOME', slotId: home(4), inning: 1, result: 'HOMERUN',
    runsScored: 2, rbi: 2 });
  await recordAtBat(id, { side: 'HOME', slotId: home(5), inning: 1, result: 'INSIDE_PARK_HR',
    runsScored: 1, rbi: 1 });
  await recordAtBat(id, { side: 'HOME', slotId: home(6), inning: 1, result: 'STRIKEOUT' }); // out 3 -> auto-switch to AWAY, inning 2

  // Between-innings defensive move: substitution + position change (inning 2, no out implications).
  await recordSubstitution(id, { side: 'HOME', slotId: home(7), inning: 2,
    playerInName: 'Klaus Ersatz', pinchHitter: false });
  await recordPositionSwap(id, { side: 'HOME', inning: 2,
    changes: [
      { slotId: home(7), newPosition: 'CF' },
      { slotId: home(8), newPosition: 'LF' },
    ] }); // ring-swap LF <-> CF

  // ---- Top 2 (AWAY): reached on error, stolen base, steal of home, wild pitch, passed ball,
  //      sac bunt, caught stealing, automatic out ----
  await recordAtBat(id, { side: 'AWAY', slotId: away(1), inning: 2, result: 'SINGLE',
    baseStateAfter: { firstSlotId: away(1) } });
  await recordStealing(id, { side: 'AWAY', slotId: away(1), inning: 2, type: 'STOLEN_BASE',
    fromBase: 1, toBase: 2 });
  await recordAtBat(id, { side: 'AWAY', slotId: away(2), inning: 2, result: 'OUT',
    isError: true, errorPosition: 5,
    baseStateAfter: { firstSlotId: away(2), secondSlotId: away(1) } }); // reached on error, 0 outs
  await recordStealing(id, { side: 'AWAY', slotId: away(1), inning: 2, type: 'STOLEN_BASE',
    fromBase: 2, toBase: 3 });
  await recordStealing(id, { side: 'AWAY', slotId: away(1), inning: 2, type: 'STOLEN_BASE',
    fromBase: 3, toBase: 4 }); // steal of home -> +1 run for AWAY, automatically
  await recordStealing(id, { side: 'AWAY', slotId: away(2), inning: 2, type: 'WILD_PITCH',
    fromBase: 1, toBase: 2 });
  await recordAtBat(id, { side: 'AWAY', slotId: away(3), inning: 2, result: 'OUT',
    outType: 'GROUNDER', fielderChain: [1, 3], sacrificeType: 'BUNT',
    baseStateAfter: { thirdSlotId: away(2) } }); // sac bunt, out 1
  await recordStealing(id, { side: 'AWAY', slotId: away(2), inning: 2, type: 'PASSED_BALL',
    fromBase: 3, toBase: 4 }); // passed ball home -> +1 run for AWAY
  await recordAtBat(id, { side: 'AWAY', slotId: away(4), inning: 2, result: 'SINGLE',
    baseStateAfter: { firstSlotId: away(4) } });
  await recordStealing(id, { side: 'AWAY', slotId: away(4), inning: 2, type: 'CAUGHT_STEALING',
    fromBase: 1, toBase: 2 }); // out 2
  await recordAtBat(id, { side: 'AWAY', slotId: away(5), inning: 2, result: 'AUTOMATIC_OUT' }); // out 3 -> auto-switch to HOME

  // ---- Bottom 2 (HOME): single, walk, triple play (ends inning in one at-bat) ----
  await recordAtBat(id, { side: 'HOME', slotId: home(1), inning: 2, result: 'SINGLE',
    baseStateAfter: { firstSlotId: home(1) } });
  await recordAtBat(id, { side: 'HOME', slotId: home(2), inning: 2, result: 'WALK',
    baseStateAfter: { firstSlotId: home(2), secondSlotId: home(1) } });
  await recordAtBat(id, { side: 'HOME', slotId: home(3), inning: 2, result: 'OUT',
    outType: 'TRIPLE_PLAY', fielderChain: [5, 4, 3] }); // outs 1+2+3, ends inning
}

async function main() {
  const args = process.argv.slice(2);
  const deleteIdx = args.indexOf('--delete');
  if (deleteIdx !== -1) {
    const id = args[deleteIdx + 1];
    if (!id) {
      console.error('Usage: --delete <spielbogenId>');
      process.exit(1);
    }
    await api('DELETE', `/api/spielbogen/${id}`, undefined);
    console.log(`Spielbogen ${id} gelöscht.`);
    return;
  }

  const id = await createSpielbogen();
  await setLineups(id);
  const slots = await fetchSlotMap(id);
  await api('POST', `/api/spielbogen/${id}/start`, undefined);
  await playDemoGame(id, slots);
  const clockState = await api('POST', `/api/spielbogen/${id}/clock/start`, { limitMinutes: null });
  const bogen = await api('GET', `/api/spielbogen/${id}`, undefined);

  console.log(`RFL-Demo Spielbogen id=${id}`);
  console.log(`Clock: running=${clockState.running} started=${clockState.started}`);
  console.log(`timerStartedAt (API): ${bogen.timerStartedAt}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
