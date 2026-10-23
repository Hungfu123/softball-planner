import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameDayResponse } from '@/types'

const rolle = vi.hoisted(() => ({ istAdmin: false, darfScoren: false }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ me: null, istAdmin: rolle.istAdmin, istSuperadmin: rolle.istAdmin, darfScoren: rolle.darfScoren }),
}))

import { HeroNextGameDay } from './HeroNextGameDay'

const SPIELTAG: GameDayResponse = {
  id: 4, date: '2099-10-25', label: null, location: null, seasonId: 1, availablePlayers: [],
  games: [{
    id: 10, gameNumber: 1, opponentTeam: { id: 1, name: 'Berlin Bears', ownTeam: false },
    scoreUs: null, scoreThem: null, gameDayId: 4, lineupEntryCount: 9,
  }],
}

function zeile(): HTMLElement {
  // Zeile = Elternteil der Fläche mit dem Gegnernamen (Link oder Div), drei Ebenen höher liegt der Rahmen.
  const name = screen.getByText('Berlin Bears')
  const zeile = name.closest('div.rounded-lg.border')
  if (!zeile) throw new Error('Zeile nicht gefunden')
  return zeile as HTMLElement
}

function rendern() {
  return render(<MemoryRouter><HeroNextGameDay gameDay={SPIELTAG} variant="upcoming" /></MemoryRouter>)
}

describe('HeroNextGameDay — was sich anfassen lässt', () => {
  beforeEach(() => { rolle.istAdmin = false; rolle.darfScoren = false })

  it('Spieler ohne Recht: weder Link noch Hover an der Zeile', () => {
    rendern()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(zeile().className).not.toMatch(/hover:/)
  })

  it('Scorer ohne Admin-Recht: nur die Scoring-Fläche ist ein Link, die Zeile hebt sich nicht an', () => {
    rolle.darfScoren = true
    rendern()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/gameday/4/scoring/0')
    expect(zeile().className).not.toMatch(/hover:/)
    // Die Fläche trägt ihren eigenen Hover und ist mindestens 44 px hoch.
    expect(links[0].className).toMatch(/hover:bg-white\/10/)
    expect(links[0].className).toMatch(/min-h-11/)
  })

  it('Admin: ganze Zeile hebt sich an, beide Links da', () => {
    rolle.istAdmin = true
    rolle.darfScoren = true
    rendern()
    expect(screen.getAllByRole('link').map(l => l.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/gameday/4?game=0', '/gameday/4/scoring/0']),
    )
    expect(zeile().className).toMatch(/hover:/)
  })
})
