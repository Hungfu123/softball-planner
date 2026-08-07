import { describe, it, expect } from 'vitest'
import { buildFeed, halfInningId, teamAbbreviation } from './bogenFeed'
import type { SpielbogenAtBatResponse, SpielbogenSlotResponse, SpielbogenStealingResponse } from '@/types'

const slot = (id: number, name: string): SpielbogenSlotResponse => ({
  id, side: 'HOME', slot: id, name, position: '2B', battingOrder: id,
})

const ab = (o: Partial<SpielbogenAtBatResponse>): SpielbogenAtBatResponse => ({
  id: 1, bogenId: 1, slotId: 1, side: 'HOME', sequence: 1, inning: 1,
  result: 'OUT', outType: null, sacrificeType: null, fielderChain: null,
  isError: false, errorPosition: null, runsScored: 0, rbi: 0,
  baseStateAfter: null, createdAt: '2026-08-06T10:00:00Z', runnerAdvances: [],
  ...o,
} as SpielbogenAtBatResponse)

const base = {
  homeLineup: [slot(1, 'Ylvi')],
  awayLineup: [{ ...slot(9, 'Weber'), side: 'AWAY' as const }],
  homeAtBats: [],
  awayAtBats: [],
  stealingEvents: [],
  substitutions: [],
  inningRuns: {},
}

describe('buildFeed — At-Bat-Zeilen', () => {
  it('nennt Treffer beim deutschen Namen', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'DOUBLE' })] })
    expect(feed[0].events[0].what).toBe('Double')
  })

  it('setzt Grounder mit Fielder-Kette', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'GROUNDER', fielderChain: [6, 3] })] })
    expect(feed[0].events[0].what).toBe('Grounder 6-3')
  })

  it('setzt Fly mit Position', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'FLY', fielderChain: [9] })] })
    expect(feed[0].events[0].what).toBe('Fly F9')
  })

  it('setzt Double Play mit voller Kette', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'DOUBLE_PLAY', fielderChain: [6, 4, 3] })] })
    expect(feed[0].events[0].what).toBe('Double Play 6-4-3')
  })

  it('nennt Sacrifice beim Namen', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'OUT', outType: 'FLY', sacrificeType: 'FLY', fielderChain: [8] })] })
    expect(feed[0].events[0].what).toBe('Sac Fly')
  })

  it('nennt automatisches Out beim deutschen Namen', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'AUTOMATIC_OUT' })] })
    expect(feed[0].events[0].what).toBe('Automatisches Out')
  })

  it('nennt Error mit Position', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'REACHED_ON_ERROR', isError: true, errorPosition: 5 })] })
    expect(feed[0].events[0].what).toBe('Reached on Error')
    expect(feed[0].events[0].rbi).toBe(0)
  })

  it('markiert Runs und trägt die RBI', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'SINGLE', runsScored: 2, rbi: 2 })] })
    expect(feed[0].events[0].scored).toBe(true)
    expect(feed[0].events[0].rbi).toBe(2)
  })

  it('markiert nichts, wenn kein Run fiel', () => {
    const feed = buildFeed({ ...base, homeAtBats: [ab({ result: 'SINGLE', runsScored: 0, rbi: 0 })] })
    expect(feed[0].events[0].scored).toBe(false)
  })
})

