#!/usr/bin/env node
/**
 * seed-batting-stats.mjs — Fills the batting-statistics page (`/stats`, `StatsPage.tsx`) and its
 * PDF export with real Old-Scoring data. A dev database usually has zero rows in `at_bats` (that
 * table is only ever written by the legacy per-Game scoring path, never by Spielbogen — see
 * `docs/STATS.md`), so `/stats` renders empty until someone plays through real games by hand.
 *
 * Rows in a dev database aren't storage — the reference game a previous agent built here was lost
 * the same way the RFL-Demo Spielbogen was (see `scripts/seed-rfl-demo.mjs`). So this script, not
 * the rows it creates, is the durable artifact.
 *
 * It drives the public REST API only (never touches the DB directly) to build one season with one
 * gameday of three games, using players that already exist (never creates players), covering:
 *   - 12 distinct players with recorded at-bats
 *   - a spread of batting averages (.222 .. .889) so sort order + "Top Hitter" are meaningful
 *   - every result type Old-Scoring's batting stats care about: SINGLE, DOUBLE, TRIPLE, HOMERUN,
 *     WALK, HIT_BY_PITCH, STRIKEOUT, OUT
 *   - stolen bases, caught-stealing and pickoffs (BaseRunningEvent), plus RBIs on hits
 *   - one player under the 5-AB qualifier threshold (BattingStatsCalculator.QUALIFIED_MIN_AT_BATS)
 *   - a DH: one field player hosts a DH-batter in each game (host doesn't bat that game, DH bats
 *     in his batting slot instead) — DH is NEVER its own lineup entry, only the annotation
 *     `dhBatterPlayerId` on the host's LineupEntry (see docs/LINEUP.md, docs/STATS.md)
 *
 * Usage:
 *   node scripts/seed-batting-stats.mjs                 # create the "PDF-Testdaten" season
 *   node scripts/seed-batting-stats.mjs --delete <seasonId>   # delete a season this script created
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

const SEASON_NAME = 'PDF-Testdaten';
const SEASON_YEAR = 2026;

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

/**
 * Names of the existing players this script uses, mapped to their role in the demo roster. It
 * never creates players — only reads `/api/players` and resolves these names to ids. If a name
 * doesn't exist in the target DB, fail loudly rather than silently creating a duplicate.
 */
const ROSTER_NAMES = [
  'Khang', 'Florian', 'Hung', 'Kairi', 'Seb', 'Yuki', 'Anne', 'Tomoki', 'Mitchi', 'Mike', 'Miriam',
  'Madita',
];

async function resolvePlayerIds() {
  const players = await api('GET', '/api/players');
  const byName = new Map(players.map((p) => [p.name, p.id]));
  const ids = {};
  for (const name of ROSTER_NAMES) {
    const id = byName.get(name);
    if (!id) throw new Error(`Spieler "${name}" existiert nicht in dieser DB — Skript passt nicht zu diesen Seed-Daten`);
    ids[name] = id;
  }
  return ids;
}

async function createSeason() {
  const season = await api('POST', '/api/seasons', { name: SEASON_NAME, year: SEASON_YEAR });
  console.log(`Season erstellt: id=${season.id} "${season.name}" (${season.year})`);
  return season.id;
}

async function createGameDay(seasonId) {
  const today = new Date().toISOString().slice(0, 10);
  const gameDay = await api('POST', `/api/seasons/${seasonId}/gamedays`, {
    date: today,
    label: 'PDF-Testdaten Spieltag',
    location: 'Testplatz',
    numberOfGames: 3,
  });
  console.log(`GameDay erstellt: id=${gameDay.id}, Games=${gameDay.games.map((g) => g.id).join(', ')}`);
  return gameDay;
}

async function setAvailablePlayers(gameDayId, playerIds) {
  await api('PUT', `/api/gamedays/${gameDayId}/players`, { playerIds });
}

async function setLineup(gameId, entries) {
  await api('PUT', `/api/games/${gameId}/lineup`, entries);
}

async function recordAtBat(gameId, { batterId, inning, result, runsScored, rbi }) {
  await api('POST', `/api/games/${gameId}/atbats`, {
    batterId, inning, result,
    runsScored: runsScored ?? 0,
    rbi: rbi ?? 0,
  });
}

async function recordStealingEvent(gameId, { runnerId, type, inning }) {
  await api('POST', `/api/games/${gameId}/stealing-events`, { runnerId, type, inning });
}

async function setScore(gameId, scoreUs, scoreThem) {
  await api('PUT', `/api/games/${gameId}/score`, { scoreUs, scoreThem });
}

async function endGame(gameId) {
  await api('POST', `/api/games/${gameId}/end`);
}

