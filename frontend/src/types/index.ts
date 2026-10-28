export interface Player {
  id: number
  name: string
  regular: boolean
  defaultBattingOrder: number | null
  whatsappName?: string | null
  archived?: boolean
  /** Für die Frauen-Quote der Liga; null = nicht zugeordnet und zählt nirgends mit. */
  gender?: Gender | null
  primaryPosition?: PositionSlot | null
  secondaryPosition?: PositionSlot | null
  tertiaryPosition?: PositionSlot | null
}

export type Gender = 'FEMALE' | 'MALE' | 'DIVERSE'

/** Ausgeschrieben — für Screenreader, Tooltips und Fließtext. */
export const GENDER_LABELS: Record<Gender, string> = { FEMALE: 'Frau', MALE: 'Mann', DIVERSE: 'Divers' }

/**
 * Kürzel für die Anzeige: drei gleich breite Felder statt „Frau | Mann | Divers".
 *
 * Der Umschalter steht 31-mal untereinander — ausgeschrieben wandert er je Zeile,
 * weil „Divers" breiter ist als „Frau". Ausgeschrieben bleibt er trotzdem im
 * `aria-label` und im Tooltip, das Kürzel ist nur die Oberfläche.
 */
export const GENDER_SHORT: Record<Gender, string> = { FEMALE: 'W', MALE: 'M', DIVERSE: 'D' }

/** Reihenfolge im Schalter. */
export const GENDER_ORDER: Gender[] = ['FEMALE', 'MALE', 'DIVERSE']

/** Ergebnis von POST /games/{id}/lineup/check — Hinweise, keine Fehler. */
export interface LineupRuleCheck {
  warnings: string[]
  womenOnField: number
  womenInInfield: number
}

/**
 * Positions-Profil: wo ein Spieler steht. Eigene Werte-Liste, nicht die Lineup-Position —
 * EH gibt es hier nicht, dafür die Sammelwerte IF, OF und IF_OF.
 * P und C stehen immer für sich und sind in keiner Gruppe enthalten.
 */
export type PositionSlot =
  | 'P' | 'C' | 'FIRST_BASE' | 'SECOND_BASE' | 'THIRD_BASE' | 'SS' | 'LF' | 'CF' | 'RF'
  | 'IF' | 'OF' | 'IF_OF'

export const POSITION_SLOT_LABELS: Record<PositionSlot, string> = {
  P: 'P', C: 'C', FIRST_BASE: '1B', SECOND_BASE: '2B', THIRD_BASE: '3B',
  SS: 'SS', LF: 'LF', CF: 'CF', RF: 'RF',
  IF: 'IF', OF: 'OF', IF_OF: 'IF/OF',
}

/** Langform für Selects und Tooltips — die Kürzel allein sagen Neuen nichts. */
export const POSITION_SLOT_DESCRIPTIONS: Record<PositionSlot, string> = {
  P: 'Pitcher', C: 'Catcher', FIRST_BASE: 'First Base', SECOND_BASE: 'Second Base',
  THIRD_BASE: 'Third Base', SS: 'Shortstop', LF: 'Left Field', CF: 'Center Field', RF: 'Right Field',
  IF: 'überall im Infield', OF: 'überall im Outfield', IF_OF: 'überall im Feld',
}

/** Reihenfolge in den Auswahl-Listen: erst die Posten, dann die Sammelwerte. */
export const POSITION_SLOT_ORDER: PositionSlot[] = [
  'P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'LF', 'CF', 'RF', 'IF', 'OF', 'IF_OF',
]

/** Ein Spiel in der Form-Kurve eines Spielers (GET /api/players/{id}/batting-timeline). */
export interface PlayerFormPoint {
  gameId: number
  date: string | null
  opponent: string | null
  seasonId: number | null
  seasonName: string | null
  year: number | null
  plateAppearances: number
  atBats: number
  hits: number
  walks: number
  strikeouts: number
  runsBattedIn: number
  totalBases: number
  /** H + BB + HBP dieses Spiels — Grundlage der OBP über mehrere Spiele. */
  timesOnBase: number
  stolenBases: number
  caughtStealing: number
  rollingAverage: number
  rollingOnBase: number
  rollingSlugging: number
  rollingOps: number
  rollingPlateAppearances: number
  /** Fenster noch nicht voll — Kurve wird gestrichelt gezeichnet. */
  provisional: boolean
}

