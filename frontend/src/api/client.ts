import { clearApiCache } from '@/pwa/apiCaching'
import { ROLLE_KOPF, spielermodusAktiv } from '@/hooks/useSpielermodus'

const API = '/api'

function getAuthHeaders(): Record<string, string> {
  const creds = localStorage.getItem('auth')
  if (!creds) return {}
  // Der Spielermodus haengt an JEDER Anfrage, nicht an einer Sitzung: er wird nirgends
  // gespeichert, auch nicht serverseitig. Deshalb hier und nicht in `senden` — diese
  // Funktion traegt alle drei Aufrufstellen (request, Kalender, Trainingsplan).
  const kopf: Record<string, string> = { Authorization: `Basic ${creds}` }
  if (spielermodusAktiv()) kopf[ROLLE_KOPF] = 'PLAYER'
  return kopf
}

export function setAuth(username: string, password: string) {
  // btoa kennt nur Latin-1; Umlaute im Namen oder Passwort wuerden sonst werfen
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  localStorage.setItem('auth', btoa(String.fromCharCode(...bytes)))
  // Neues Konto auf diesem Gerät: Antworten des Vorgängers dürfen nicht mehr aus dem Cache kommen.
  void clearApiCache()
}

/**
 * Die gespeicherten Zugangsdaten, wieder entpackt. Nach einer Namensänderung braucht das
 * Frontend das Passwort, um sie unter dem neuen Namen neu abzulegen — der Server kennt es nur als Hash.
 */
export function storedCredentials(): { username: string; password: string } | null {
  const raw = localStorage.getItem('auth')
  if (raw === null) return null
  try {
    const text = new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0)))
    const i = text.indexOf(':')
    return i < 0 ? null : { username: text.slice(0, i), password: text.slice(i + 1) }
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem('auth')
  void clearApiCache()
}

export function hasAuth(): boolean {
  return localStorage.getItem('auth') !== null
}

/** Feuert, wenn der Server die gespeicherten Zugangsdaten ablehnt. Der AuthProvider hoert darauf. */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

/**
 * fetch mit Basic-Auth und der 401-Behandlung. Alles, was /api anspricht, laeuft hier durch —
 * auch die Aufrufe, die ihre Antwort selbst auswerten (Download, Statuscodes).
 */
