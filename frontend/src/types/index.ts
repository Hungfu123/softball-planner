export interface Player {
  id: number
  name: string
  regular: boolean
  defaultBattingOrder: number | null
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
  substitutions: Record<string, SubstitutionResponse[]>
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

export interface SubstitutionResponse {
  id: number
  playerOut: Player
  playerIn: Player
  inning: number
}

export interface LocalSubstitution {
  playerOut: Player
  playerIn: Player
  inning: number
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

// Drills & Training Plans
export type DrillCategory =
  | 'WARMUP' | 'CONDITIONING' | 'THROWING' | 'BASERUNNING'
  | 'CATCHER' | 'FIRST_BASE' | 'SECOND_BASE' | 'SS' | 'THIRD_BASE'
  | 'OUTFIELD' | 'SITUATIONAL' | 'HITTING' | 'FIELDING' | 'RELAY'
  | 'DOUBLE_PLAY' | 'BUNT_DEFENSE' | 'COMINGS' | 'PITCHER'

export type TrainingFocus =
  | 'WERFEN' | 'INFIELD_DEFENSE' | 'OUTFIELD' | 'BASERUNNING' | 'SITUATIONAL' | 'CATCHER' | 'RELAY' | 'ALLROUND'

export interface DrillResponse {
  id: string
  name: string
  categories: DrillCategory[]
  minPlayers: number
  equipment: string[]
  description: string
  hasImage: boolean
  pdfPage: number | null
  rotation: string | null
  variants: string | null
}

export interface TrainingPlanSectionResponse {
  drillId: string | null
  sectionType: string | null
  title: string | null
  durationMinutes: number | null
  rounds: number | null
  adaptationNotes: string | null
  rotationPlan: string | null
  setupNotes: string | null
  tips: string | null
  groupSetup: string | null
  userNotes: string | null
  parallelGroup: number | null
  playersPerGroup: number | null
}

export interface TrainingPlanContentResponse {
  sections: TrainingPlanSectionResponse[]
  groupDistributionHint: string | null
  overallNotes: string | null
}

export interface TrainingPlanResponse {
  id: number
  trainingId: number
  playerCount: number
  focus: string
  durationMinutes: number
  content: TrainingPlanContentResponse | null
  createdAt: string
  updatedAt: string
}

export interface GeneratePlanRequest {
  trainingId: number
  playerCount: number
  focus: string
  durationMinutes: number
}

// Live-Scoring
export type AtBatResult =
  | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN'
  | 'WALK' | 'HIT_BY_PITCH'
  | 'STRIKEOUT' | 'OUT'

export type BaseRunningEventType = 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY'

export interface BaseStateDto {
  first: number | null
  second: number | null
  third: number | null
}

export interface AtBatResponse {
  id: number
  gameId: number
  batterId: number
  batterName: string
  sequence: number
  inning: number
  result: AtBatResult
  baseStateAfter: BaseStateDto
  runsScored: number
  rbi: number
  createdAt: string
  createdBy: string
}

export interface RecordAtBatRequest {
  batterId: number
  result: AtBatResult
  inning: number
  baseStateAfter?: BaseStateDto
  runsScored?: number
  rbi?: number
}

export interface StealingEventResponse {
  id: number
  gameId: number
  runnerId: number
  runnerName: string
  inning: number
  type: BaseRunningEventType
  createdAt: string
}

export interface RecordStealingEventRequest {
  runnerId: number
  type: BaseRunningEventType
  inning: number
}

export interface RunnerOnBase {
  base: number
  playerId: number
  playerName: string
  battingOrder: number | null
}

export interface ScoreboardResponse {
  gameId: number
  scoreUs: number
  scoreThem: number | null
  currentInning: number
  outsInCurrentInning: number
  baseState: BaseStateDto
  runners: RunnerOnBase[]
  currentBatterId: number | null
  currentBatterName: string | null
  currentBatterOrder: number | null
  totalAtBats: number
}

export interface PlayerBattingStatsResponse {
  playerId: number
  playerName: string
  plateAppearances: number
  atBats: number
  hits: number
  singles: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  hitByPitch: number
  strikeouts: number
  outs: number
  stolenBases: number
  caughtStealing: number
  runsBattedIn: number
  totalBases: number
  battingAverage: number
  onBasePct: number
  sluggingPct: number
  ops: number
}

export const AT_BAT_RESULT_LABELS: Record<AtBatResult, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  HOMERUN: 'Homerun',
  WALK: 'Walk',
  HIT_BY_PITCH: 'Hit-by-Pitch',
  STRIKEOUT: 'Strikeout',
  OUT: 'Aus',
}