/** Einsatz-Profil: wie verlässlich jemand da ist und wo er schlägt. */
export interface PlayerUsage {
  /** Vergangene Spieltage insgesamt — zukünftige zählen nicht mit. */
  gameDaysTotal: number
  gameDaysAvailable: number
  gameDaysPlayed: number
  /** Nicht abgesagte Trainings bis heute. `null` für Spieler: die Beteiligung bleibt vor ihnen verborgen. */
  trainingsTotal: number | null
  trainingsAttended: number | null
  averageBattingOrder: number | null
  battingOrderCounts: Record<string, number>
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
  /** ISO-Zeitpunkt der Freigabe; null/fehlend = nicht freigegeben (Spieler sehen dann leere Listen). */
  lineupsReleasedAt?: string | null
  lineupsChangedSinceRelease?: boolean
}

export interface LeagueTeamResponse {
  id: number
  name: string
  ownTeam: boolean
}

export type CoachRotationPair = 'POS_1_6' | 'POS_2_7' | 'POS_3_8' | 'POS_4_9' | 'POS_5_10'

export interface GameResponse {
  id: number
  gameNumber: number
  opponentTeam: LeagueTeamResponse | null
  scoreUs: number | null
  scoreThem: number | null
  gameDayId: number
  lineupEntryCount: number
  endedAt?: string | null
  battingSide?: 'top' | 'bottom' | null
  atBatCount?: number
  firstBaseCoachRotation?: CoachRotationPair | null
  thirdBaseCoachRotation?: CoachRotationPair | null
  firstBaseCoachRotationReversed?: boolean
  thirdBaseCoachRotationReversed?: boolean
  timerRunningSince?: string | null
  timerAccumulatedSeconds?: number
  timeLimitMinutes?: number | null
  timerStartedAt?: string | null
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
  positions: { gameNumber: number; position: string; weight: number }[]
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
  isEmptySlot?: boolean   // draft-only: placeholder for an absent player (player is a synthetic sentinel)
}

export interface LineupSetEntryResponse {
  id: number
  gameNumber: number
  player: Player
  position: string | null
  battingOrder: number
  dhBatterPlayer: Player | null
}

export interface LineupSetStaffEntryResponse {
  gameNumber: number
  player: Player
  role: string
}

export interface LineupSetGameRotationResponse {
  gameNumber: number
  firstBaseCoachRotation: CoachRotationPair | null
  firstBaseCoachRotationReversed: boolean
  thirdBaseCoachRotation: CoachRotationPair | null
  thirdBaseCoachRotationReversed: boolean
}

