import { request, type APIRequestContext } from '@playwright/test'
import { basicAuthHeader } from './auth'

const BASE = 'http://localhost:8080'

async function client(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: basicAuthHeader() },
  })
}

/**
 * API-Client für die Dauer eines Callbacks: aufbauend auf `client()`, disposed danach
 * garantiert. Spart das try/finally-dispose-Boilerplate in jedem Spec.
 */
export async function withApi<T>(fn: (c: APIRequestContext) => Promise<T>): Promise<T> {
  const c = await client()
  try {
    return await fn(c)
  } finally {
    await c.dispose()
  }
}

type Player = { id: number; name: string; defaultBattingOrder: number | null }
type Season = { id: number; name: string; year: number }
type GameDay = { id: number; date: string; label?: string | null; games: { id: number; gameNumber: number }[] }
type LineupEntryReq = { playerId: number; position: string | null; battingOrder: number; dhBatterPlayerId: number | null }

const TEST_GAMEDAY_LABEL_PREFIX = 'E2E-Test-Scoring'
const TEST_DATE = '2099-01-01'

function testGameDayLabel(workerIndex: number): string {
  return `${TEST_GAMEDAY_LABEL_PREFIX}-W${workerIndex}`
}

function testSeasonYear(workerIndex: number): number {
  return 2099 + workerIndex
}

async function ensureSeason(c: APIRequestContext, workerIndex: number): Promise<number> {
  const year = testSeasonYear(workerIndex)
  const seasonsRes = await c.get('/api/seasons')
  if (!seasonsRes.ok()) throw new Error(`Failed to fetch seasons: ${seasonsRes.status()}`)
  const seasons: Season[] = await seasonsRes.json()
  const existing = seasons.find(s => s.year === year)
  if (existing) return existing.id
  const create = await c.post('/api/seasons', { data: { name: `E2E Test Season W${workerIndex}`, year } })
  if (!create.ok()) throw new Error(`Failed to create season: ${create.status()}`)
  const created: Season = await create.json()
  return created.id
}

/**
 * Find-or-create the shared E2E test GameDay with a single Game and 9-player lineup.
 * Returns the gameId of the test Game.
 */
export async function ensureTestGame(workerIndex: number = 0): Promise<{ gameId: number; gameDayId: number; playerIds: number[]; benchPlayerId: number }> {
  const c = await client()
  const label = testGameDayLabel(workerIndex)
  try {
    const seasonId = await ensureSeason(c, workerIndex)
    const gdRes = await c.get(`/api/seasons/${seasonId}/gamedays`)
    if (!gdRes.ok()) throw new Error(`Failed to fetch gamedays: ${gdRes.status()}`)
    const gameDays: GameDay[] = await gdRes.json()
    let gameDay = gameDays.find(gd => gd.label === label)
    let createdNew = false
    if (!gameDay) {
      const createGd = await c.post(`/api/seasons/${seasonId}/gamedays`, {
        data: { date: TEST_DATE, label, numberOfGames: 1 },
      })
      if (!createGd.ok()) throw new Error(`Failed to create gameday: ${createGd.status()} ${await createGd.text()}`)
      gameDay = await createGd.json()
      createdNew = true
    }
    if (!gameDay || !gameDay.games || gameDay.games.length === 0) {
      throw new Error('Test GameDay missing games')
    }

    const playersRes = await c.get('/api/players')
    if (!playersRes.ok()) throw new Error(`Failed to fetch players: ${playersRes.status()}`)
    const players: Player[] = await playersRes.json()
    // Erst nach defaultBattingOrder sortieren (User-Präferenz wenn gesetzt),
    // sonst nach ID. Fresh DB (CI) hat oft kein defaultBattingOrder gesetzt → ID-Order ok.
    const ordered = [...players]
      .sort((a, b) => {
        const ao = a.defaultBattingOrder ?? 999
        const bo = b.defaultBattingOrder ?? 999
        if (ao !== bo) return ao - bo
        return a.id - b.id
      })
      .slice(0, 10) // 9 in lineup + 1 bench
    if (ordered.length < 10) {
      throw new Error(`Brauche mindestens 10 Spieler, habe ${ordered.length}`)
    }
    const playerIds = ordered.slice(0, 9).map(p => p.id)
    const benchPlayerId = ordered[9].id
    const allAvailableIds = [...playerIds, benchPlayerId]

    const gameId = gameDay.games[0].id

    if (createdNew) {
      const availRes = await c.put(`/api/gamedays/${gameDay.id}/players`, { data: { playerIds: allAvailableIds } })
      if (!availRes.ok()) throw new Error(`Failed to set players: ${availRes.status()} ${await availRes.text()}`)

      const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
      const lineup: LineupEntryReq[] = ordered.slice(0, 9).map((p, i) => ({
        playerId: p.id,
        position: positions[i] ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: null,
      }))
      const lineupRes = await c.put(`/api/games/${gameId}/lineup`, { data: lineup })
      if (!lineupRes.ok()) throw new Error(`Failed to set lineup: ${lineupRes.status()} ${await lineupRes.text()}`)
    }

    return { gameId, gameDayId: gameDay.id, playerIds, benchPlayerId }
  } finally {
    await c.dispose()
  }
}

