export interface Player {
  id: number
  name: string
  regular: boolean
}

export interface Season {
  id: number
  name: string
  year: number
}

export interface GameDayResponse {
  id: number
  date: string
  label: string | null
  location: string | null
  seasonId: number
  availablePlayers: Player[]
  games: GameResponse[]
}

export interface LeagueTeamResponse {
  id: number
  name: string
  ownTeam: boolean
}

export interface GameResponse {
  id: number
  gameNumber: number
  opponentTeam: LeagueTeamResponse | null
  scoreUs: number | null
  scoreThem: number | null
  gameDayId: number
  lineupEntryCount: number
}

export interface LineupEntryResponse {
  id: number
  player: Player
  position: string | null
  battingOrder: number
  dhBatterPlayer: Player | null
}

export interface GameStaffResponse {
  id: number
  player: Player
  role: string
}

export interface GameDayLineupsResponse {
  lineups: Record<string, LineupEntryResponse[]>
  staff: Record<string, GameStaffResponse[]>
}

export interface GameDayPlayerStats {
  playerId: number
  playerName: string
  gameCount: number
  positions: { gameNumber: number; position: string }[]
}

export interface SeasonPlayerStats {
  playerId: number
  playerName: string
  totalGames: number
  positionCounts: Record<string, number>
}

export interface LocalLineupEntry {
  player: Player
  position: string | null
  dhBatterId: number | null
  dhBatterName: string | null
}

export const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH'] as const

export const FIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const

export const STAFF_ROLES = {
  BASE_COACH_1ST: '1st Base Coach',
  BASE_COACH_3RD: '3rd Base Coach',
} as const

// Lineup Suggestions
export interface LineupSuggestionEntry {
  playerId: number
  playerName: string
  position: string
  battingOrder: number
}

export interface SuggestAllLineupsResponse {
  oldLineups: Record<string, LineupEntryResponse[]>
  newLineups: Record<string, LineupSuggestionEntry[]>
}

// Carpool
export interface CarResponse {
  id: number
  driver: Player
  totalSeats: number
  direction: 'both' | 'there' | 'back'
  gameDayId: number
}

export interface StandingEntry {
  team: LeagueTeamResponse
  games: number
  wins: number
  losses: number
  ties: number
  winPct: number
  runsScored: number
  runsAgainst: number
  runDiff: number
}

export interface LeagueResultResponse {
  id: number
  homeTeam: LeagueTeamResponse
  awayTeam: LeagueTeamResponse
  homeScore: number
  awayScore: number
  date: string | null
}

export const DIRECTION_LABELS = {
  both: 'Hin & zurück',
  there: 'Nur Hinweg',
  back: 'Nur Rückweg',
} as const

// Training
export interface TrainingPeriodResponse {
  id: number
  name: string
  startDate: string
  endDate: string
}

export type TrainingType = 'REGULAR' | 'PITCHER_CATCHER'

export interface TrainingResponse {
  id: number
  date: string
  time: string | null
  location: string | null
  cancelled: boolean
  attendeeCount: number
  periodId: number | null
  type: TrainingType
}

export interface TrainingAttendanceResponse {
  player: Player
  present: boolean
}

export interface TrainingStatsResponse {
  playerId: number
  playerName: string
  attended: number
  totalTrainings: number
  regular: boolean
}