export interface LineupSetResponse {
  id: number
  gameDayId: number
  name: string
  entries: LineupSetEntryResponse[]
  staff: LineupSetStaffEntryResponse[]
  availablePlayerIds: number[]
  /** Coach-Rotation je Spiel. Alt-Sets (vor V57) haben eine leere Liste → Rotation wird geleert. */
  rotations: LineupSetGameRotationResponse[]
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

export interface StrandedPlayer {
  playerName: string
  times: number
}

/** Ein At-Bat in zeitlicher Folge innerhalb eines Innings (Schlagfolge). */
/** Läufer-Bewegung bei einem At-Bat. `toBase` 4 bedeutet Home (= Run). */
export interface RunnerAdvance {
  runner: string
  fromBase: number
  toBase: number
}

export interface InningAtBat {
  batter: string
  result: AtBatResult
  runsScored: number
  /** Wer bei diesem At-Bat weitergerückt ist — abgeleitet aus dem Base-State-Diff.
   *  Optional, weil der Service-Worker API-GETs cached: eine vor diesem Feature
   *  gecachte Antwort bringt das Feld nicht mit. */
  advances?: RunnerAdvance[]
}

export interface InningLog {
  inning: number
  runs: number
  hits: number
  onBase: number
  walks: number
  outs: number
  stranded: string[]
  /** Wessen At-Bat das Inning beendet hat (null wenn ohne Out-Ende). */
  outMaker: string | null
  /** Wer in diesem Inning traf (Spielername -> Hits). */
  hitsByPlayer: Record<string, number>
  /** Geordnete At-Bat-Folge des Innings (sequence-aufsteigend). */
  atBats: InningAtBat[]
}

/** Team-Offensiv-Zahlen eines Spiels ("Game Log") — die Mannschaft als Ganzes. */
export interface TeamGameLogResponse {
  gameId: number
  date: string | null
  opponent: string | null
  league: string | null
  year: number | null
  scoreUs: number | null
  scoreThem: number | null
  hasAtBatData: boolean
  plateAppearances: number
  atBats: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  strikeouts: number
  hitByPitch: number
  onBase: number
  leftOnBase: number
  stranded: StrandedPlayer[]
  /** Wie viele Basen ein Spieler durch gegnerische Fehler gutgemacht hat, absteigend. */
  basesGainedOnError?: { player: string; bases: number }[]
  innings: InningLog[]
}

/** Was ein Batting-Platz (1..N) über alle Spiele produziert hat. */
export interface BattingSlotStats {
  slot: number
  plateAppearances: number
  atBats: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  hitByPitch: number
  strikeouts: number
  outs: number
  battingAverage: number
  onBasePct: number
  /** Wer diesen Platz besetzte (nach Häufigkeit), mit eigener On-Base-Quote dort. */
  players: { name: string; plateAppearances: number; onBase: number }[]
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
  weekdays: number[]
  time: string | null
  weekdayTimes: Record<number, string>
  /** Ort je ISO-Wochentag. Was hier fehlt, erbt `location` — die Ausnahme, nicht die Regel. */
  weekdayLocations?: Record<number, string>
  location: string | null
  cycleWeeks: number
  activeWeeksInCycle: number[]
  /** ISO-Wochentage, an denen nur Pitcher und Catcher eingeladen sind. */
  pcOnlyWeekdays: number[]
}

export type TrainingType = 'REGULAR' | 'PITCHER_CATCHER'

export interface TrainingResponse {
  id: number
  date: string
  time: string | null
  location: string | null
  cancelled: boolean
  /** `null` für Spieler: die Teilnehmerzahl bleibt vor ihnen verborgen. */
  attendeeCount: number | null
  periodId: number | null
  type: TrainingType
  /** War der ganze Kader eingeladen? False = Nur-P/C, zählt nicht in die Beteiligung. */
  openToAll: boolean
}

/**
 * Stammdaten für die Trainerabrechnung des Hochschulsports.
 *
 * Eine Zeile im Backend, nicht im Browser — damit sie den Gerätewechsel überlebt.
 * `undefined` heißt: noch nie eingetragen, das Formular ist leer.
 */
export interface CoachBillingProfile {
  firstName: string
  lastName: string
  street: string
  zip: string
  city: string
  sportCourse: string
  hourlyRate: number
  /** Monatsdeckel aus dem Vertrag, in Stunden. */
  maxHours: number
  /** Anrede in der Mail; leer heißt nur „Hallo,". */
  recipientName: string | null
  recipientEmail: string
  /** PNG als Data-URL, einmal gezeichnet. */
  signaturePng: string | null
}

export interface TrainingAttendanceResponse {
  player: Player
  present: boolean
}

export interface TrainingStatsResponse {
  playerId: number
  playerName: string
  attended: number
  /** Stattgefundene Trainings im Zeitraum — für alle Spieler gleich. */
  totalTrainings: number
  /** Stattgefundene Trainings seit dem ersten Auftauchen DIESES Spielers. */
  heldSinceFirstSeen: number
  /** `attended / heldSinceFirstSeen` (Nenner mindestens 3). Danach sortiert die
   *  Auto-Aufstellung — Listen, die etwas anderes zeigen, erklären sie nicht. */
  participation: number
  regular: boolean
}

// Drills & Training Plans
export type DrillCategory =
  | 'WARMUP' | 'CONDITIONING' | 'THROWING' | 'BASERUNNING'
  | 'CATCHER' | 'FIRST_BASE' | 'SECOND_BASE' | 'SS' | 'THIRD_BASE'
  | 'OUTFIELD' | 'SITUATIONAL' | 'HITTING' | 'FIELDING' | 'RELAY'
  | 'DOUBLE_PLAY' | 'BUNT_DEFENSE' | 'COMINGS' | 'PITCHER'
  | 'PARTNER_ROUTINE'

export type TrainingFocus =
  | 'WERFEN' | 'INFIELD_DEFENSE' | 'OUTFIELD' | 'BASERUNNING' | 'SITUATIONAL' | 'CATCHER' | 'RELAY' | 'ALLROUND'

export type DrillComplexity = 'BASIC' | 'ADVANCED'

export type InfieldPosition = 'FIRST_BASE' | 'SECOND_BASE' | 'SS' | 'THIRD_BASE'

export const INFIELD_POSITION_LABELS: Record<InfieldPosition, string> = {
  FIRST_BASE: '1B',
  SECOND_BASE: '2B',
  SS: 'SS',
  THIRD_BASE: '3B',
}

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
  complexity?: DrillComplexity
}