describe('buildFeed — Steals', () => {
  const steal = (type: string, toBase: number): SpielbogenStealingResponse => ({
    id: 1, bogenId: 1, slotId: 1, side: 'HOME', inning: 1,
    type, fromBase: toBase - 1, toBase, createdAt: '2026-08-06T10:01:00Z',
  } as SpielbogenStealingResponse)

  it.each([
    ['STOLEN_BASE', 2, 'stiehlt 2nd'],
    ['STOLEN_BASE', 3, 'stiehlt 3rd'],
    ['STOLEN_BASE', 4, 'stiehlt Home'],
    ['CAUGHT_STEALING', 2, 'beim Klau gefangen'],
    ['OUT_ON_PLAY', 3, 'Aus beim Vorrücken'],
    ['WILD_PITCH', 2, 'Wild Pitch'],
    ['PASSED_BALL', 2, 'Passed Ball'],
  ])('%s → %s', (type, toBase, expected) => {
    const feed = buildFeed({ ...base, stealingEvents: [steal(type, toBase)] })
    expect(feed[0].events[0].what).toBe(expected)
  })

  it('Steal auf eine Vorbase bleibt Minor-Notiz, kein Run', () => {
    const feed = buildFeed({ ...base, stealingEvents: [steal('STOLEN_BASE', 2)] })
    expect(feed[0].events[0].scored).toBe(false)
    expect(feed[0].events[0].minor).toBe(true)
  })

  it.each([
    ['STOLEN_BASE'],
    ['WILD_PITCH'],
    ['PASSED_BALL'],
  ])('%s bis Home ist ein Run — amber statt grauer Notiz, wie der Backend-Score ihn zählt', (type) => {
    const feed = buildFeed({ ...base, stealingEvents: [steal(type, 4)] })
    expect(feed[0].events[0].scored).toBe(true)
    expect(feed[0].events[0].minor).toBe(false)
  })

  it.each([
    ['CAUGHT_STEALING'],
    ['OUT_ON_PLAY'],
  ])('%s bei Home ist ein Out, kein Run — bleibt Minor-Notiz', (type) => {
    const feed = buildFeed({ ...base, stealingEvents: [steal(type, 4)] })
    expect(feed[0].events[0].scored).toBe(false)
    expect(feed[0].events[0].minor).toBe(true)
  })
})

describe('teamAbbreviation', () => {
  it('nimmt bei einem Einwort-Namen die ersten drei Buchstaben', () => {
    expect(teamAbbreviation('Allstar')).toBe('ALL')
  })

  it('nimmt bei Mehrwort-Namen das letzte Wort — meist der eigentliche Teamname', () => {
    expect(teamAbbreviation('Köln Abbots')).toBe('ABB')
  })

  it('ignoriert mehrfache Leerzeichen', () => {
    expect(teamAbbreviation('Dead   Sox')).toBe('SOX')
  })
})