/** Delete the entire test GameDay. */
export async function teardownTestGameDay(gameDayId: number): Promise<void> {
  const c = await client()
  try {
    const gd = await c.get(`/api/gamedays/${gameDayId}`)
    if (!gd.ok()) return
    const data: GameDay = await gd.json()
    if (!data.label || !data.label.startsWith(TEST_GAMEDAY_LABEL_PREFIX)) {
      throw new Error(`Refuse to delete non-test gameday ${gameDayId} with label ${data.label}`)
    }
    await c.delete(`/api/gamedays/${gameDayId}`)
  } finally {
    await c.dispose()
  }
}

/** Reset scoring state for a game. */
export async function resetScoring(gameId: number): Promise<void> {
  const c = await client()
  try {
    const res = await c.delete(`/api/games/${gameId}/scoring`)
    if (!res.ok()) throw new Error(`Failed to reset: ${res.status()}`)
  } finally {
    await c.dispose()
  }
}

/** Set batting side. */
export async function setBattingSide(gameId: number, side: 'top' | 'bottom' | null): Promise<void> {
  const c = await client()
  try {
    const res = await c.put(`/api/games/${gameId}/batting-side`, { data: { battingSide: side } })
    if (!res.ok()) throw new Error(`Failed to set side: ${res.status()}`)
  } finally {
    await c.dispose()
  }
}

type BaseStateDto = { first: number | null; second: number | null; third: number | null }
type AtBatResult = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'WALK' | 'HIT_BY_PITCH' | 'STRIKEOUT' | 'OUT' | 'REACHED_ON_ERROR'

/** Seed a recorded AB directly via API. */
export async function seedAtBat(gameId: number, batterId: number, result: AtBatResult, inning: number, baseStateAfter: BaseStateDto, runsScored = 0, rbi = 0): Promise<void> {
  const c = await client()
  try {
    const res = await c.post(`/api/games/${gameId}/atbats`, {
      data: { batterId, result, inning, baseStateAfter, runsScored, rbi },
    })
    if (!res.ok()) throw new Error(`Failed to seed AB: ${res.status()}`)
  } finally {
    await c.dispose()
  }
}

type ScoreboardResponse = {
  scoreUs: number
  scoreThem: number
  currentInning: number
  outsInCurrentInning: number
  baseState: BaseStateDto
  runners: { base: number; playerId: number; playerName: string; battingOrder: number | null }[]
  currentBatterId: number | null
  currentBatterName: string | null
  currentBatterOrder: number | null
  totalAtBats: number
}

/** Get scoreboard state. */
export async function getScoreboard(gameId: number): Promise<ScoreboardResponse> {
  const c = await client()
  try {
    const res = await c.get(`/api/games/${gameId}/scoreboard`)
    if (!res.ok()) throw new Error(`Failed to get scoreboard: ${res.status()}`)
    return await res.json()
  } finally {
    await c.dispose()
  }
}

export type PlayerBattingStats = {
  playerId: number
  playerName: string
  plateAppearances: number
  atBats: number
  runs: number
  hits: number
  singles: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  hitByPitch: number
  strikeouts: number
  outs: number
  reachedOnError: number
  stolenBases: number
  caughtStealing: number
  runsBattedIn: number
  totalBases: number
  battingAverage: string
  onBasePct: string
  sluggingPct: string
  ops: string
}

export async function getBattingStats(gameId: number): Promise<PlayerBattingStats[]> {
  const c = await client()
  try {
    const res = await c.get(`/api/games/${gameId}/batting-stats`)
    if (!res.ok()) throw new Error(`getBattingStats failed: ${res.status()}`)
    return await res.json()
  } finally { await c.dispose() }
}

type StealingEvent = { id: number; runnerId: number; runnerName: string; type: 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'WILD_PITCH' | 'PASSED_BALL'; inning: number }

export async function getStealingEvents(gameId: number): Promise<StealingEvent[]> {
  const c = await client()
  try {
    const res = await c.get(`/api/games/${gameId}/stealing-events`)
    if (!res.ok()) throw new Error(`getStealingEvents failed: ${res.status()}`)
    return await res.json()
  } finally { await c.dispose() }
}

type SubstitutionRaw = { id: number; playerOut: { id: number; name: string }; playerIn: { id: number; name: string }; inning: number }
export type Substitution = { id: number; playerOutId: number; playerInId: number; inning: number }

export async function getSubstitutions(gameId: number): Promise<Substitution[]> {
  const c = await client()
  try {
    const res = await c.get(`/api/games/${gameId}/substitutions`)
    if (!res.ok()) throw new Error(`getSubstitutions failed: ${res.status()}`)
    const raw: SubstitutionRaw[] = await res.json()
    return raw.map(s => ({ id: s.id, playerOutId: s.playerOut.id, playerInId: s.playerIn.id, inning: s.inning }))
  } finally { await c.dispose() }
}

export async function getPlayerName(playerId: number): Promise<string> {
  const c = await client()
  try {
    const res = await c.get('/api/players')
    if (!res.ok()) throw new Error(`getPlayer failed: ${res.status()}`)
    const all: Array<{ id: number; name: string }> = await res.json()
    const p = all.find(x => x.id === playerId)
    if (!p) throw new Error(`Player ${playerId} nicht gefunden`)
    return p.name
  } finally { await c.dispose() }
}