export type SectionGroup = 'ALL' | 'MAIN' | 'BEGINNER'

export type StationType = 'LIVE' | 'TEE' | 'BUNT' | 'KORKEN' | 'HUETCHEN' | 'OTHER'
export type StationLevel = 'ADVANCED' | 'BEGINNER'

/** Eine Batting-Station im Trainings-Setup (eigenes Set, entkoppelt von Plan-Drills). */
export interface TrainingStation {
  type: StationType
  label?: string | null
  level?: StationLevel | null
  choiceGroup?: number | null
  /** Normalisierte Feld-Position 0..1 (links→rechts / oben→unten). Null = Auto-Platz. */
  x?: number | null
  y?: number | null
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
  group?: SectionGroup
}

export interface TrainingPlanContentResponse {
  sections: TrainingPlanSectionResponse[]
  groupDistributionHint: string | null
  overallNotes: string | null
  stations?: TrainingStation[] | null
}

export type PlanKind = 'MAIN' | 'BEGINNER'

export interface TrainingPlanResponse {
  id: number
  trainingId: number
  kind: PlanKind
  playerCount: number
  focus: string
  durationMinutes: number
  content: TrainingPlanContentResponse | null
  createdAt: string
  updatedAt: string
  infieldPositions?: InfieldPosition[]
}

export interface GeneratePlanRequest {
  trainingId: number
  kind?: PlanKind
  playerCount: number
  focus: string
  durationMinutes: number
  infieldPositions?: InfieldPosition[]
  withBeginnerGroup?: boolean
  beginnerCount?: number
  beginnerFocus?: string
}

// Live-Scoring
export type UndoResultType = 'AT_BAT' | 'STEALING' | 'SUBSTITUTION' | 'INNING_ADVANCE' | 'AUTOMATIC_OUT' | 'NONE'

export interface InningAdvanceEventResponse {
  id: number
  toInning: number
  opponentRuns: number
  createdAt: string
}

export interface UndoResult {
  type: UndoResultType
  removedId: number | null
}

export type AtBatResult =
  | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN' | 'INSIDE_PARK_HR'
  | 'WALK' | 'HIT_BY_PITCH'
  | 'STRIKEOUT' | 'OUT'
  /** Automatisches Out (fehlende Spielerin) — Out im Inning, aber kein At-Bat und keine PA. */
  | 'AUTOMATIC_OUT'
  | 'REACHED_ON_ERROR'

export type BaseRunningEventType = 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'PICKOFF'

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

/** Dauer-Hochrechnung ohne Zeitlimit — nur vorhanden, wenn eine Schätzung sinnvoll ist
 *  (mind. 3 abgeschlossene Halbinnings, kein Limit gesetzt, Uhr läuft/lief, Spiel nicht beendet). */
export interface DurationEstimateResponse {
  totalMinutes: number
  remainingMinutes: number
  completedHalfInnings: number
}

/** Berechneter Uhr-Zustand — kommt aus dem Backend, nie aus einem lokalen Timestamp. */
export interface ClockStateResponse {
  elapsedSeconds: number
  running: boolean
  started: boolean
  limitMinutes: number | null
  overLimit: boolean
  durationEstimate?: DurationEstimateResponse | null
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
  clock: ClockStateResponse
}

export interface WeatherHourSlot {
  hour: number
  temp: number
  wmoCode: number
  precipitationProbabilityPct: number
}

