import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type {
  GameDayResponse, LineupEntryResponse, MeResponse, Player,
  PlayerBattingStatsResponse, SeasonPlayerStats,
} from '@/types'

const auth = vi.hoisted(() => ({ me: null as MeResponse | null }))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({
    me: auth.me,
    istAdmin: auth.me === null,
    istSuperadmin: auth.me === null,
    darfScoren: auth.me === null,
  }),
}))

vi.mock('@/api/client', () => ({
  getSeasons: vi.fn(),
  getGameDays: vi.fn(),
  getLineup: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  getSeasonStats: vi.fn(),
  getPlayerUsage: vi.fn(),
}))

import * as api from '@/api/client'
import { PlayerDashboard } from './PlayerDashboard'

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>

const ICH: Player = { id: 7, name: 'Mia Meier', regular: true, defaultBattingOrder: null }
const ANDERE: Player = { id: 8, name: 'Tom Test', regular: true, defaultBattingOrder: null }
const DRITTER: Player = { id: 9, name: 'Uli Unter', regular: true, defaultBattingOrder: null }

const ME: MeResponse = {
  username: 'mia', role: 'PLAYER', playerId: 7, playerName: 'Mia Meier', mayScore: false, passwordChanged: true,
}

function gameDay(id: number, date: string, extra: Partial<GameDayResponse> = {}): GameDayResponse {
  return {
    id, date, label: 'Spieltag', location: 'Sportplatz Nord', seasonId: 1,
    availablePlayers: [ICH, ANDERE],
    games: [{
      id: id * 10, gameNumber: 1, opponentTeam: { id: 1, name: 'Berlin Bears', ownTeam: false },
      scoreUs: null, scoreThem: null, gameDayId: id, lineupEntryCount: 2,
    }],
    ...extra,
  }
}

function eintrag(player: Player, position: string | null, battingOrder: number, dh: Player | null = null): LineupEntryResponse {
  return { id: battingOrder, player, position, battingOrder, dhBatterPlayer: dh }
}

const ZAHLEN: PlayerBattingStatsResponse = {
  playerId: 7, playerName: 'Mia Meier', plateAppearances: 20, atBats: 18, hits: 9,
  singles: 6, doubles: 2, triples: 1, homeRuns: 0, runs: 4, walks: 2, hitByPitch: 0,
  strikeouts: 3, outs: 9, reachedOnError: 0, stolenBases: 0, caughtStealing: 0, pickoffs: 0,
  runsBattedIn: 5, totalBases: 13, battingAverage: 0.5, onBasePct: 0.55, sluggingPct: 0.72,
  ops: 1.27, qualified: true,
}

const ZUKUNFT = '2099-06-20'
const ZUKUNFT_2 = '2099-07-04'
const VERGANGEN = '2000-06-20'

function rendern() {
  return render(<MemoryRouter><PlayerDashboard /></MemoryRouter>)
}

