import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { TeamDirectoryEntry } from '@/types'

const rolle = vi.hoisted(() => ({ istAdmin: true }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ me: null, istAdmin: rolle.istAdmin, istSuperadmin: rolle.istAdmin, darfScoren: rolle.istAdmin }),
}))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: vi.fn(), dismiss: vi.fn() }) }))
vi.mock('@/api/client', () => ({ renameTeamClub: vi.fn(), updateLeagueTeam: vi.fn(), deleteLeagueTeam: vi.fn() }))

import { ClubSheet } from './clubDirectoryShared'

const EINTRAG: TeamDirectoryEntry = {
  clubName: 'Berlin Flamingos',
  leagues: [{ teamId: 4, seasonId: 1, leagueName: 'Bundesliga', year: 2026 }],
  games: 2, wins: 1, losses: 1, ties: 0, runsFor: 9, runsAgainst: 8, battingAverage: null,
}

function zeige() {
  render(
    <MemoryRouter>
      <ClubSheet entry={EINTRAG} history={[]} allClubNames={['Berlin Flamingos']} onClose={() => {}} onChanged={() => {}} />
    </MemoryRouter>,
  )
}

describe('ClubSheet nach Rolle', () => {
  beforeEach(() => { rolle.istAdmin = true })

  it('zeigt einem Spieler Umbenennen, Umbenennen je Liga und Entfernen nicht, aber die Stats', () => {
    rolle.istAdmin = false
    zeige()
    expect(screen.getByText('Stats gegen sie')).toBeInTheDocument()
    expect(screen.queryByText('Umbenennen')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/umbenennen/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/entfernen/)).not.toBeInTheDocument()
  })

  it('gegenprobe: dieselbe Ansicht gibt einem Admin alle drei', () => {
    zeige()
    expect(screen.getByText('Umbenennen')).toBeInTheDocument()
    expect(screen.getByLabelText(/in Bundesliga umbenennen/)).toBeInTheDocument()
    expect(screen.getByLabelText(/aus Bundesliga entfernen/)).toBeInTheDocument()
  })
})