export interface WeatherResponse {
  tempMin: number
  tempMax: number
  wmoCode: number
  precipitationProbabilityPct: number
  hours: WeatherHourSlot[]
}

export type AwardType = 'MVP' | 'TOP_HITTER' | 'POWER' | 'RBI' | 'SPEED' | 'ON_BASE' | 'WALK' | 'HBP' | 'STRIKEOUT'

export interface AwardResponse {
  type: AwardType
  /** null bei Gleichstand mit mehreren Gewinnern — dann listet playerName alle Namen */
  playerId: number | null
  playerName: string
  displayValue: string
}

export interface OpponentBattingStatsResponse {
  teamName: string
  games: number
  plateAppearances: number
  atBats: number
  hits: number
  runs: number
  battingAverage: number
}

export interface YearCopyResponse {
  templateYear: number
  targetYear: number
  createdSeasons: string[]
  skippedSeasons: string[]
  copiedTeams: number
}

export interface TeamLeagueOccurrence {
  teamId: number
  seasonId: number
  leagueName: string
  year: number | null
}

export interface TeamDirectoryEntry {
  clubName: string
  leagues: TeamLeagueOccurrence[]
  games: number
  wins: number
  losses: number
  ties: number
  runsFor: number
  runsAgainst: number
  battingAverage: number | null
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
  runs: number
  walks: number
  hitByPitch: number
  strikeouts: number
  outs: number
  reachedOnError: number
  stolenBases: number
  caughtStealing: number
  pickoffs: number
  runsBattedIn: number
  totalBases: number
  battingAverage: number
  onBasePct: number
  sluggingPct: number
  ops: number
  qualified: boolean
}

export const AT_BAT_RESULT_LABELS: Record<AtBatResult, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  HOMERUN: 'Homerun',
  INSIDE_PARK_HR: 'Park-HR',
  WALK: 'Walk',
  HIT_BY_PITCH: 'Hit-by-Pitch',
  STRIKEOUT: 'Strikeout',
  OUT: 'Aus',
  REACHED_ON_ERROR: 'Reached on Error',
  AUTOMATIC_OUT: 'Automatisches Out',
}

// Spielbogen
export type BogenSide = 'HOME' | 'AWAY'
export type BogenStatus = 'DRAFT' | 'LIVE' | 'DONE'

export interface SpielbogenResponse {
  id: number
  date: string
  location: string | null
  homeTeamName: string
  awayTeamName: string
  season: { id: number; name: string; year: number } | null
  status: BogenStatus
  currentInning: number
  currentSide: BogenSide
  homeRuns: number
  awayRuns: number
  leagueResultId: number | null
  createdAt: string
  updatedAt: string
  endedAt: string | null
  timerRunningSince: string | null
  timerAccumulatedSeconds: number
  timeLimitMinutes: number | null
  timerStartedAt: string | null
}

export interface SpielbogenSlotResponse {
  id: number
  side: BogenSide
  slot: number
  name: string
  position: string | null
  battingOrder: number
}

export interface SpielbogenLineupResponse {
  home: SpielbogenSlotResponse[]
  away: SpielbogenSlotResponse[]
}

export interface CreateSpielbogenRequest {
  date: string
  location?: string | null
  homeTeamName: string
  awayTeamName: string
  seasonId?: number | null
}

export interface SetLineupRequest {
  side: BogenSide
  slots: Array<{
    slot: number
    name: string
    position?: string | null
    battingOrder: number
  }>
}

export interface UpdateSlotRequest {
  name?: string
  position?: string | null
  battingOrder?: number
}

export interface EndGameRequest {
  homeRuns?: number
  awayRuns?: number
}

export interface CopyFromGameDayRequest {
  gameDayId: number
  gameNumber: number
  targetSide: BogenSide
}

export const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH'] as const

// Scoring types
export type StealingEventType = 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'WILD_PITCH' | 'PASSED_BALL'
export type OutType = 'GROUNDER' | 'FLY' | 'FOUL' | 'UNASSISTED' | 'DOUBLE_PLAY' | 'TRIPLE_PLAY' | 'FORCE_OUT' | 'TAG_OUT' | 'FIELDERS_CHOICE'
export type SacrificeType = 'BUNT' | 'FLY'

