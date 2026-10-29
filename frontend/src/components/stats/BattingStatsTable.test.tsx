import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { BattingStatsTable } from './BattingStatsTable'
import type { PlayerBattingStatsResponse } from '@/types'

function spieler(over: Partial<PlayerBattingStatsResponse> & { playerId: number; playerName: string }): PlayerBattingStatsResponse {
  return {
    atBats: 10, hits: 4, singles: 2, doubles: 1, triples: 0, homeRuns: 1,
    walks: 2, strikeouts: 3, hitByPitch: 0, runs: 3, runsBattedIn: 5,
    stolenBases: 1, caughtStealing: 0, pickoffs: 0,
    battingAverage: 0.4, onBasePct: 0.5, sluggingPct: 0.8, ops: 1.3,
    qualified: true,
    ...over,
  } as PlayerBattingStatsResponse
}

const KADER = [
  spieler({ playerId: 1, playerName: 'Yuki', battingAverage: 0.8, hits: 8, ops: 2.1 }),
  spieler({ playerId: 2, playerName: 'Khang', battingAverage: 0.3, hits: 3, ops: 0.7 }),
]

const kopfzeilen = () => screen.getAllByRole('columnheader').map(th => th.textContent)

describe('BattingStatsTable', () => {
  /*
   * Die Reihenfolge ist eine Aussage: auf dem Handy sieht man nur die ersten fuenf Spalten.
   * Stichprobe (AB, H) vor den Quoten, die vier Quoten zusammen, dann der Ertrag.
   */
  it('stellt die Spalten in der gedachten Lesefolge', () => {
    render(<BattingStatsTable stats={KADER} />)

    expect(kopfzeilen()).toEqual([
      'Spieler', 'AB', 'H', 'AVG', 'OBP', 'SLG', 'OPS',
      'RBI', 'R', 'HR', 'SB', 'BB', 'K', 'CS', 'PO', '1/2/3/HR',
    ])
  })

  it('schiebt die Pro-Spiel-Zahlen neben ihre Zaehlung', () => {
    render(<BattingStatsTable stats={KADER} showPerGame gamesByPlayerId={new Map([[1, 4], [2, 4]])} />)

    const kopf = kopfzeilen()
    expect(kopf[kopf.indexOf('RBI') + 1]).toBe('RBI/G')
    expect(kopf[kopf.indexOf('R') + 1]).toBe('R/G')
  })

  /*
   * Es gab eine Spalte „Quote", die `.824` noch einmal als `82 %` zeigte — und dafuer die
   * breiteste Stelle der Tabelle belegte. Der Balken ist geblieben, die zweite Zahl nicht.
   */
  it('zeigt keine zweite Spalte mit derselben Zahl wie AVG', () => {
    render(<BattingStatsTable stats={KADER} />)

    expect(kopfzeilen()).not.toContain('Quote')
    expect(screen.queryByText('80%')).not.toBeInTheDocument()
  })

  /* Nichts wird mehr zugeklappt: OBP, SLG und OPS sind die Zahlen, nach denen eine
     Schlagreihenfolge gebaut wird, und standen hinter einem Aufklapper. */
  it('zeigt OBP, SLG und OPS ohne einen Knopf dafuer', () => {
    render(<BattingStatsTable stats={KADER} />)

    expect(screen.queryByRole('button', { name: /Mehr Details/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Weniger/i })).not.toBeInTheDocument()
    expect(screen.getByText('2.100')).toBeInTheDocument()
  })

  it('steckt den Rang in die Spielerzelle statt in eine eigene Spalte', () => {
    render(<BattingStatsTable stats={KADER} />)

    expect(kopfzeilen()[0]).toBe('Spieler')
    const zweite = screen.getByText('Khang').closest('td')!
    expect(within(zweite).getByText('2')).toBeInTheDocument()
  })

  it('sortiert nach Klick auf eine Spalte und merkt sich die Richtung', () => {
    render(<BattingStatsTable stats={KADER} />)
    const namen = () => screen.getAllByRole('row').slice(1).map(r => r.querySelector('td')!.textContent)

    // Vorgabe ist AVG absteigend — Yuki (.800) vor Khang (.300).
    expect(namen()[0]).toContain('Yuki')
    fireEvent.click(screen.getByRole('columnheader', { name: 'Spieler' }))
    expect(namen()[0]).toContain('Khang')
    fireEvent.click(screen.getByRole('columnheader', { name: 'Spieler' }))
    expect(namen()[0]).toContain('Yuki')
  })

  it('haelt Spieler unter 5 ABs zurueck, bis jemand sie sehen will', () => {
    const mitWenig = [...KADER, spieler({ playerId: 3, playerName: 'Neu', atBats: 2, qualified: false })]
    render(<BattingStatsTable stats={mitWenig} applyQualifier />)

    expect(screen.queryByText('Neu')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Auch <5 ABs/ }))
    expect(screen.getByText('Neu')).toBeInTheDocument()
  })

  /*
   * Der Weg zum Glossar liegt UNTER der Tabelle, nicht nur als graues „i" in der Kopfzeile:
   * wer bei OBP stockt, sucht nicht eine Bildschirmhoehe weiter oben.
   */
  it('bietet das Glossar unter der Tabelle an, auch ohne Qualifier', () => {
    const oeffnen = vi.fn()
    render(<BattingStatsTable stats={KADER} onOpenGlossary={oeffnen} />)

    fireEvent.click(screen.getByRole('button', { name: /AB, OBP, OPS/ }))
    expect(oeffnen).toHaveBeenCalledOnce()
  })

  it('haelt den Namen beim Querscrollen fest', () => {
    render(<BattingStatsTable stats={KADER} />)

    const zelle = screen.getByText('Khang').closest('td')!
    expect(zelle.className).toContain('sticky')
    expect(zelle.className).toContain('left-0')
    // Deckender Hintergrund: sonst scheinen die Zahlen beim Scrollen durch den Namen.
    expect(zelle.className).toMatch(/bg-cream-(50|100)/)
  })

  it('sagt es, wenn im Zeitraum gar nichts geschlagen wurde', () => {
    render(<BattingStatsTable stats={[]} />)

    expect(screen.getByText(/Noch keine Schlag-Daten/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