async function senden(url: string, options?: RequestInit): Promise<Response> {
  const gesendet = localStorage.getItem('auth')
  const res = await fetch(`${API}${url}`, options)
  if (res.status === 401 && gesendet !== null) {
    // Nur abmelden, wenn es noch die Zugangsdaten sind, mit denen die Anfrage lief: eine
    // verspaetete 401 darf eine Anmeldung, die inzwischen neu erfolgte, nicht wegraeumen.
    // Bekannte Luecke: verglichen wird die Zeichenfolge. Meldet sich jemand mit IDENTISCHEN
    // Zugangsdaten neu an, obwohl der Server sie zwischendurch abgelehnt hat, raeumt eine
    // spaete 401 der alten Sitzung auch diese Anmeldung weg. Praktisch ausgeschlossen.
    if (localStorage.getItem('auth') === gesendet) {
      clearAuth()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
  }
  return res
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await senden(url, {
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
  PlayerFormPoint,
  PlayerUsage,
  Gender,
  LineupRuleCheck,
  PositionSlot,
  Player,
  Season,
  GameDayResponse,
  GameResponse,
  LeagueTeamResponse,
  TeamDirectoryEntry,
  TeamGameLogResponse,
  BattingSlotStats,
  LineupEntryResponse,
  GameStaffResponse,
  GameDayPlayerStats,
  SeasonPlayerStats,
  YearCopyResponse,
  StandingEntry,
  LeagueResultResponse,
  TrainingResponse,
  TrainingAttendanceResponse,
  CoachBillingProfile,
  TrainingStatsResponse,
  TrainingPeriodResponse,
  GameDayLineupsResponse,
  LineupSuggestionEntry,
  SuggestAllLineupsResponse,
  SubstitutionResponse,
  DrillResponse,
  TrainingPlanResponse,
  TrainingPlanContentResponse,
  GeneratePlanRequest,
  AtBatResponse,
  RecordAtBatRequest,
  StealingEventResponse,
  RecordStealingEventRequest,
  ScoreboardResponse,
  ClockStateResponse,
  PlayerBattingStatsResponse,
  OpponentBattingStatsResponse,
  SpielbogenResponse,
  SpielbogenLineupResponse,
  SpielbogenSlotResponse,
  CreateSpielbogenRequest,
  SetLineupRequest,
  UpdateSlotRequest,
  EndGameRequest,
  CopyFromGameDayRequest,
  BogenSide,
  SpielbogenAtBatResponse,
  SpielbogenRecordAtBatRequest,
  SpielbogenStealingResponse,
  SpielbogenRecordStealingRequest,
  SpielbogenSubstitutionResponse,
  SpielbogenRecordSubstitutionRequest,
  SpielbogenPositionChangeResponse,
  SpielbogenRecordPositionSwapRequest,
  BogenSheetResponse,
  RunnerAdvanceEntry,
  UndoResult,
  InningAdvanceEventResponse,
  AwardResponse,
  WeatherResponse,
  InvitationResponse,
  InvitationRequest,
  LineupSetResponse,
  WhatsappAccountStatus,
  WhatsappGroup,
  WhatsappPollResponse,
  WhatsappPollRequest,
  UnknownVoter,
  GameDayVotePreview,
  MeResponse,
  Role,
  UserAccount,
  BulkCreateResult,
  AuditVerlauf,
  AuditKind,
  LastSeen,
} from '@/types'

// Players
export const getPlayers = (includeArchived = false) =>
  request<Player[]>(`/players${includeArchived ? '?includeArchived=true' : ''}`)
export const createPlayer = (name: string) =>
  request<Player>('/players', { method: 'POST', body: JSON.stringify({ name }) })
export const updatePlayer = (id: number, data: { name?: string; regular?: boolean }) =>
  request<Player>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const getPlayer = (id: number) =>
  request<Player>(`/players/${id}`)

export interface TrainingAnwesenheit {
  /** Monat (1..12) auf Anzahl besuchter Trainings. Ein Monat ohne Anwesenheit fehlt. */
  monate: Record<string, number>
  /**
   * Termine seit dem letzten Mal, zu denen der ganze Kader geladen war. `null` = noch nie da
   * gewesen — „lange nicht gesehen" ist die falsche Anrede fuer einen, den es noch nie gab.
   */
  verpasstSeitdem: number | null
}

/**
 * Die eigene Trainings-Anwesenheit eines Jahres.
 *
 * Nur fuer sich selbst oder als Trainer; sonst antwortet der Server mit 403.
 */
export const getPlayerTrainingMonths = (id: number, jahr: number) =>
  request<TrainingAnwesenheit>(`/players/${id}/training-months?year=${jahr}`)
export const getPlayerBattingTimeline = (id: number) =>
  request<PlayerFormPoint[]>(`/players/${id}/batting-timeline`)

/** Ohne Scope zählt alles; sonst genau ein Kalenderjahr oder genau eine Saison. */
export const getPlayerUsage = (id: number, scope?: { year?: number; seasonId?: number }) => {
  const query = scope?.seasonId != null ? `?seasonId=${scope.seasonId}`
    : scope?.year != null ? `?year=${scope.year}`
    : ''
  return request<PlayerUsage>(`/players/${id}/usage${query}`)
}

export const updatePlayerGender = (id: number, gender: Gender | null) =>
  request<Player>(`/players/${id}/gender`, { method: 'PUT', body: JSON.stringify({ gender }) })

export const updatePlayerPositions = (
  id: number,
  positions: { primary: PositionSlot | null; secondary: PositionSlot | null; tertiary: PositionSlot | null },
) =>
  request<Player>(`/players/${id}/positions`, { method: 'PUT', body: JSON.stringify(positions) })
export const archivePlayer = (id: number) =>
  request<Player>(`/players/${id}/archive`, { method: 'PUT' })
export const unarchivePlayer = (id: number) =>
  request<Player>(`/players/${id}/unarchive`, { method: 'PUT' })
export const deletePlayer = (id: number) =>
  request<void>(`/players/${id}`, { method: 'DELETE' })
export const updateBattingOrder = (orderedPlayerIds: number[]) =>
  request<Player[]>('/players/batting-order', { method: 'PUT', body: JSON.stringify(orderedPlayerIds) })
export const setPlayerWhatsappName = (id: number, whatsappName: string) =>
  request<Player>(`/players/${id}/whatsapp-name`, { method: 'PUT', body: JSON.stringify({ whatsappName }) })

// Seasons
export const getSeasons = () => request<Season[]>('/seasons')
export const getSeason = (id: number) => request<Season>(`/seasons/${id}`)
export const createSeason = (name: string, year: number) =>
  request<Season>('/seasons', { method: 'POST', body: JSON.stringify({ name, year }) })
export const copySeasonYear = (templateYear: number, targetYear: number, copyTeams: boolean) =>
  request<YearCopyResponse>('/seasons/copy-year', {
    method: 'POST',
    body: JSON.stringify({ templateYear, targetYear, copyTeams }),
  })
export const updateSeason = (id: number, name: string, year: number) =>
  request<Season>(`/seasons/${id}`, { method: 'PUT', body: JSON.stringify({ name, year }) })
export const deleteSeason = (id: number) =>
  request<void>(`/seasons/${id}`, { method: 'DELETE' })
export const getSeasonStats = (id: number) =>
  request<SeasonPlayerStats[]>(`/seasons/${id}/stats`)
export const getStandings = (id: number) =>
  request<StandingEntry[]>(`/seasons/${id}/standings`)

// Game Days
export const getAllGameDays = () => request<GameDayResponse[]>('/gamedays/all')

/** Lädt den ICS-Kalender (mit Auth, da Basic-Auth global) und triggert den Download. */
export async function downloadCalendarIcs(trainings: boolean) {
  const res = await senden(`/calendar.ics?trainings=${trainings}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Kalender-Export fehlgeschlagen')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'deadsox.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const getGameDays = (seasonId: number) =>
  request<GameDayResponse[]>(`/seasons/${seasonId}/gamedays`)
export const createGameDay = (seasonId: number, date: string, label?: string, location?: string, numberOfGames?: number) =>
  request<GameDayResponse>(`/seasons/${seasonId}/gamedays`, {
    method: 'POST',
    body: JSON.stringify({ date, label: label || null, location: location || null, numberOfGames: numberOfGames || null }),
  })
export const getGameDay = (id: number) =>
  request<GameDayResponse>(`/gamedays/${id}`)
export const updateGameDay = (id: number, data: { date?: string; label?: string | null; location?: string | null; numberOfGames?: number }) =>
  request<GameDayResponse>(`/gamedays/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const setAvailablePlayers = (gameDayId: number, playerIds: number[]) =>
  request<GameDayResponse>(`/gamedays/${gameDayId}/players`, {
    method: 'PUT',
    body: JSON.stringify({ playerIds }),
  })
export const releaseLineups = (id: number, released: boolean) =>
  request<GameDayResponse>(`/gamedays/${id}/lineups/release`, {
    method: 'PUT',
    body: JSON.stringify({ released }),
  })
export const getGameDayStats = (id: number) =>
  request<GameDayPlayerStats[]>(`/gamedays/${id}/stats`)
export const getGameDayAwards = (id: number) =>
  request<AwardResponse[]>(`/gamedays/${id}/awards`)
export const getSeasonAwards = (seasonId: number) =>
  request<AwardResponse[]>(`/seasons/${seasonId}/awards`)
export const getYearAwards = (year: number) =>
  request<AwardResponse[]>(`/years/${year}/awards`)
export const getAllTimeAwards = () =>
  request<AwardResponse[]>(`/stats/all-time/awards`)
export const getGameDayWeather = async (id: number): Promise<WeatherResponse | null> => {
  const w = await request<WeatherResponse | undefined>(`/gamedays/${id}/weather`)
  return w ?? null
}
export const getTrainingWeather = async (id: number): Promise<WeatherResponse | null> => {
  const w = await request<WeatherResponse | undefined>(`/trainings/${id}/weather`)
  return w ?? null
}
export const getGameDayLineups = (id: number) =>
  request<GameDayLineupsResponse>(`/gamedays/${id}/lineups`)
export const deleteGameDay = (id: number) =>
  request<void>(`/gamedays/${id}`, { method: 'DELETE' })
export const fetchGameDayPollVotes = (gameDayId: number) =>
  request<GameDayVotePreview>(`/gamedays/${gameDayId}/poll-votes/fetch`, { method: 'POST' })
export const getGameDayPollVotes = (gameDayId: number) =>
  request<GameDayVotePreview>(`/gamedays/${gameDayId}/poll-votes`)
export const applyGameDayPollVotes = (gameDayId: number, add: number[], remove: number[]) =>
  request<GameDayResponse>(`/gamedays/${gameDayId}/poll-votes/apply`, {
    method: 'POST',
    body: JSON.stringify({ add, remove }),
  })

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

// Lineup-Sets
export const getLineupSets = (gameDayId: number) =>
  request<LineupSetResponse[]>(`/gamedays/${gameDayId}/lineup-sets`)

export const createLineupSet = (gameDayId: number, name: string) =>
  request<LineupSetResponse>(`/gamedays/${gameDayId}/lineup-sets`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

/** Überschreibt ein bestehendes Set mit dem aktuellen Spieltag-Stand (Name + ID bleiben). */
export const overwriteLineupSet = (setId: number) =>
  request<LineupSetResponse>(`/lineup-sets/${setId}`, { method: 'PUT' })

export const renameLineupSet = (setId: number, name: string) =>
  request<LineupSetResponse>(`/lineup-sets/${setId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })

export const deleteLineupSet = (setId: number) =>
  request<void>(`/lineup-sets/${setId}`, { method: 'DELETE' })

// Substitutions
export const getSubstitutions = (gameId: number) =>
  request<SubstitutionResponse[]>(`/games/${gameId}/substitutions`)
export const setSubstitutions = (
  gameId: number,
  subs: { playerOutId: number; playerInId: number; inning: number }[],
) => request<SubstitutionResponse[]>(`/games/${gameId}/substitutions`, {
  method: 'PUT',
  body: JSON.stringify(subs),
})

// Lineup Suggestions
/** Regel-Check fuer den aktuellen Entwurf — Hinweise, kein Speichern. */
export const checkLineupRules = (
  gameId: number,
  entries: { playerId: number; position: string | null; battingOrder: number; dhBatterPlayerId: number | null }[],
) =>
  request<LineupRuleCheck>(`/games/${gameId}/lineup/check`, { method: 'POST', body: JSON.stringify(entries) })

export const suggestLineup = (gameId: number) =>
  request<LineupSuggestionEntry[]>(`/games/${gameId}/lineup/suggest`)
export const suggestAllLineups = (gameDayId: number) =>
  request<SuggestAllLineupsResponse>(`/gamedays/${gameDayId}/lineup/suggest-all`, { method: 'POST' })
export const undoAllLineups = (gameDayId: number, oldLineups: Record<string, LineupEntryResponse[]>) => {
  const converted: Record<string, { playerId: number; position: string | null; battingOrder: number; dhBatterPlayerId: number | null }[]> = {}
  for (const [gameId, entries] of Object.entries(oldLineups)) {
    converted[gameId] = entries.map(e => ({
      playerId: e.player.id,
      position: e.position,
      battingOrder: e.battingOrder,
      dhBatterPlayerId: e.dhBatterPlayer?.id ?? null,
    }))
  }
  return request<void>(`/gamedays/${gameDayId}/lineup/undo`, {
    method: 'POST',
    body: JSON.stringify({ oldLineups: converted }),
  })
}

// League Teams
export const getLeagueTeams = (seasonId: number) =>
  request<LeagueTeamResponse[]>(`/seasons/${seasonId}/teams`)
export const createLeagueTeam = (seasonId: number, name: string) =>
  request<LeagueTeamResponse>(`/seasons/${seasonId}/teams`, { method: 'POST', body: JSON.stringify({ name }) })
export const updateLeagueTeam = (teamId: number, name: string) =>
  request<LeagueTeamResponse>(`/teams/${teamId}`, { method: 'PUT', body: JSON.stringify({ name }) })
export const deleteLeagueTeam = (teamId: number) =>
  request<void>(`/teams/${teamId}`, { method: 'DELETE' })

// Team-Analyse: Spiel-Verlauf + Lineup-Plätze
export const getTeamGameLogs = () =>
  request<TeamGameLogResponse[]>('/stats/game-logs')
/** Lineup-Plätze — ohne gameIds über alle Spiele, mit gameIds nur über die Auswahl. */
export const getBattingSlots = (gameIds?: number[]) =>
  request<BattingSlotStats[]>(`/stats/batting-slots${gameIds?.length ? `?gameIds=${gameIds.join(',')}` : ''}`)

// Team-Verzeichnis (Club-Sicht über alle Ligen)
export const getTeamDirectory = () =>
  request<TeamDirectoryEntry[]>('/teams/directory')
export const renameTeamClub = (currentName: string, newName: string) =>
  request<TeamDirectoryEntry[]>('/teams/directory/rename', {
    method: 'PUT',
    body: JSON.stringify({ currentName, newName }),
  })

// League Results
export const getLeagueResults = (seasonId: number) =>
  request<LeagueResultResponse[]>(`/seasons/${seasonId}/results`)
export const createLeagueResult = (seasonId: number, data: { homeTeamId: number; awayTeamId: number; homeScore: number; awayScore: number; date?: string }) =>
  request<LeagueResultResponse>(`/seasons/${seasonId}/results`, { method: 'POST', body: JSON.stringify(data) })
export const deleteLeagueResult = (resultId: number) =>
  request<void>(`/results/${resultId}`, { method: 'DELETE' })

// Games
export const getGame = (gameId: number) =>
  request<GameResponse>(`/games/${gameId}`)
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

// Training
export const getTrainings = (periodId?: number) =>
  request<TrainingResponse[]>(periodId ? `/trainings?periodId=${periodId}` : '/trainings')
export const createTraining = (data: { date: string; time?: string; location?: string; type?: string }) =>
  request<TrainingResponse>('/trainings', { method: 'POST', body: JSON.stringify(data) })
export const updateTraining = (id: number, data: { date?: string; time?: string; location?: string; cancelled?: boolean }) =>
  request<TrainingResponse>(`/trainings/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTraining = (id: number) =>
  request<void>(`/trainings/${id}`, { method: 'DELETE' })
export const getAttendance = (trainingId: number) =>
  request<TrainingAttendanceResponse[]>(`/trainings/${trainingId}/attendance`)
export const getAllAttendance = (periodId?: number) =>
  request<Record<string, TrainingAttendanceResponse[]>>(periodId ? `/trainings/attendance/all?periodId=${periodId}` : '/trainings/attendance/all')
export const setAttendance = (trainingId: number, entries: { playerId: number; present: boolean }[]) =>
  request<TrainingAttendanceResponse[]>(`/trainings/${trainingId}/attendance`, { method: 'PUT', body: JSON.stringify({ entries }) })
export const createBulkTrainings = (data: { weekdays: number[]; startDate: string; endDate: string; time?: string; weekdayTimes: Record<number, string>; location?: string; weekdayLocations?: Record<number, string>; periodName?: string; type?: string; cycleWeeks?: number; activeWeeksInCycle?: number[]; pcOnlyWeekdays?: number[] }) =>
  request<TrainingResponse[]>('/trainings/bulk', { method: 'POST', body: JSON.stringify(data) })
/**
 * `excludeWeekdays`: ISO-Wochentage (1 = Mo … 7 = So), die nicht mitzählen — für die
 * Trainings-Statistik, wo man einzelne Tage ausblendet.
 * `onlyOpenToAll`: nur Termine, zu denen der ganze Kader geladen war. Das ist die Menge,
 * nach der die Auto-Aufstellung sortiert — der Planer fragt deshalb so an.
 */
export const getTrainingStats = (periodId?: number, since?: string, until?: string,
                                 excludeWeekdays?: number[], onlyOpenToAll?: boolean) => {
  const params = new URLSearchParams()
  if (periodId) params.set('periodId', String(periodId))
  if (since) params.set('since', since)
  if (until) params.set('until', until)
  if (onlyOpenToAll) params.set('onlyOpenToAll', 'true')
  for (const day of excludeWeekdays ?? []) params.append('excludeWeekdays', String(day))
  const qs = params.toString()
  return request<TrainingStatsResponse[]>(`/trainings/stats${qs ? `?${qs}` : ''}`)
}

export const importTrainingCsv = (csv: string, periodName?: string) =>
  request<{ trainingsCreated: number; trainingsSkipped: number; playersNotFound: number }>('/trainings/import', {
    method: 'POST', body: JSON.stringify({ csv, periodName: periodName || null })
  })

// Training Periods
export const getTrainingPeriods = () =>
  request<TrainingPeriodResponse[]>('/trainings/periods')
export const updateTrainingPeriod = (
  id: number,
  data: { name: string; startDate: string; endDate: string; weekdays: number[]; time?: string | null; weekdayTimes: Record<number, string>; location?: string | null; weekdayLocations?: Record<number, string>; cycleWeeks?: number; activeWeeksInCycle?: number[] },
) => request<TrainingPeriodResponse>(`/trainings/periods/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTrainingPeriod = (id: number) =>
  request<void>(`/trainings/periods/${id}`, { method: 'DELETE' })

// Drills
export const getDrills = (focus?: string, maxPlayers?: number) => {
  const params = new URLSearchParams()
  if (focus) params.set('focus', focus)
  if (maxPlayers) params.set('maxPlayers', String(maxPlayers))
  const qs = params.toString()
  return request<DrillResponse[]>(`/drills${qs ? `?${qs}` : ''}`)
}

// Training Plans
export const getTrainingPlansByTrainingId = (trainingId: number) =>
  request<TrainingPlanResponse[]>(`/training-plans/training/${trainingId}`)

export const getTrainingPlansByTrainingIds = (ids: number[]) =>
  request<Record<string, TrainingPlanResponse[]>>(`/training-plans/by-training-ids?ids=${ids.join(',')}`)

export const generateTrainingPlan = async (data: GeneratePlanRequest): Promise<TrainingPlanResponse> => {
  const res = await senden('/training-plans/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  })
  if (res.status === 409) throw new Error('Trainingsplan existiert bereits für dieses Training')
  if (res.status === 503) throw new Error('KI-Trainingsplan nicht verfügbar — API Key fehlt oder Service nicht erreichbar')
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? body?.error ?? `Fehler ${res.status}`)
  }
  return res.json()
}

export const updateTrainingPlan = (id: number, content: TrainingPlanContentResponse) =>
  request<TrainingPlanResponse>(`/training-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })

export const patchPlanSection = (planId: number, sectionIndex: number, drillId: string) =>
  request<TrainingPlanResponse>(`/training-plans/${planId}/sections/${sectionIndex}`, {
    method: 'PATCH',
    body: JSON.stringify({ drillId }),
  })

export const deleteTrainingPlan = (id: number) =>
  request<void>(`/training-plans/${id}`, { method: 'DELETE' })

export const addBeginnerGroup = (planId: number, beginnerCount: number, beginnerFocus?: string) =>
  request<TrainingPlanResponse>(`/training-plans/${planId}/beginner-group`, {
    method: 'POST',
    body: JSON.stringify({ beginnerCount, beginnerFocus: beginnerFocus || null }),
  })

// Live-Scoring
export const getAtBats = (gameId: number) =>
  request<AtBatResponse[]>(`/games/${gameId}/atbats`)
export const recordAtBat = (gameId: number, req: RecordAtBatRequest) =>
  request<AtBatResponse>(`/games/${gameId}/atbats`, { method: 'POST', body: JSON.stringify(req) })
export const undoLastAtBat = (gameId: number) =>
  request<void>(`/games/${gameId}/atbats/last`, { method: 'DELETE' })
export const undoLastAction = (gameId: number) =>
  request<UndoResult>(`/games/${gameId}/scoring/undo`, { method: 'POST' })
export const advanceInning = (gameId: number, opponentRuns: number) =>
  request<InningAdvanceEventResponse>(`/games/${gameId}/scoring/next-inning`, {
    method: 'POST',
    body: JSON.stringify({ opponentRuns }),
  })
export const updateLastBaseState = (gameId: number, data: { first: number | null; second: number | null; third: number | null; runsScored?: number | null; rbi?: number | null }) =>
  request<AtBatResponse>(`/games/${gameId}/atbats/last/base-state`, { method: 'PUT', body: JSON.stringify(data) })
export const resetScoring = (gameId: number) =>
  request<void>(`/games/${gameId}/scoring`, { method: 'DELETE' })
export const deleteCurrentInning = (gameId: number) =>
  request<void>(`/games/${gameId}/scoring/current-inning`, { method: 'DELETE' })
export const recordAutomaticOut = (gameId: number) =>
  request<void>(`/games/${gameId}/scoring/automatic-out`, { method: 'POST' })
export const setGameScore = (gameId: number, scoreUs: number | null, scoreThem: number | null) =>
  request<GameResponse>(`/games/${gameId}/score`, { method: 'PUT', body: JSON.stringify({ scoreUs, scoreThem }) })
export const endGame = (gameId: number) =>
  request<GameResponse>(`/games/${gameId}/end`, { method: 'POST' })
export const reopenGame = (gameId: number) =>
  request<GameResponse>(`/games/${gameId}/reopen`, { method: 'POST' })
export const setBattingSide = (gameId: number, battingSide: 'top' | 'bottom' | null) =>
  request<GameResponse>(`/games/${gameId}/batting-side`, { method: 'PUT', body: JSON.stringify({ battingSide }) })

// Year / All-Time Stats
export const getYearBattingStats = (year: number) =>
  request<PlayerBattingStatsResponse[]>(`/years/${year}/batting-stats`)
export const getYearStats = (year: number) =>
  request<SeasonPlayerStats[]>(`/years/${year}/stats`)
export const getYearSeasons = (year: number) =>
  request<Season[]>(`/years/${year}/seasons`)
export const getAllTimeBattingStats = () =>
  request<PlayerBattingStatsResponse[]>('/stats/all-time/batting')
export const getAllTimeStats = () =>
  request<SeasonPlayerStats[]>('/stats/all-time/games')
export const getOpponentBattingOverview = () =>
  request<OpponentBattingStatsResponse[]>('/stats/opponents')
export const getOpponentBattingStats = (teamName: string) =>
  request<PlayerBattingStatsResponse[]>(`/stats/opponents/batting?team=${encodeURIComponent(teamName)}`)
export const getDistinctYears = () =>
  request<number[]>('/seasons/years')

export const getStealingEvents = (gameId: number) =>
  request<StealingEventResponse[]>(`/games/${gameId}/stealing-events`)
export const recordStealingEvent = (gameId: number, req: RecordStealingEventRequest) =>
  request<StealingEventResponse>(`/games/${gameId}/stealing-events`, { method: 'POST', body: JSON.stringify(req) })
export const deleteStealingEvent = (gameId: number, eventId: number) =>
  request<void>(`/games/${gameId}/stealing-events/${eventId}`, { method: 'DELETE' })

export const getScoreboard = (gameId: number) =>
  request<ScoreboardResponse>(`/games/${gameId}/scoreboard`)

export const startClock = (gameId: number, limitMinutes: number | null) =>
  request<ClockStateResponse>(`/games/${gameId}/clock/start`, { method: 'POST', body: JSON.stringify({ limitMinutes }) })
export const pauseClock = (gameId: number) =>
  request<ClockStateResponse>(`/games/${gameId}/clock/pause`, { method: 'POST' })
export const resumeClock = (gameId: number) =>
  request<ClockStateResponse>(`/games/${gameId}/clock/resume`, { method: 'POST' })
export const resetClock = (gameId: number) =>
  request<ClockStateResponse>(`/games/${gameId}/clock/reset`, { method: 'POST' })

export const getGameBattingStats = (gameId: number) =>
  request<PlayerBattingStatsResponse[]>(`/games/${gameId}/batting-stats`)
export const getGameDayBattingStats = (gameDayId: number) =>
  request<PlayerBattingStatsResponse[]>(`/gamedays/${gameDayId}/batting-stats`)
export const getSeasonBattingStats = (seasonId: number) =>
  request<PlayerBattingStatsResponse[]>(`/seasons/${seasonId}/batting-stats`)

// Substitutions: Mid-Game-Wechsel
export const addSubstitution = (gameId: number, req: { playerOutId: number; playerInId: number; inning: number }) =>
  request<SubstitutionResponse>(`/games/${gameId}/substitutions`, { method: 'POST', body: JSON.stringify(req) })

// Spielbogen
export async function listSpielbogen(filter?: { seasonId?: number; status?: string }): Promise<SpielbogenResponse[]> {
  const qs = new URLSearchParams()
  if (filter?.seasonId) qs.set('seasonId', String(filter.seasonId))
  if (filter?.status) qs.set('status', filter.status)
  return request<SpielbogenResponse[]>(`/spielbogen${qs.toString() ? '?' + qs.toString() : ''}`)
}

export async function createSpielbogen(req: CreateSpielbogenRequest): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>('/spielbogen', { method: 'POST', body: JSON.stringify(req) })
}

export async function getSpielbogen(id: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}`)
}

export async function updateSpielbogen(id: number, req: Partial<CreateSpielbogenRequest>): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}`, { method: 'PATCH', body: JSON.stringify(req) })
}

export async function deleteSpielbogen(id: number): Promise<void> {
  return request<void>(`/spielbogen/${id}`, { method: 'DELETE' })
}

export async function startSpielbogen(id: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}/start`, { method: 'POST' })
}

export async function endSpielbogen(id: number, req?: EndGameRequest): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}/end`, {
    method: 'POST',
    body: JSON.stringify(req ?? {})
  })
}

export async function reopenSpielbogen(id: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${id}/reopen`, { method: 'POST' })
}

export async function getSpielbogenLineup(id: number): Promise<SpielbogenLineupResponse> {
  return request<SpielbogenLineupResponse>(`/spielbogen/${id}/lineup`)
}

export async function setSpielbogenLineup(id: number, req: SetLineupRequest): Promise<SpielbogenSlotResponse[]> {
  return request<SpielbogenSlotResponse[]>(`/spielbogen/${id}/lineup`, {
    method: 'PUT',
    body: JSON.stringify(req)
  })
}

export async function updateSpielbogenSlot(id: number, slotId: number, req: UpdateSlotRequest): Promise<SpielbogenSlotResponse> {
  return request<SpielbogenSlotResponse>(`/spielbogen/${id}/slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(req)
  })
}

