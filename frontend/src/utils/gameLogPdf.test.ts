import { describe, it, expect } from 'vitest'
import {
	AGG_TABLE_WIDTH,
	COMPARISON_TABLE_WIDTH,
	formatSignedDiff,
	INNING_TABLE_WIDTH,
	inningChainText,
	KPI_TABLE_WIDTH,
	lineupText,
	OVERVIEW_TABLE_WIDTH,
	RESULT_SHORT,
	resultLetter,
	SLOT_TABLE_WIDTH,
} from './gameLogPdf'
import { PAGE_CONTENT_WIDTH } from './statsPdf'
import type { AtBatResult, InningLog, LineupEntryResponse, TeamGameLogResponse } from '@/types'

describe('gameLogPdf — Tabellenbreiten', () => {
	// Regressionsschutz wie bei statsPdf: Spaltenbreiten kommen aus einer Quelle,
	// keine Tabelle darf über den Seitenrand ragen oder halbleer wirken.
	const tables: [string, number][] = [
		['Kennzahlen', KPI_TABLE_WIDTH],
		['Spiele-Übersicht', OVERVIEW_TABLE_WIDTH],
		['Lineup-Plätze', SLOT_TABLE_WIDTH],
		['Inning-Details', INNING_TABLE_WIDTH],
		['Aggregate', AGG_TABLE_WIDTH],
		['Vorher/Nachher-Vergleich', COMPARISON_TABLE_WIDTH],
	]

	it.each(tables)('%s passt in die Seitenbreite', (_name, width) => {
		expect(width).toBeLessThanOrEqual(PAGE_CONTENT_WIDTH)
	})

	it.each(tables)('%s nutzt die Seitenbreite aus — keine halbleere Tabelle', (_name, width) => {
		expect(width).toBeGreaterThan(PAGE_CONTENT_WIDTH * 0.9)
	})
})

describe('gameLogPdf — Schlagfolge-Text', () => {
	const mkInning = (atBats: InningLog['atBats']): InningLog => ({
		inning: 1,
		runs: 0,
		hits: 0,
		onBase: 0,
		walks: 0,
		outs: 0,
		stranded: [],
		outMaker: null,
		hitsByPlayer: {},
		atBats,
	})

	it('formatiert die Kette mit Kürzeln und Runs', () => {
		const inn = mkInning([
			{ batter: 'Khang', result: 'WALK', runsScored: 0 },
			{ batter: 'Anne', result: 'SINGLE', runsScored: 1 },
			{ batter: 'Hung', result: 'OUT', runsScored: 0 },
		])
		expect(inningChainText(inn)).toBe('Khang BB > Anne 1B+1 > Hung Out')
	})

	it('liefert leeren String ohne At-Bats', () => {
		expect(inningChainText(mkInning([]))).toBe('')
	})

	it('kennt für jedes AtBatResult ein Kürzel', () => {
		const results: AtBatResult[] = [
			'SINGLE', 'DOUBLE', 'TRIPLE', 'HOMERUN', 'INSIDE_PARK_HR',
			'WALK', 'HIT_BY_PITCH', 'STRIKEOUT', 'OUT', 'REACHED_ON_ERROR', 'AUTOMATIC_OUT',
		]
		for (const r of results) {
			expect(RESULT_SHORT[r]).toBeTruthy()
		}
	})
})

describe('gameLogPdf — Ergebnis-Kürzel', () => {
	const mkLog = (scoreUs: number | null, scoreThem: number | null): TeamGameLogResponse => ({
		gameId: 1,
		date: null,
		opponent: null,
		league: null,
		year: null,
		scoreUs,
		scoreThem,
		hasAtBatData: false,
		plateAppearances: 0,
		atBats: 0,
		hits: 0,
		doubles: 0,
		triples: 0,
		homeRuns: 0,
		walks: 0,
		strikeouts: 0,
		hitByPitch: 0,
		onBase: 0,
		leftOnBase: 0,
		stranded: [],
		innings: [],
	})

	it('S bei Sieg, N bei Niederlage, U bei Unentschieden, – ohne Ergebnis', () => {
		expect(resultLetter(mkLog(11, 4))).toBe('S')
		expect(resultLetter(mkLog(4, 11))).toBe('N')
		expect(resultLetter(mkLog(7, 7))).toBe('U')
		expect(resultLetter(mkLog(null, null))).toBe('–')
		expect(resultLetter(mkLog(5, null))).toBe('–')
	})
})

describe('gameLogPdf — Vorzeichen-Differenz', () => {
	it('formatiert positive, negative und ausgeglichene Deltas', () => {
		expect(formatSignedDiff(0, 0.250)).toBe('+.250')
		expect(formatSignedDiff(0.250, 0)).toBe('-.250')
		expect(formatSignedDiff(0.5, 0.5)).toBe('±.000')
	})
})

describe('gameLogPdf — Lineup-Text', () => {
	const entry = (order: number, name: string, position: string | null, dhName?: string): LineupEntryResponse => ({
		id: order,
		player: { id: order, name, regular: true, defaultBattingOrder: null },
		position,
		battingOrder: order,
		dhBatterPlayer: dhName ? { id: 100 + order, name: dhName, regular: false, defaultBattingOrder: null } : null,
	})

	it('sortiert nach Schlagreihenfolge mit Position und DH-Notation', () => {
		const text = lineupText([
			entry(3, 'Hung', null),
			entry(1, 'Khang', 'P', 'Max'),
			entry(2, 'Anne', 'SS'),
		])
		expect(text).toBe('1. Khang (P) [DH: Max] · 2. Anne (SS) · 3. Hung')
	})

	it('liefert null bei fehlender oder leerer Aufstellung', () => {
		expect(lineupText(undefined)).toBeNull()
		expect(lineupText([])).toBeNull()
	})
})
