import { describe, it, expect, vi, beforeEach } from 'vitest'

// jsPDF zeichnet in keinem Test-Browser; wir halten fest, WAS gezeichnet wird.
const texte: string[] = []
vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }
    text(t: string | string[]) { texte.push(Array.isArray(t) ? t.join(' ') : t) }
    getTextWidth() { return 10 }
    setFontSize() {}
    setFont() {}
    setTextColor() {}
    setDrawColor() {}
    setFillColor() {}
    setLineWidth() {}
    line() {}
    rect() {}
    addPage() {}
    setProperties() {}
    save() {}
  },
}))
vi.mock('jspdf-autotable', () => ({
  default: (doc: { lastAutoTable?: { finalY: number } }) => { doc.lastAutoTable = { finalY: 60 } },
}))

import { generatePdf, type GameData } from './pdfExport'
import type { GameDayResponse } from '@/types'

const spieler = (id: number, name: string) => ({ id, name }) as never

function spieltag(): GameDayResponse {
  return {
    id: 1, date: '2026-11-01', label: 'Spieltag', location: null,
    availablePlayers: [spieler(1, 'Anna Alt'), spieler(2, 'Bea Bank'), spieler(3, 'Cora Coach')],
  } as unknown as GameDayResponse
}

function spiel(over: Partial<GameData>): GameData {
  return {
    game: { id: 10, gameNumber: 1, opponentTeam: null, scoreUs: null, scoreThem: null },
    lineup: [], staff: [], substitutions: [],
    ...over,
  }
}

describe('generatePdf (Listenblatt)', () => {
  beforeEach(() => { texte.length = 0 })

  it('zeichnet den Coach-Satz auch ohne Aufstellung', () => {
    generatePdf(spieltag(), [spiel({ baseCoaches: { firstBase: 'Cora', thirdBase: null, startCoaches: [] } })], null)
    expect(texte).toContain('Kein Lineup')
    expect(texte).toContain('1B Cora')
  })

  it('nennt einen benannten Coach nicht zusätzlich in der Bank-Zeile', () => {
    const lineup = [{
      battingOrder: 1, position: 'P', player: spieler(1, 'Anna Alt'), dhBatterPlayer: null,
    }] as never
    generatePdf(spieltag(), [spiel({
      lineup,
      staff: [{ id: 1, role: 'FIRST_BASE_COACH', player: spieler(3, 'Cora Coach') }],
      baseCoaches: { firstBase: 'Cora', thirdBase: null, startCoaches: ['Uwe Unten'] },
    })], null)
    expect(texte.find(t => t.startsWith('Bank:'))).toBe('Bank: Bea Bank')
    expect(texte.some(t => t.startsWith('1B Cora'))).toBe(true)
  })
})