export async function copySpielbogenLineupFromGameDay(id: number, req: CopyFromGameDayRequest): Promise<SpielbogenSlotResponse[]> {
  return request<SpielbogenSlotResponse[]>(`/spielbogen/${id}/lineup/copy-from-gameday`, {
    method: 'POST',
    body: JSON.stringify(req)
  })
}

// Spielbogen Scoring
export async function recordSpielbogenAtBat(bogenId: number, req: SpielbogenRecordAtBatRequest): Promise<SpielbogenAtBatResponse> {
  return request<SpielbogenAtBatResponse>(`/spielbogen/${bogenId}/at-bats`, {
    method: 'POST', body: JSON.stringify(req)
  })
}

export async function getSpielbogenAtBats(bogenId: number, side?: BogenSide): Promise<SpielbogenAtBatResponse[]> {
  const qs = side ? `?side=${side}` : ''
  return request<SpielbogenAtBatResponse[]>(`/spielbogen/${bogenId}/at-bats${qs}`)
}

export async function undoLastSpielbogenAtBat(bogenId: number, side: BogenSide): Promise<void> {
  return request<void>(`/spielbogen/${bogenId}/at-bats/last?side=${side}`, { method: 'DELETE' })
}

export async function deleteLastSpielbogenStealing(bogenId: number, side: BogenSide): Promise<void> {
  await request<void>(`/spielbogen/${bogenId}/stealing/last?side=${side}`, { method: 'DELETE' })
}

