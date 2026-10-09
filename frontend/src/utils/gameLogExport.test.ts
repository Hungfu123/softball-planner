import { describe, it, expect } from 'vitest'
import { gameLogJsonPayload } from './gameLogExport'
import type { TeamGameLogResponse } from '@/types'

const mkLog = (over: Partial<TeamGameLogResponse> = {}): TeamGameLogResponse => ({
	gameId: 1,
	date: '2026-09-27',
	opponent: 'Goose Ratingen',
	league: 'Ruhr Fun Liga',
	year: 2026,
	scoreUs: 11,
	scoreThem: 4,
	hasAtBatData: true,
	plateAppearances: 27,
	atBats: 24,
	hits: 13,
	doubles: 5,
	triples: 1,
	homeRuns: 0,
	walks: 3,
	strikeouts: 0,
	hitByPitch: 0,
	onBase: 16,
	leftOnBase: 4,
	stranded: [],
	innings: [],
	...over,
})

describe('gameLogExport — gameLogJsonPayload', () => {
	it('enthält Version, Filterkontext, Spiele, Slots und Vergleich', () => {
		const payload = gameLogJsonPayload({
			logs: [mkLog()],
			lineups: new Map(),
			slots: null,
			comparison: { beforeLabel: 'ältere 2 Spiele', afterLabel: 'neuere 2 Spiele', before: [], after: [] },
			contextLabel: 'TEST-Kontext',
			scopeLabel: '1 Spiel',
		})
		expect(payload.version).toBe(1)
		expect(typeof payload.exportedAt).toBe('string')
		expect(payload.filter).toEqual({ context: 'TEST-Kontext', scope: '1 Spiel' })
		expect(payload.games).toHaveLength(1)
		expect(payload.games[0].opponent).toBe('Goose Ratingen')
		expect(payload.games[0].score).toBe('11:4 (S)')
		expect(payload.games[0].evaluated).toBe(true)
		expect(payload.games[0].lineup).toBeNull()
		expect(payload.battingSlots).toBeNull()
		expect(payload.comparison).toEqual({ beforeLabel: 'ältere 2 Spiele', afterLabel: 'neuere 2 Spiele', before: [], after: [] })
	})

	it('setzt null-Werte bei fehlendem Ergebnis und ohne Lineups', () => {
		const payload = gameLogJsonPayload({
			logs: [mkLog({ scoreUs: null, scoreThem: null })],
			slots: null,
			comparison: null,
			contextLabel: '',
			scopeLabel: '',
		})
		expect(payload.games[0].score).toBeNull()
		expect(payload.games[0].lineup).toBeNull()
		expect('lineups' in payload).toBe(false)
	})
})