/**
 * Builds the 10-slot field lineup for one game. `hostName` is the field player who gives his
 * batting turn to `dhName` this game (DH-Host — fields normally, doesn't bat, may coach; see
 * docs/LINEUP.md). `ehName` fills the EH slot (bats, no field position).
 */
function buildLineup(ids, hostName, dhName, ehName) {
  const FIELD_ORDER = [
    ['Khang', 'P'], ['Florian', 'C'], ['Hung', '1B'], ['Kairi', '2B'], ['Seb', '3B'],
    ['Yuki', 'SS'], ['Anne', 'LF'], ['Tomoki', 'CF'], ['Mitchi', 'RF'],
  ];
  const entries = FIELD_ORDER.map(([name, position], i) => ({
    playerId: ids[name],
    position,
    battingOrder: i + 1,
    dhBatterPlayerId: name === hostName ? ids[dhName] : null,
  }));
  entries.push({ playerId: ids[ehName], position: 'EH', battingOrder: 10, dhBatterPlayerId: null });
  return entries;
}

/**
 * Plays out one game's at-bats + stealing events from a compact per-player script. `plan` maps
 * player name -> array of `[result, runsScored?, rbi?]` triples, one per inning (index 0 = inning
 * 1, etc.) — players who sit out an inning (e.g. the DH-host, or a short-roster sub) just have a
 * shorter array. `steals` is an array of `[runnerName, type, inning]`.
 */
async function playGame(gameId, ids, plan, steals) {
  const maxInnings = Math.max(...Object.values(plan).map((abs) => abs.length));
  for (let inning = 1; inning <= maxInnings; inning++) {
    for (const [name, atBats] of Object.entries(plan)) {
      const ab = atBats[inning - 1];
      if (!ab) continue;
      const [result, runsScored, rbi] = ab;
      await recordAtBat(gameId, { batterId: ids[name], inning, result, runsScored, rbi });
    }
  }
  for (const [runnerName, type, inning] of steals) {
    await recordStealingEvent(gameId, { runnerId: ids[runnerName], type, inning });
  }
}

function totalRuns(plan) {
  return Object.values(plan).flat().reduce((sum, [, runsScored]) => sum + (runsScored ?? 0), 0);
}

/**
 * Game 1 — DH-host is Mitchi (RF), so Mitchi sits out batting this game; Miriam bats in his
 * lineup slot instead. Mike plays EH. Covers SINGLE/DOUBLE/TRIPLE/HOMERUN/WALK/HBP/STRIKEOUT/OUT
 * plus a stolen base, a caught-stealing and a pickoff.
 */
function game1Plan() {
  return {
    Khang: [['SINGLE'], ['OUT'], ['SINGLE']],
    Florian: [['OUT'], ['SINGLE'], ['STRIKEOUT']],
    Hung: [['DOUBLE', 0, 1], ['STRIKEOUT'], ['SINGLE']],
    Kairi: [['STRIKEOUT'], ['OUT'], ['OUT']],
    Seb: [['WALK'], ['SINGLE'], ['OUT']],
    Yuki: [['TRIPLE', 0, 2], ['DOUBLE', 0, 1], ['SINGLE']],
    Anne: [['HIT_BY_PITCH'], ['WALK'], ['OUT']],
    Tomoki: [['HOMERUN', 1, 1], ['STRIKEOUT'], ['DOUBLE', 0, 1]],
    // Miriam bats in Mitchi's (DH-host) slot this game
    Miriam: [['SINGLE'], ['OUT'], ['HOMERUN', 1, 1]],
    Mike: [['OUT'], ['SINGLE'], ['STRIKEOUT']],
  };
}
const game1Steals = [
  ['Anne', 'STOLEN_BASE', 1],
  ['Anne', 'CAUGHT_STEALING', 2],
  ['Mike', 'PICKOFF', 2],
];

/**
 * Game 2 — DH-host is Seb (3B) this time; Miriam bats in his slot. Mitchi and Mike now bat for
 * real (they sat/played differently in game 1). Adds a stolen base + a caught-stealing.
 */
function game2Plan() {
  return {
    Khang: [['OUT'], ['SINGLE'], ['STRIKEOUT']],
    Florian: [['SINGLE'], ['OUT'], ['OUT']],
    Hung: [['HOMERUN', 1, 1], ['SINGLE'], ['OUT']],
    Kairi: [['SINGLE'], ['STRIKEOUT'], ['OUT']],
    Yuki: [['SINGLE'], ['TRIPLE', 0, 1], ['SINGLE']],
    Anne: [['STRIKEOUT'], ['SINGLE'], ['HIT_BY_PITCH']],
    Tomoki: [['HOMERUN', 1, 2], ['OUT'], ['SINGLE']],
    Mitchi: [['DOUBLE', 0, 1], ['STRIKEOUT'], ['SINGLE']],
    // Miriam bats in Seb's (DH-host) slot this game
    Miriam: [['OUT'], ['SINGLE'], ['DOUBLE', 0, 1]],
    Mike: [['WALK'], ['OUT'], ['SINGLE']],
  };
}
const game2Steals = [
  ['Kairi', 'STOLEN_BASE', 1],
  ['Florian', 'CAUGHT_STEALING', 2],
];

