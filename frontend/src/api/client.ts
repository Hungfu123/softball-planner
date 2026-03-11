const API = '/api'

function getAuthHeaders(): Record<string, string> {
  const creds = sessionStorage.getItem('auth')
  if (!creds) return {}
  return { Authorization: `Basic ${creds}` }
}

export function setAuth(password: string) {
  const creds = btoa(`admin:${password}`)
  sessionStorage.setItem('auth', creds)
}

export function clearAuth() {
  sessionStorage.removeItem('auth')
}

export function hasAuth(): boolean {
  return sessionStorage.getItem('auth') !== null
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Fehler ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

import type {
  Player,
  Season,
  GameDayResponse,
  GameResponse,
  LeagueTeamResponse,
  LineupEntryResponse,
  GameStaffResponse,
  GameDayPlayerStats,
  SeasonPlayerStats,
  StandingEntry,
  LeagueResultResponse,
  CarResponse
} from '@/types'

// Players
export const getPlayers = () => request<Player[]>('/players')
export const createPlayer = (name: string) =>
  request<Player>('/players', { method: 'POST', body: JSON.stringify({ name }) })
export const updatePlayer = (id: number, name: string) =>
  request<Player>(`/players/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
export const deletePlayer = (id: number) =>
  request<void>(`/players/${id}`, { method: 'DELETE' })

// Seasons
export const getSeasons = () => request<Season[]>('/seasons')
export const createSeason = (name: string, year: number) =>
  request<Season>('/seasons', { method: 'POST', body: JSON.stringify({ name, year }) })
export const updateSeason = (id: number, name: string, year: number) =>
  request<Season>(`/seasons/${id}`, { method: 'PUT', body: JSON.stringify({ name, year }) })
export const deleteSeason = (id: number) =>
  request<void>(`/seasons/${id}`, { method: 'DELETE' })
export const getSeasonStats = (id: number) =>
  request<SeasonPlayerStats[]>(`/seasons/${id}/stats`)
export const getStandings = (id: number) =>
  request<StandingEntry[]>(`/seasons/${id}/standings`)

// Game Days
export const getGameDays = (seasonId: number) =>
  request<GameDayResponse[]>(`/seasons/${seasonId}/gamedays`)
export const createGameDay = (seasonId: number, date: string, label?: string, location?: string) =>
  request<GameDayResponse>(`/seasons/${seasonId}/gamedays`, {
    method: 'POST',
    body: JSON.stringify({ date, label: label || null, location: location || null }),
  })
export const getGameDay = (id: number) =>
  request<GameDayResponse>(`/gamedays/${id}`)
export const updateGameDay = (id: number, data: { date?: string; label?: string | null; location?: string | null }) =>
  request<GameDayResponse>(`/gamedays/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const setAvailablePlayers = (gameDayId: number, playerIds: number[]) =>
  request<GameDayResponse>(`/gamedays/${gameDayId}/players`, {
    method: 'PUT',
    body: JSON.stringify({ playerIds }),
  })
export const getGameDayStats = (id: number) =>
  request<GameDayPlayerStats[]>(`/gamedays/${id}/stats`)
export const deleteGameDay = (id: number) =>
  request<void>(`/gamedays/${id}`, { method: 'DELETE' })

// Lineup
export const getLineup = (gameId: number) =>
  request<LineupEntryResponse[]>(`/games/${gameId}/lineup`)
export const setLineup = (
  gameId: number,
  entries: { playerId: number; position: string | null; battingOrder: number; dhBatterPlayerId: number | null }[],
) => request<LineupEntryResponse[]>(`/games/${gameId}/lineup`, {
  method: 'PUT',
  body: JSON.stringify(entries),
})

// League Teams
export const getLeagueTeams = (seasonId: number) =>
  request<LeagueTeamResponse[]>(`/seasons/${seasonId}/teams`)
export const createLeagueTeam = (seasonId: number, name: string) =>
  request<LeagueTeamResponse>(`/seasons/${seasonId}/teams`, { method: 'POST', body: JSON.stringify({ name }) })
export const deleteLeagueTeam = (teamId: number) =>
  request<void>(`/teams/${teamId}`, { method: 'DELETE' })

// League Results
export const getLeagueResults = (seasonId: number) =>
  request<LeagueResultResponse[]>(`/seasons/${seasonId}/results`)
export const createLeagueResult = (seasonId: number, data: { homeTeamId: number; awayTeamId: number; homeScore: number; awayScore: number; date?: string }) =>
  request<LeagueResultResponse>(`/seasons/${seasonId}/results`, { method: 'POST', body: JSON.stringify(data) })
export const deleteLeagueResult = (resultId: number) =>
  request<void>(`/results/${resultId}`, { method: 'DELETE' })

// Games
export const updateOpponent = (gameId: number, opponentTeamId: number | null) =>
  request<GameResponse>(`/games/${gameId}/opponent`, {
    method: 'PUT',
    body: JSON.stringify({ opponentTeamId }),
  })
export const updateScore = (gameId: number, scoreUs: number | null, scoreThem: number | null) =>
  request<GameResponse>(`/games/${gameId}/score`, {
    method: 'PUT',
    body: JSON.stringify({ scoreUs, scoreThem }),
  })
export const swapGames = (gameId1: number, gameId2: number) =>
  request<GameResponse[]>(`/games/${gameId1}/swap/${gameId2}`, { method: 'POST' })

// Staff
export const getStaff = (gameId: number) =>
  request<GameStaffResponse[]>(`/games/${gameId}/staff`)
export const setStaff = (
  gameId: number,
  staff: { playerId: number; role: string }[],
) => request<GameStaffResponse[]>(`/games/${gameId}/staff`, {
  method: 'PUT',
  body: JSON.stringify(staff),
})

// Cars
export const getCars = (gameDayId: number) =>
  request<CarResponse[]>(`/gamedays/${gameDayId}/cars`)
export const createCar = (gameDayId: number, data: { driverPlayerId: number; totalSeats: number; direction: string }) =>
  request<CarResponse>(`/gamedays/${gameDayId}/cars`, { method: 'POST', body: JSON.stringify(data) })
export const updateCar = (gameDayId: number, carId: number, data: { totalSeats?: number; direction?: string }) =>
  request<CarResponse>(`/gamedays/${gameDayId}/cars/${carId}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteCar = (carId: number) =>
  request<void>(`/cars/${carId}`, { method: 'DELETE' })
