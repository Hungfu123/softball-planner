import { request, type APIRequestContext } from '@playwright/test'
import { basicAuthHeader } from './auth'

const BASE = 'http://localhost:8080'

async function client(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: basicAuthHeader() },
  })
}

type Player = { id: number; name: string; defaultBattingOrder: number | null }
type Season = { id: number; name: string; year: number }
type GameDay = { id: number; date: string; label?: string | null; games: { id: number; gameNumber: number }[] }
type LineupEntryReq = { playerId: number; position: string | null; battingOrder: number; dhBatterPlayerId: number | null }

const TEST_GAMEDAY_LABEL = 'E2E-Test-Scoring'
const TEST_DATE = '2099-01-01'

async function ensureSeason(c: APIRequestContext): Promise<number> {
  const seasonsRes = await c.get('/api/seasons')
  if (!seasonsRes.ok()) throw new Error(`Failed to fetch seasons: ${seasonsRes.status()}`)
  const seasons: Season[] = await seasonsRes.json()
  const existing = seasons.find(s => s.year === 2099)
  if (existing) return existing.id
  const create = await c.post('/api/seasons', { data: { name: 'E2E Test Season', year: 2099 } })
  if (!create.ok()) throw new Error(`Failed to create season: ${create.status()}`)
  const created: Season = await create.json()
  return created.id
}

/**
 * Find-or-create the shared E2E test GameDay with a single Game and 9-player lineup.
 * Returns the gameId of the test Game.
 */
export async function ensureTestGame(): Promise<{ gameId: number; gameDayId: number; playerIds: number[] }> {
  const c = await client()
  try {
    const seasonId = await ensureSeason(c)
    const gdRes = await c.get(`/api/seasons/${seasonId}/gamedays`)
    if (!gdRes.ok()) throw new Error(`Failed to fetch gamedays: ${gdRes.status()}`)
    const gameDays: GameDay[] = await gdRes.json()
    let gameDay = gameDays.find(gd => gd.label === TEST_GAMEDAY_LABEL)
    let createdNew = false
    if (!gameDay) {
      const createGd = await c.post(`/api/seasons/${seasonId}/gamedays`, {
        data: { date: TEST_DATE, label: TEST_GAMEDAY_LABEL, numberOfGames: 1 },
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
    const ordered = [...players]
      .filter(p => p.defaultBattingOrder != null)
      .sort((a, b) => (a.defaultBattingOrder ?? 99) - (b.defaultBattingOrder ?? 99))
      .slice(0, 9)
    if (ordered.length < 9) {
      throw new Error(`Brauche mindestens 9 Spieler mit battingOrder, habe ${ordered.length}`)
    }
    const playerIds = ordered.map(p => p.id)

    const gameId = gameDay.games[0].id

    if (createdNew) {
      const availRes = await c.put(`/api/gamedays/${gameDay.id}/players`, { data: { playerIds } })
      if (!availRes.ok()) throw new Error(`Failed to set players: ${availRes.status()} ${await availRes.text()}`)

      const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
      const lineup: LineupEntryReq[] = ordered.map((p, i) => ({
        playerId: p.id,
        position: positions[i] ?? null,
        battingOrder: i + 1,
        dhBatterPlayerId: null,
      }))
      const lineupRes = await c.put(`/api/games/${gameId}/lineup`, { data: lineup })
      if (!lineupRes.ok()) throw new Error(`Failed to set lineup: ${lineupRes.status()} ${await lineupRes.text()}`)
    }

    return { gameId, gameDayId: gameDay.id, playerIds }
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
    if (data.label !== TEST_GAMEDAY_LABEL) {
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