export interface BogenBaseStateDto {
  firstSlotId: number | null
  secondSlotId: number | null
  thirdSlotId: number | null
}

export interface SpielbogenAtBatResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  sequence: number
  inning: number
  result: AtBatResult
  outType: OutType | null
  sacrificeType: SacrificeType | null
  fielderChain: number[] | null
  isError: boolean | null
  errorPosition: number | null
  runsScored: number
  rbi: number
  baseStateAfter: BogenBaseStateDto | null
  runnerAdvances: SpielbogenRunnerAdvanceResponse[]
  createdAt: string
}

export interface SpielbogenRecordAtBatRequest {
  side: BogenSide
  slotId: number
  inning: number
  result: AtBatResult
  outType?: OutType
  sacrificeType?: SacrificeType
  fielderChain?: number[]
  isError?: boolean
  errorPosition?: number
  runsScored?: number
  rbi?: number
  baseStateAfter?: BogenBaseStateDto
  runnerAdvances?: RunnerAdvanceEntry[]
}

export interface SpielbogenStealingResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  inning: number
  type: StealingEventType
  fromBase: number
  toBase: number
  createdAt: string
}

export type RunnerAdvanceReason =
  | 'HIT_PUSH'
  | 'BB_FORCE'
  | 'HBP_FORCE'
  | 'FIELDERS_CHOICE'
  | 'ERROR'
  | 'SAC'
  | 'WP'
  | 'PB'

export interface RunnerAdvanceEntry {
  slotId: number
  fromBase: number
  toBase: number
  reason: RunnerAdvanceReason
}

export interface SpielbogenRunnerAdvanceResponse {
  id: number
  bogenId: number
  atBatId: number
  slotId: number
  side: BogenSide
  inning: number
  fromBase: number
  toBase: number
  reason: RunnerAdvanceReason
  createdAt: string
}

export interface SpielbogenRecordStealingRequest {
  side: BogenSide
  slotId: number
  inning: number
  type: StealingEventType
  fromBase: number
  toBase: number
}

export interface SpielbogenSubstitutionResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  inning: number
  playerOutName: string
  playerInName: string
  isPinchHitter: boolean
  createdAt: string
}

export interface SpielbogenRecordSubstitutionRequest {
  side: BogenSide
  slotId: number
  inning: number
  playerInName: string
  pinchHitter?: boolean
}

export interface SpielbogenPositionChangeResponse {
  id: number
  bogenId: number
  slotId: number
  side: BogenSide
  inning: number
  groupId: string
  oldPosition: string | null
  newPosition: string | null
  createdAt: string
}

export interface SpielbogenRecordPositionSwapRequest {
  side: BogenSide
  inning: number
  changes: PositionSwapEntry[]
}

export interface PositionSwapEntry {
  slotId: number
  newPosition: string | null
}

export interface BogenTeamTotals {
  runs: number
  hits: number
  errors: number
}

export interface BogenSheetResponse {
  meta: SpielbogenResponse
  homeLineup: SpielbogenSlotResponse[]
  awayLineup: SpielbogenSlotResponse[]
  homeAtBats: SpielbogenAtBatResponse[]
  awayAtBats: SpielbogenAtBatResponse[]
  stealingEvents: SpielbogenStealingResponse[]
  substitutions: SpielbogenSubstitutionResponse[]
  positionChanges: SpielbogenPositionChangeResponse[]
  runnerAdvances: SpielbogenRunnerAdvanceResponse[]
  inningRuns: Record<number, { home: number; away: number }>
  homeTotals: BogenTeamTotals
  awayTotals: BogenTeamTotals
  clock: ClockStateResponse
}

export type PairingMode = 'HEIM_GAST' | 'TEAM_1_2'
export interface InvitationGame { time: string; teamA: string; teamB: string; ump: string }
export interface InvitationContact { role: string; name: string; email: string; phone: string }
export interface InvitationResponse {
  id: number
  title: string
  letterDate: string | null
  eventDate: string | null
  venue: string | null
  pairingMode: PairingMode
  bodyText: string | null
  guestTeams: string[]
  games: InvitationGame[]
  contacts: InvitationContact[]
}
export interface InvitationRequest {
  title: string
  letterDate: string | null
  eventDate: string | null
  venue: string | null
  pairingMode: PairingMode
  bodyText: string | null
  guestTeams: string[]
  games: InvitationGame[]
  contacts: InvitationContact[]
}

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