/**
 * Game 3 — DH-host is Hung (1B); Miriam bats in his slot. Mike is rested for this game and
 * Madita fills EH instead, batting only twice — she stays under the 5-AB qualifier threshold on
 * purpose (BattingStatsCalculator.QUALIFIED_MIN_AT_BATS = 5), so the "unqualified" path in
 * aggregated scopes has something to show.
 */
function game3Plan() {
  return {
    Khang: [['SINGLE'], ['OUT'], ['SINGLE']],
    Florian: [['STRIKEOUT'], ['SINGLE'], ['OUT']],
    Kairi: [['OUT'], ['STRIKEOUT'], ['SINGLE']],
    Seb: [['SINGLE'], ['OUT'], ['STRIKEOUT']],
    Yuki: [['HOMERUN', 1, 1], ['SINGLE'], ['OUT']],
    Anne: [['SINGLE'], ['WALK'], ['SINGLE']],
    Tomoki: [['OUT'], ['TRIPLE', 0, 1], ['HOMERUN', 1, 1]],
    Mitchi: [['SINGLE'], ['OUT'], ['SINGLE']],
    // Miriam bats in Hung's (DH-host) slot this game
    Miriam: [['DOUBLE', 0, 1], ['SINGLE'], ['OUT']],
    // Madita: only 2 plate appearances all season — stays unqualified (<5 AB)
    Madita: [['SINGLE'], ['STRIKEOUT']],
  };
}
const game3Steals = [
  ['Anne', 'STOLEN_BASE', 1],
  ['Kairi', 'PICKOFF', 2],
];

async function seed() {
  const ids = await resolvePlayerIds();
  const seasonId = await createSeason();
  const gameDay = await createGameDay(seasonId);
  const gameIds = gameDay.games.map((g) => g.id);

  const allPlayerIds = Object.values(ids);
  await setAvailablePlayers(gameDay.id, allPlayerIds);
  console.log(`Verfuegbare Spieler gesetzt: ${allPlayerIds.length} (${ROSTER_NAMES.join(', ')})`);

  const games = [
    { id: gameIds[0], lineup: buildLineup(ids, 'Mitchi', 'Miriam', 'Mike'), plan: game1Plan(), steals: game1Steals, opponentRuns: 4 },
    { id: gameIds[1], lineup: buildLineup(ids, 'Seb', 'Miriam', 'Mike'), plan: game2Plan(), steals: game2Steals, opponentRuns: 6 },
    { id: gameIds[2], lineup: buildLineup(ids, 'Hung', 'Miriam', 'Madita'), plan: game3Plan(), steals: game3Steals, opponentRuns: 3 },
  ];

  for (const [i, g] of games.entries()) {
    await setLineup(g.id, g.lineup);
    await playGame(g.id, ids, g.plan, g.steals);
    const scoreUs = totalRuns(g.plan);
    await setScore(g.id, scoreUs, g.opponentRuns);
    await endGame(g.id);
    console.log(`Game ${i + 1} (id=${g.id}) fertig: ${scoreUs}:${g.opponentRuns}`);
  }

  return { seasonId, gameDayId: gameDay.id, gameIds };
}

async function deleteSeasonData(seasonId) {
  const gameDays = await api('GET', `/api/seasons/${seasonId}/gamedays`);
  for (const gameDay of gameDays) {
    for (const game of gameDay.games) {
      // At-bats / stealing-events / substitutions have no DB-level or JPA cascade from Game —
      // deleting the season directly would hit a FK violation. Reset scoring first (same
      // endpoint the Scoring page's "Reset" button uses) so the season delete cascades cleanly
      // through GameDay -> Game -> LineupEntry/Staff (which *are* JPA-cascaded).
      await api('DELETE', `/api/games/${game.id}/scoring`);
    }
  }
  await api('DELETE', `/api/seasons/${seasonId}`);
  console.log(`Season ${seasonId} inkl. aller GameDays/Games/At-Bats geloescht.`);
}

async function main() {
  const args = process.argv.slice(2);
  const deleteIdx = args.indexOf('--delete');
  if (deleteIdx !== -1) {
    const id = args[deleteIdx + 1];
    if (!id) {
      console.error('Usage: --delete <seasonId>');
      process.exit(1);
    }
    await deleteSeasonData(id);
    return;
  }

  const result = await seed();
  console.log(`\nFertig. Season id=${result.seasonId}, GameDay id=${result.gameDayId}, Games=[${result.gameIds.join(', ')}]`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