export async function recordSpielbogenStealing(bogenId: number, req: SpielbogenRecordStealingRequest): Promise<SpielbogenStealingResponse> {
  return request<SpielbogenStealingResponse>(`/spielbogen/${bogenId}/stealing-events`, {
    method: 'POST', body: JSON.stringify(req)
  })
}

export async function recordSpielbogenSubstitution(bogenId: number, req: SpielbogenRecordSubstitutionRequest): Promise<SpielbogenSubstitutionResponse> {
  return request<SpielbogenSubstitutionResponse>(`/spielbogen/${bogenId}/substitutions`, {
    method: 'POST', body: JSON.stringify(req)
  })
}

export async function recordSpielbogenPositionSwap(bogenId: number, req: SpielbogenRecordPositionSwapRequest): Promise<SpielbogenPositionChangeResponse[]> {
  return request<SpielbogenPositionChangeResponse[]>(`/spielbogen/${bogenId}/position-swaps`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function switchSpielbogenSide(bogenId: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${bogenId}/switch-side`, { method: 'POST' })
}

export async function getSpielbogenSheet(bogenId: number): Promise<BogenSheetResponse> {
  return request<BogenSheetResponse>(`/spielbogen/${bogenId}/sheet`)
}

export async function resetSpielbogenScoring(bogenId: number): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${bogenId}/reset`, { method: 'POST' })
}

export const startSpielbogenClock = (bogenId: number, limitMinutes: number | null) =>
  request<ClockStateResponse>(`/spielbogen/${bogenId}/clock/start`, { method: 'POST', body: JSON.stringify({ limitMinutes }) })
export const pauseSpielbogenClock = (bogenId: number) =>
  request<ClockStateResponse>(`/spielbogen/${bogenId}/clock/pause`, { method: 'POST' })
export const resumeSpielbogenClock = (bogenId: number) =>
  request<ClockStateResponse>(`/spielbogen/${bogenId}/clock/resume`, { method: 'POST' })
export const resetSpielbogenClock = (bogenId: number) =>
  request<ClockStateResponse>(`/spielbogen/${bogenId}/clock/reset`, { method: 'POST' })

export interface LeagueResultLite {
  id: number
  homeTeam: { id: number; name: string; ownTeam: boolean }
  awayTeam: { id: number; name: string; ownTeam: boolean }
  homeScore: number
  awayScore: number
  date: string
}

export async function registerSpielbogenLeagueResult(bogenId: number): Promise<LeagueResultLite> {
  return request<LeagueResultLite>(`/spielbogen/${bogenId}/register-league-result`, { method: 'POST' })
}

export async function setSpielbogenCurrentSide(bogenId: number, side: BogenSide): Promise<SpielbogenResponse> {
  return request<SpielbogenResponse>(`/spielbogen/${bogenId}/set-side?side=${side}`, { method: 'POST' })
}

export async function correctLastSpielbogenAtBat(
  bogenId: number,
  side: BogenSide,
  payload: { firstSlotId: number | null; secondSlotId: number | null; thirdSlotId: number | null; runsScored: number; runnerAdvances?: RunnerAdvanceEntry[] }
): Promise<SpielbogenAtBatResponse> {
  return request<SpielbogenAtBatResponse>(
    `/spielbogen/${bogenId}/at-bats/last?side=${side}`,
    { method: 'PATCH', body: JSON.stringify(payload) }
  )
}

export const getInvitations = () =>
  request<InvitationResponse[]>(`/invitations`)
export const getInvitation = (id: number) =>
  request<InvitationResponse>(`/invitations/${id}`)
export const createInvitation = (data: InvitationRequest) =>
  request<InvitationResponse>(`/invitations`, { method: 'POST', body: JSON.stringify(data) })
export const updateInvitation = (id: number, data: InvitationRequest) =>
  request<InvitationResponse>(`/invitations/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const duplicateInvitation = (id: number) =>
  request<InvitationResponse>(`/invitations/${id}/duplicate`, { method: 'POST' })
export const deleteInvitation = (id: number) =>
  request<void>(`/invitations/${id}`, { method: 'DELETE' })

// WhatsApp-Umfragen
export const getWhatsappStatus = () =>
  request<WhatsappAccountStatus>('/orga/whatsapp/status')
export const getWhatsappQr = () =>
  request<{ qr: string | null }>('/orga/whatsapp/qr')
export const getWhatsappGroups = () =>
  request<WhatsappGroup[]>('/orga/whatsapp/groups')
export const getWhatsappPolls = () =>
  request<WhatsappPollResponse[]>('/orga/whatsapp/polls')
export const createWhatsappPoll = (data: WhatsappPollRequest) =>
  request<WhatsappPollResponse>('/orga/whatsapp/polls', { method: 'POST', body: JSON.stringify(data) })
export const updateWhatsappPoll = (id: number, data: WhatsappPollRequest) =>
  request<WhatsappPollResponse>(`/orga/whatsapp/polls/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteWhatsappPoll = (id: number) =>
  request<void>(`/orga/whatsapp/polls/${id}`, { method: 'DELETE' })
export const sendWhatsappPollNow = (id: number) =>
  request<void>(`/orga/whatsapp/polls/${id}/send-now`, { method: 'POST' })
export const resetWhatsappPollSent = (id: number) =>
  request<WhatsappPollResponse>(`/orga/whatsapp/polls/${id}/reset-sent`, { method: 'POST' })
export const addWhatsappPollSkipDate = (id: number, date: string) =>
  request<WhatsappPollResponse>(`/orga/whatsapp/polls/${id}/skip-dates`, { method: 'POST', body: JSON.stringify({ date }) })
export const removeWhatsappPollSkipDate = (id: number, date: string) =>
  request<WhatsappPollResponse>(`/orga/whatsapp/polls/${id}/skip-dates/${date}`, { method: 'DELETE' })
export const getUnknownVoters = () =>
  request<UnknownVoter[]>('/orga/whatsapp/unknown-voters')
export const syncWhatsappVotes = () =>
  request<{ synced: number }>('/orga/whatsapp/sync', { method: 'POST' })
export const assignVoter = (voterName: string, playerId: number) =>
  request<Player>('/orga/whatsapp/assign', { method: 'POST', body: JSON.stringify({ voterName, playerId }) })
export const assignNewVoter = (voterName: string, playerName: string) =>
  request<Player>('/orga/whatsapp/assign-new', { method: 'POST', body: JSON.stringify({ voterName, playerName }) })
export const unassignVoter = (playerId: number) =>
  request<Player>('/orga/whatsapp/unassign', { method: 'POST', body: JSON.stringify({ playerId }) })

// --- Trainerabrechnung ---

/** `undefined`, solange die Stammdaten nicht eingetragen sind (204 vom Backend). */
export const getCoachBillingProfile = () =>
  request<CoachBillingProfile | undefined>('/coach-billing/profile')

export const updateCoachBillingProfile = (profile: CoachBillingProfile) =>
  request<CoachBillingProfile>('/coach-billing/profile', { method: 'PUT', body: JSON.stringify(profile) })

// Eigenes Konto
export const changeUsername = (username: string) =>
  request<MeResponse>('/me/username', { method: 'PUT', body: JSON.stringify({ username }) })
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<MeResponse>('/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) })

// Accountverwaltung — kein Endpunkt nimmt ein Passwort entgegen, es kommt aus der Konfiguration
export const getUsers = () => request<UserAccount[]>('/users')
export const createUser = (playerId: number) =>
  request<UserAccount>('/users', { method: 'POST', body: JSON.stringify({ playerId }) })
export const bulkCreateUsers = () => request<BulkCreateResult>('/users/bulk-create', { method: 'POST' })
export const resetUserPassword = (id: number) =>
  request<UserAccount>(`/users/${id}/password-reset`, { method: 'PUT' })
export const setUserRole = (id: number, role: Role) =>
  request<UserAccount>(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
export const setUserMayScore = (id: number, mayScore: boolean) =>
  request<UserAccount>(`/users/${id}/may-score`, { method: 'PUT', body: JSON.stringify({ mayScore }) })
export const setUserLocked = (id: number, locked: boolean) =>
  request<UserAccount>(`/users/${id}/locked`, { method: 'PUT', body: JSON.stringify({ locked }) })
export const deleteUser = (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' })

// Historie (nur Superadmin). Der Verlauf hat keine Seitenbildung, aber eine Obergrenze:
// immer mit Zeitraum fragen, und `abgeschnitten` der Antwort beachten.
export const getAudit = (filter: { userId?: number; from?: string; to?: string; kind?: AuditKind }) => {
  const q = new URLSearchParams()
  if (filter.userId !== undefined) q.set('userId', String(filter.userId))
  if (filter.from) q.set('from', filter.from)
  if (filter.to) q.set('to', filter.to)
  if (filter.kind) q.set('kind', filter.kind)
  const query = q.toString()
  return request<AuditVerlauf>(`/audit${query ? `?${query}` : ''}`)
}
export const getLastSeen = () => request<LastSeen[]>('/audit/last-seen')