describe('PlayerDashboard', () => {
  beforeEach(() => {
    auth.me = ME
    vi.clearAllMocks()
    mockApi.getSeasons.mockResolvedValue([{ id: 1, name: 'Saison 2099', year: 2099 }])
    mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT), gameDay(2, ZUKUNFT_2)])
    mockApi.getLineup.mockResolvedValue([eintrag(ICH, 'SS', 3), eintrag(ANDERE, 'P', 1)])
    mockApi.getSeasonBattingStats.mockResolvedValue([ZAHLEN])
    mockApi.getSeasonStats.mockResolvedValue([
      { playerId: 7, playerName: 'Mia Meier', totalGames: 12, positionCounts: {} } as SeasonPlayerStats,
    ])
  })

  it('zeigt das nächste Spiel', async () => {
    rendern()
    expect(await screen.findByText('Berlin Bears')).toBeInTheDocument()
    expect(screen.getByText(/Sportplatz Nord/)).toBeInTheDocument()
    expect(screen.getByText(/Nächster Spieltag/)).toBeInTheDocument()
  })

  it('sagt ob der Spieler aufgestellt ist, mit Position und Schlagplatz', async () => {
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    await waitFor(() => expect(within(block).getByText(/Du bist dabei/)).toBeInTheDocument())
    expect(within(block).getByText(/Shortstop|SS/)).toBeInTheDocument()
    expect(within(block).getByText(/Schlagplatz 3/)).toBeInTheDocument()
  })

  it('sagt dass er nicht aufgestellt ist, wenn er fehlt', async () => {
    mockApi.getLineup.mockResolvedValue([eintrag(ANDERE, 'P', 1), eintrag(DRITTER, 'C', 2)])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    await waitFor(() => expect(within(block).getByText(/Nicht aufgestellt/)).toBeInTheDocument())
  })

  it('sagt dass er nicht auf der Zusageliste steht und wie er dahin kommt', async () => {
    mockApi.getGameDays.mockResolvedValue([gameDay(1, ZUKUNFT, { availablePlayers: [ANDERE] })])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/nicht auf der Zusageliste/)).toBeInTheDocument()
    expect(within(block).getByText(/WhatsApp-Umfrage/)).toBeInTheDocument()
    // angezeigt, nicht gesetzt
    expect(within(block).queryByRole('button')).not.toBeInTheDocument()
  })

  it('sagt dass das Lineup noch fehlt und was dann passiert', async () => {
    mockApi.getLineup.mockResolvedValue([])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/noch keine Aufstellung/)).toBeInTheDocument()
    const lineup = screen.getByRole('region', { name: 'Lineup' })
    expect(within(lineup).getByText(/noch keine Aufstellung/)).toBeInTheDocument()
  })

  it('erkennt den Spieler als DH-Schlagmann', async () => {
    mockApi.getLineup.mockResolvedValue([eintrag(ANDERE, 'P', 1, ICH)])
    rendern()
    const block = await screen.findByRole('region', { name: 'Bin ich dabei' })
    expect(await within(block).findByText(/als DH/)).toBeInTheDocument()
  })

  it('zeigt das Lineup vollständig und ohne einen einzigen Bearbeiten-Knopf', async () => {
    mockApi.getLineup.mockResolvedValue([
      eintrag(ANDERE, 'P', 1), eintrag(ICH, 'SS', 2), eintrag(DRITTER, 'C', 3),
    ])
    rendern()
    const lineup = await screen.findByRole('region', { name: 'Lineup' })
    await waitFor(() => expect(within(lineup).getAllByRole('listitem')).toHaveLength(3))
    expect(within(lineup).getByText('Tom Test')).toBeInTheDocument()
    expect(within(lineup).getByText('Uli Unter')).toBeInTheDocument()

    // Weder im Lineup noch irgendwo auf der Seite: nichts, was bearbeitet
    expect(within(lineup).queryByRole('button')).not.toBeInTheDocument()
    expect(within(lineup).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/Lineup verwalten/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/bearbeiten/i)).not.toBeInTheDocument()
    expect(screen.queryByTitle(/Bearbeiten/i)).not.toBeInTheDocument()
    for (const a of screen.queryAllByRole('link')) {
      expect(a.getAttribute('href')).not.toMatch(/^\/gameday\//)
    }
  })

  it('wechselt zwischen den Spielen eines Spieltags', async () => {
    const zwei = gameDay(1, ZUKUNFT)
    zwei.games.push({ ...zwei.games[0], id: 11, gameNumber: 2, opponentTeam: { id: 2, name: 'Köln Kings', ownTeam: false } })
    mockApi.getGameDays.mockResolvedValue([zwei])
    mockApi.getLineup.mockImplementation((id: number) =>
      Promise.resolve(id === 11 ? [eintrag(DRITTER, 'C', 1)] : [eintrag(ANDERE, 'P', 1)]))
    rendern()
    const lineup = await screen.findByRole('region', { name: 'Lineup' })
    await waitFor(() => expect(within(lineup).getByText('Tom Test')).toBeInTheDocument())
    fireEvent.click(within(lineup).getByRole('button', { name: /Spiel 2/ }))
    expect(within(lineup).getByText('Uli Unter')).toBeInTheDocument()
    expect(within(lineup).queryByText('Tom Test')).not.toBeInTheDocument()
  })

  it('zeigt vier Kennzahlen: AVG, OBP, Spiele, Hits', async () => {
    rendern()
    const zahlen = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(zahlen).getByText('.500')).toBeInTheDocument())
    expect(within(zahlen).getByText('AVG')).toBeInTheDocument()
    expect(within(zahlen).getByText('.550')).toBeInTheDocument()
    expect(within(zahlen).getByText('OBP')).toBeInTheDocument()
    expect(within(zahlen).getByText('12')).toBeInTheDocument()
    expect(within(zahlen).getByText('Spiele')).toBeInTheDocument()
    expect(within(zahlen).getByText('9')).toBeInTheDocument()
    expect(within(zahlen).getByText('Hits')).toBeInTheDocument()
  })

  it('zeigt keine Trainingszahl', async () => {
    rendern()
    const zahlen = await screen.findByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(zahlen).getByText('.500')).toBeInTheDocument())
    expect(screen.queryByText(/Training/i)).not.toBeInTheDocument()
    expect(mockApi.getPlayerUsage).not.toHaveBeenCalled()
  })

  it('verlinkt ins volle Profil', async () => {
    rendern()
    const link = await screen.findByRole('link', { name: /Ganzes Profil/ })
    expect(link).toHaveAttribute('href', '/players/7')
  })

  it('erklärt leere Zahlen: noch nicht geschlagen und wann sie kommen', async () => {
    mockApi.getSeasonBattingStats.mockResolvedValue([])
    mockApi.getSeasonStats.mockResolvedValue([])
    rendern()
    const zahlen = await screen.findByRole('region', { name: 'Meine Zahlen' })
    expect(await within(zahlen).findByText(/noch nicht geschlagen/)).toBeInTheDocument()
    expect(within(zahlen).getByRole('link', { name: /Ganzes Profil/ })).toBeInTheDocument()
  })

  it('kommt ohne nächstes Spiel zurecht (Saisonende)', async () => {
    mockApi.getGameDays.mockResolvedValue([gameDay(3, VERGANGEN)])
    rendern()
    expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument()
    expect(mockApi.getLineup).not.toHaveBeenCalled()
    // Zahlen bleiben trotzdem da
    const zahlen = screen.getByRole('region', { name: 'Meine Zahlen' })
    await waitFor(() => expect(within(zahlen).getByText('.500')).toBeInTheDocument())
  })

  it('kommt ganz ohne Saison zurecht', async () => {
    mockApi.getSeasons.mockResolvedValue([])
    rendern()
    expect(await screen.findByText(/Kein Spiel angesetzt/)).toBeInTheDocument()
  })

  it('stürzt nicht, wenn me noch null ist, und sagt warum Persönliches fehlt', async () => {
    auth.me = null
    rendern()
    expect(await screen.findByText(/Dein Konto wird noch geladen/)).toBeInTheDocument()
    expect(await screen.findByText('Berlin Bears')).toBeInTheDocument()
  })

  it('sagt einem Konto ohne Spieler, was zu tun ist', async () => {
    auth.me = { ...ME, playerId: null, playerName: null }
    rendern()
    expect(await screen.findByText(/noch keinem Spieler zugeordnet/)).toBeInTheDocument()
    expect(mockApi.getSeasonBattingStats).not.toHaveBeenCalled()
  })

  it('listet die weiteren Spieltage unter „Was kommt"', async () => {
    rendern()
    const kommt = await screen.findByRole('region', { name: 'Was kommt' })
    expect(within(kommt).getByText(/04\.07\./)).toBeInTheDocument()
  })

  it('hat eine Werkzeug-Zeile mit Playmaker und Counter, je mindestens 44 px hoch', async () => {
    rendern()
    const playmaker = await screen.findByRole('link', { name: /Playmaker/ })
    const counter = screen.getByRole('link', { name: /Counter/ })
    expect(playmaker).toHaveAttribute('href', '/orga/playmaker')
    expect(counter).toHaveAttribute('href', '/counter')
    expect(playmaker.className).toMatch(/min-h-11/)
    expect(counter.className).toMatch(/min-h-11/)
  })
})