describe('buildFeed — Reihenfolge und Gruppierung', () => {
  it('mischt gemischte Typen innerhalb einer Gruppe chronologisch, ältestes zuerst', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, result: 'STRIKEOUT', createdAt: '2026-08-06T10:02:00Z' }),
      ],
      stealingEvents: [{
        id: 1, bogenId: 1, slotId: 1, side: 'HOME', inning: 1,
        type: 'STOLEN_BASE', fromBase: 1, toBase: 2, createdAt: '2026-08-06T10:01:00Z',
      } as SpielbogenStealingResponse],
    })

    expect(feed[0].events.map(e => e.what)).toEqual(['Single', 'stiehlt 2nd', 'Strikeout'])
  })

  it('sortiert numerisch statt lexikalisch, damit Sekundenbruchteile nicht die Reihenfolge kippen', () => {
    // Jackson serialisiert Instant ohne Bruchteil, wenn er exakt null ist — lexikalisch
    // sortiert "." vor "Z", also müsste "10:00:00.500Z" fälschlich VOR "10:00:00Z" landen,
    // obwohl es chronologisch danach kommt.
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, result: 'STRIKEOUT', createdAt: '2026-08-06T10:00:00.500Z' }),
      ],
    })

    expect(feed[0].events.map(e => e.what)).toEqual(['Single', 'Strikeout'])
  })

  it('liest sich innerhalb einer Gruppe wie das Inning selbst — erster Batter oben', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, result: 'DOUBLE', createdAt: '2026-08-06T10:05:00Z' }),
        ab({ id: 3, result: 'STRIKEOUT', createdAt: '2026-08-06T10:10:00Z' }),
      ],
    })

    expect(feed[0].events.map(e => e.what)).toEqual(['Single', 'Double', 'Strikeout'])
  })

  it('gruppiert nach Halbinning, neueste Gruppe oben', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, inning: 1, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, inning: 3, result: 'DOUBLE', createdAt: '2026-08-06T10:20:00Z' }),
      ],
    })

    expect(feed.map(h => h.inning)).toEqual([3, 1])
  })

  it('trennt Halbinnings derselben Inning-Nummer nach Seite', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [ab({ id: 1, inning: 2, side: 'HOME', createdAt: '2026-08-06T10:10:00Z' })],
      awayAtBats: [ab({ id: 2, inning: 2, side: 'AWAY', slotId: 9, createdAt: '2026-08-06T10:05:00Z' })],
    })

    expect(feed).toHaveLength(2)
    expect(feed[0].side).toBe('HOME')
    expect(feed[1].side).toBe('AWAY')
  })

  it('liefert den Zwischenstand nach jeder Halbinning', () => {
    const feed = buildFeed({
      ...base,
      homeAtBats: [
        ab({ id: 1, inning: 1, result: 'SINGLE', runsScored: 1, createdAt: '2026-08-06T10:00:00Z' }),
        ab({ id: 2, inning: 2, result: 'SINGLE', runsScored: 2, createdAt: '2026-08-06T10:10:00Z' }),
      ],
      inningRuns: { 1: { home: 1, away: 0 }, 2: { home: 2, away: 0 } },
    })

    expect(feed[0].scoreAfter).toEqual({ home: 3, away: 0 })
    expect(feed[1].scoreAfter).toEqual({ home: 1, away: 0 })
  })

  it('Away-Gruppe schließt Home-Runs derselben Inning aus, Home-Gruppe schließt sie ein', () => {
    // Top of inning 1 (AWAY) ist vorbei, bevor Bottom of inning 1 (HOME) gespielt wird —
    // der Zwischenstand nach der AWAY-Halbinning darf die Home-Runs derselben Inning
    // noch nicht zeigen, obwohl inningRuns[1] sie schon als fertige Inning-Summe führt.
    const feed = buildFeed({
      ...base,
      homeAtBats: [ab({ id: 1, inning: 1, side: 'HOME', result: 'SINGLE', createdAt: '2026-08-06T10:05:00Z' })],
      awayAtBats: [ab({ id: 2, inning: 1, side: 'AWAY', slotId: 9, result: 'SINGLE', createdAt: '2026-08-06T10:00:00Z' })],
      inningRuns: { 1: { home: 3, away: 2 } },
    })

    const home = feed.find(h => h.side === 'HOME')!
    const away = feed.find(h => h.side === 'AWAY')!
    expect(away.scoreAfter).toEqual({ home: 0, away: 2 })
    expect(home.scoreAfter).toEqual({ home: 3, away: 2 })
  })

  it('Away-Zwischenstand berücksichtigt nur die bereits gespielten Home-Halbinnings', () => {
    const feed = buildFeed({
      ...base,
      awayAtBats: [ab({ id: 1, inning: 2, side: 'AWAY', slotId: 9, createdAt: '2026-08-06T10:10:00Z' })],
      inningRuns: { 1: { home: 1, away: 0 }, 2: { home: 5, away: 3 } },
    })

    expect(feed[0].scoreAfter).toEqual({ home: 1, away: 3 })
  })

  it('gibt bei leerem Spiel eine leere Liste', () => {
    expect(buildFeed(base)).toEqual([])
  })
})

describe('halfInningId', () => {
  it('ist je Halbinning eindeutig', () => {
    expect(halfInningId(3, 'HOME')).not.toBe(halfInningId(3, 'AWAY'))
    expect(halfInningId(3, 'HOME')).toBe(halfInningId(3, 'HOME'))
  })
})