/**
 * CONNECTING/WAITING_QR/CONNECTED/LOGGED_OUT/INIT_FAILED kommen vom Sidecar,
 * UNREACHABLE setzt das Backend wenn der Sidecar nicht antwortet.
 */
export type WhatsappConnectionState =
  | 'CONNECTING' | 'WAITING_QR' | 'PAIRING' | 'CONNECTED' | 'LOGGED_OUT' | 'INIT_FAILED' | 'UNREACHABLE'

export interface WhatsappAccountStatus {
  connected: boolean
  number: string | null
  name: string | null
  needsQr: boolean
  state: WhatsappConnectionState | null
  lastError: string | null
  lastErrorAt: string | null
  /** Letzter von WhatsApp angenommener Scan. Steht der, lag es nicht am QR-Code. */
  lastPairingAt: string | null
}

export interface WhatsappGroup {
  id: string
  name: string
}

export type PollMode = 'TRAINING' | 'ONE_OFF' | 'GAME_DAY'

export interface WhatsappPollResponse {
  id: number
  groupId: string
  groupName: string | null
  title: string
  options: string[]
  weekday: Weekday | null
  time: string // "18:00:00"
  mode: PollMode
  gameDayId: number | null
  sendDate: string | null // ISO "2026-08-05" oder null (nur einmalig)
  enabled: boolean
  allowMultipleAnswers: boolean
  message: string | null
  skipDates: string[] // ISO-Daten "2026-07-14"
  lastSentAt: string | null
}

export interface WhatsappPollRequest {
  groupId: string
  groupName: string | null
  title: string
  options: string[]
  weekday: Weekday | null
  time: string
  mode: PollMode
  gameDayId: number | null
  sendDate: string | null
  enabled: boolean
  allowMultipleAnswers: boolean
  message: string | null
}

export interface UnknownVoter {
  voterName: string
  source: 'TRAINING' | 'GAME_DAY'
  targetId: number
  date: string | null
}

export interface GameDayVotePreview {
  pollExists: boolean
  sent: boolean
  toAdd: { id: number; name: string }[]
  toRemove: { playerId: number; playerName: string; warnings: string[] }[]
  optionVoters: { option: string; voters: string[] }[]
  unknownVoters: string[]
  voteCount: number
  yesCount: number
}

export type Role = 'SUPERADMIN' | 'ADMIN' | 'PLAYER'

/** Antwort von `GET /api/me` und `POST /api/auth/login`: wer angemeldet ist und was er darf. */
export interface MeResponse {
  username: string
  role: Role
  playerId: number | null
  playerName: string | null
  mayScore: boolean
  passwordChanged: boolean
}

/** Ein Account in der Verwaltung (`GET /api/users`). Nie mit Passwort-Hash. */
export interface UserAccount {
  id: number
  playerId: number | null
  playerName: string | null
  username: string
  role: Role
  mayScore: boolean
  locked: boolean
  passwordChanged: boolean
  createdAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
}

/** Was die Massenanlage getan hat — und was sie übersprungen hat, mit Grund. */
export interface BulkCreateResult {
  created: { accountId: number; playerId: number; playerName: string; username: string }[]
  skipped: { playerId: number; playerName: string; reason: string }[]
}

export type AuditKind = 'LOGIN' | 'LOGIN_FAILED' | 'WRITE' | 'SCORING'

/** Eine Zeile der Historie; bei `count` > 1 eine zusammengefasste Scoring-Spanne von `from` bis `to`. */
export interface AuditEntry {
  username: string
  /** Der Spieler hinter dem Account; null nach dem Löschen des Accounts. */
  playerName: string | null
  kind: AuditKind
  label: string
  method: string | null
  path: string | null
  targetType: string | null
  targetId: number | null
  status: number | null
  from: string
  to: string
  count: number
}

export interface LastSeen {
  userId: number
  username: string
  /** Der Spieler hinter dem Account; null, wenn keiner auffindbar ist. */
  playerName: string | null
  role: Role
  lastLoginAt: string | null
  lastSeenAt: string | null
}
