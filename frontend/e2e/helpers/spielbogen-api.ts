import { request, type APIRequestContext } from '@playwright/test'
import { basicAuthHeader } from './auth'

const BASE = 'http://localhost:8080'

async function client(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Authorization: basicAuthHeader() },
  })
}

export type Side = 'HOME' | 'AWAY'
export type AbResult = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'WALK' | 'HIT_BY_PITCH' | 'STRIKEOUT' | 'OUT' | 'REACHED_ON_ERROR'
export type OutType = 'NORMAL' | 'DOUBLE_PLAY' | 'TRIPLE_PLAY' | 'SAC_FLY' | 'SAC_BUNT'
export type StealType = 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'WILD_PITCH' | 'PASSED_BALL'

export type SpielbogenIds = {
  bogenId: number
  homeSlotIds: number[]   // index 0..8 → slot 1..9
  awaySlotIds: number[]
}

export type BaseStateAfter = {
  firstSlotId?: number | null
  secondSlotId?: number | null
  thirdSlotId?: number | null
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']

export async function createSpielbogen(
  date: string,
  homeTeamName: string,
  awayTeamName: string,
  workerIndex: number = 0,
): Promise<SpielbogenIds> {
  const c = await client()
  // Stable unique label per worker so parallel tests don't collide
  const label = `E2E-FullGame-W${workerIndex}-${Date.now()}`
  const createRes = await c.post('/api/spielbogen', {
    data: { date, location: 'E2E-Field', homeTeamName, awayTeamName },
  })
  if (!createRes.ok()) throw new Error(`createSpielbogen failed: ${createRes.status()} ${await createRes.text()}`)
  const bogen = await createRes.json()
  const bogenId = bogen.id as number
  // Label unused — date+team unique enough for now; keep variable for future
  void label

  for (const side of ['HOME', 'AWAY'] as const) {
    const slots = POSITIONS.map((position, i) => ({
      slot: i + 1,
      name: `${side === 'HOME' ? homeTeamName : awayTeamName}-${i + 1}`,
      position,
      battingOrder: i + 1,
    }))
    const res = await c.put(`/api/spielbogen/${bogenId}/lineup`, { data: { side, slots } })
    if (!res.ok()) throw new Error(`setLineup ${side} failed: ${res.status()} ${await res.text()}`)
  }

  const startRes = await c.post(`/api/spielbogen/${bogenId}/start`)
  if (!startRes.ok()) throw new Error(`start failed: ${startRes.status()} ${await startRes.text()}`)

  const sheetRes = await c.get(`/api/spielbogen/${bogenId}/sheet`)
  if (!sheetRes.ok()) throw new Error(`sheet failed: ${sheetRes.status()}`)
  const sheet = await sheetRes.json()
  const homeSlotIds: number[] = sheet.homeLineup.map((s: { id: number }) => s.id)
  const awaySlotIds: number[] = sheet.awayLineup.map((s: { id: number }) => s.id)

  return { bogenId, homeSlotIds, awaySlotIds }
}

export async function recordAtBat(
  bogenId: number,
  opts: {
    side: Side
    slotId: number
    inning: number
    result: AbResult
    outType?: OutType
    fielderChain?: number[]
    runsScored?: number
    rbi?: number
    baseStateAfter?: BaseStateAfter
  },
) {
  const c = await client()
  const body: Record<string, unknown> = {
    side: opts.side,
    slotId: opts.slotId,
    inning: opts.inning,
    result: opts.result,
    runsScored: opts.runsScored ?? 0,
    rbi: opts.rbi ?? 0,
  }
  if (opts.outType) body.outType = opts.outType
  if (opts.fielderChain) body.fielderChain = opts.fielderChain
  if (opts.baseStateAfter) body.baseStateAfter = opts.baseStateAfter
  const res = await c.post(`/api/spielbogen/${bogenId}/at-bats`, { data: body })
  if (!res.ok()) throw new Error(`recordAtBat failed: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function recordSteal(
  bogenId: number,
  opts: { side: Side; slotId: number; inning: number; type: StealType; fromBase: number; toBase: number },
) {
  const c = await client()
  const res = await c.post(`/api/spielbogen/${bogenId}/stealing-events`, { data: opts })
  if (!res.ok()) throw new Error(`recordSteal failed: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function getSheet(bogenId: number) {
  const c = await client()
  const res = await c.get(`/api/spielbogen/${bogenId}/sheet`)
  if (!res.ok()) throw new Error(`getSheet failed: ${res.status()}`)
  return res.json()
}

export async function endBogen(bogenId: number, homeRuns?: number, awayRuns?: number) {
  const c = await client()
  const body: Record<string, unknown> = {}
  if (homeRuns != null) body.homeRuns = homeRuns
  if (awayRuns != null) body.awayRuns = awayRuns
  const res = await c.post(`/api/spielbogen/${bogenId}/end`, { data: body })
  if (!res.ok()) throw new Error(`endBogen failed: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function deleteSpielbogen(bogenId: number) {
  const c = await client()
  const res = await c.delete(`/api/spielbogen/${bogenId}`)
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`deleteSpielbogen failed: ${res.status()} ${await res.text()}`)
  }
}

export function base(first?: number | null, second?: number | null, third?: number | null): BaseStateAfter {
  return { firstSlotId: first ?? null, secondSlotId: second ?? null, thirdSlotId: third ?? null }
}

export const emptyBase: BaseStateAfter = { firstSlotId: null, secondSlotId: null, thirdSlotId: null }
