import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const toast = { show: vi.fn(), dismiss: vi.fn() }
const rolle = vi.hoisted(() => ({ istAdmin: true }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ me: null, istAdmin: rolle.istAdmin, istSuperadmin: rolle.istAdmin, darfScoren: rolle.istAdmin }),
}))

vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => toast }))

vi.mock('@/api/client', () => ({
  getPlayer: vi.fn(),
  getPlayerBattingTimeline: vi.fn(),
  getPlayerUsage: vi.fn(),
  getAllTimeStats: vi.fn(),
  getAllTimeBattingStats: vi.fn(),
  getYearStats: vi.fn(),
  getYearBattingStats: vi.fn(),
  getSeasonStats: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  updatePlayer: vi.fn(),
  updatePlayerPositions: vi.fn(),
  archivePlayer: vi.fn(),
  unarchivePlayer: vi.fn(),
}))

import * as api from '@/api/client'
import { PlayerProfilePage } from './PlayerProfilePage'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

const PLAYER = {
  id: 1, name: 'Mia', regular: true, archived: false,
  primaryPosition: 'SS', secondaryPosition: null, tertiaryPosition: null,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/players/1']}>
      <Routes>
        <Route path="/players/:id" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function openMenu() {
  await waitFor(() => expect(screen.getByLabelText('Weitere Aktionen')).toBeInTheDocument())
  fireEvent.click(screen.getByLabelText('Weitere Aktionen'))
}

describe('PlayerProfilePage — Kopf-Menü', () => {
  beforeEach(() => {
    rolle.istAdmin = true
    vi.clearAllMocks()
    mockApi.getPlayer.mockResolvedValue(PLAYER)
    mockApi.getPlayerBattingTimeline.mockResolvedValue([])
    mockApi.getPlayerUsage.mockResolvedValue(null)
    mockApi.getAllTimeStats.mockResolvedValue([])
    mockApi.getAllTimeBattingStats.mockResolvedValue([])
    mockApi.archivePlayer.mockResolvedValue({ ...PLAYER, archived: true })
    mockApi.unarchivePlayer.mockResolvedValue(PLAYER)
    mockApi.updatePlayer.mockResolvedValue({ ...PLAYER, name: 'Mia B.' })
  })

  it('zeigt nur einen Stift im Kopf — der gehört den Positionen', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Positions-Profil bearbeiten')).toBeInTheDocument())
    expect(screen.queryByLabelText('Name ändern')).not.toBeInTheDocument()
  })

  it('startet das Umbenennen aus dem Menü', async () => {
    renderPage()
    await openMenu()

    fireEvent.click(screen.getByText('Umbenennen'))

    const input = screen.getByLabelText('Name ändern')
    fireEvent.change(input, { target: { value: 'Mia B.' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(mockApi.updatePlayer).toHaveBeenCalledWith(1, { name: 'Mia B.' }))
  })

  it('archiviert aus dem Menü und sagt, was das heißt', async () => {
    renderPage()
    await openMenu()

    expect(screen.getByText(/Raus aus Lineups und Statistik/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Archivieren'))

    await waitFor(() => expect(mockApi.archivePlayer).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.getByText('archiviert')).toBeInTheDocument())
  })

  it('bietet danach das Reaktivieren an', async () => {
    mockApi.getPlayer.mockResolvedValue({ ...PLAYER, archived: true })
    renderPage()
    await openMenu()

    fireEvent.click(screen.getByText('Reaktivieren'))

    await waitFor(() => expect(mockApi.unarchivePlayer).toHaveBeenCalledWith(1))
  })

  it('schließt das Menü bei Escape', async () => {
    renderPage()
    await openMenu()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByText('Umbenennen')).not.toBeInTheDocument())
  })
})

describe('PlayerProfilePage — als Spieler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.getPlayer.mockResolvedValue(PLAYER)
    mockApi.getPlayerBattingTimeline.mockResolvedValue([])
    mockApi.getPlayerUsage.mockResolvedValue(null)
    mockApi.getAllTimeStats.mockResolvedValue([])
    mockApi.getAllTimeBattingStats.mockResolvedValue([])
  })

  it('zeigt Name, aber nichts zum Ändern: kein Positions-Profil-Stift, kein Geschlecht, kein Menü', async () => {
    rolle.istAdmin = false
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mia' })).toBeInTheDocument())
    expect(screen.queryByLabelText('Positions-Profil bearbeiten')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Geschlecht/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Weitere Aktionen')).not.toBeInTheDocument()
  })

  it('führt zurück zum Start statt zum Kader, den ein Spieler nicht sieht', async () => {
    rolle.istAdmin = false
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mia' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Kader' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('gegenprobe: derselbe Spieler-Datensatz bietet einem Admin alle drei', async () => {
    rolle.istAdmin = true
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Positions-Profil bearbeiten')).toBeInTheDocument())
    expect(screen.getByLabelText(/Geschlecht/)).toBeInTheDocument()
    expect(screen.getByLabelText('Weitere Aktionen')).toBeInTheDocument()
  })
})
