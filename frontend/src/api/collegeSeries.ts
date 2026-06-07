// Live-Daten der College Series aus der externen strikeout-scoring.com API.
// Reine Anzeige, kein Speichern. Browser fetcht direkt (deren CORS ist offen: *).
// Anonymer Fetch — keine Custom-Header.

const BASE_URL = 'https://api.strikeout-scoring.com/index.php'
const LEAGUE_ID = '243398103'
const SEASON_ID = '455890221'
const DEAD_SOX_TEAM_ID = '406716409'

// Erkennt die College-Series-Season der App am Namen (Gate für die Anzeige).
export function isCollegeSeriesSeason(name: string | undefined | null): boolean {
  return (name ?? '').toLowerCase().includes('college series')
}

// Team-Farb-Token der externen API → Hex (für farbige Team-Punkte).
const TEAM_COLOR_HEX: Record<string, string> = {
  royal: '#2563EB',
  navy: '#111B6B',
  green: '#16A34A',
  scarlett: '#CC2936',
  none: '#B6AB92',
}
export function teamColorHex(token: string | undefined | null): string {
  return TEAM_COLOR_HEX[(token ?? '').toLowerCase()] ?? TEAM_COLOR_HEX.none
}

// Voller Logo-URL aus dem Logo-Dateinamen der API (oder null).
const LOGO_BASE = 'https://api.strikeout-scoring.com/uploads/'
export function teamLogoUrl(file: string | null | undefined): string | null {
  return file ? `${LOGO_BASE}${file}` : null
}

// ---------- Standings ----------

export interface CollegeSeriesRow {
  teamId: string
  name: string
  color: string
  logo: string | null
  tlc: string
  games: number
  wins: number
  losses: number
  winPct: number
  runsScored: number
  runsAgainst: number
  runDiff: number
  isOwnTeam: boolean
}

interface RawMember {
  teamID?: string; name?: string; color?: string; logo?: string; tlc?: string
  g?: string; w?: string; l?: string; wperc?: string
  rs?: string; ra?: string; rd?: string
}

function num(s: string | undefined): number {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function parseStandings(data: unknown): CollegeSeriesRow[] {
  const stages = (data as { standings?: unknown[] } | null)?.standings ?? []
  const members: RawMember[] = []
  for (const stage of stages as Array<{ rsStandings?: Array<{ members?: RawMember[] }> }>) {
    for (const group of stage?.rsStandings ?? []) {
      for (const m of group?.members ?? []) members.push(m)
    }
  }
  const rows: CollegeSeriesRow[] = members.map((m) => ({
    teamId: String(m.teamID ?? ''),
    name: String(m.name ?? ''),
    color: String(m.color ?? 'none'),
    logo: m.logo ? String(m.logo) : null,
    tlc: String(m.tlc ?? ''),
    games: num(m.g),
    wins: num(m.w),
    losses: num(m.l),
    winPct: num(m.wperc),
    runsScored: num(m.rs),
    runsAgainst: num(m.ra),
    runDiff: num(m.rd),
    isOwnTeam: String(m.teamID ?? '') === DEAD_SOX_TEAM_ID,
  }))
  rows.sort((a, b) => b.winPct - a.winPct || b.runDiff - a.runDiff)
  return rows
}

// ---------- Schedule ----------

export interface CollegeSeriesGame {
  id: string
  stage: string                // 'Vorrunde' / 'Endrunde' …
  date: string | null          // 'YYYY-MM-DD' oder null (tba)
  matchdayLabel: string        // 'DD.MM.' oder 'TBA'
  home: string
  away: string
  homeColor: string
  awayColor: string
  homeLogo: string | null
  awayLogo: string | null
  homeTlc: string
  awayTlc: string
  homeScore: number | null
  awayScore: number | null
  isFinal: boolean
  involvesOwn: boolean         // Dead Sox beteiligt
  ownIsHome: boolean
}

interface RawGame {
  ID?: string
  homeTeamID?: string; awayTeamID?: string
  homeTeamName?: string; awayTeamName?: string
  homeTeamColor?: string; awayTeamColor?: string
  homeTeamLogoURL?: string; awayTeamLogoURL?: string
  homeTeamTlc?: string; awayTeamTlc?: string
  homeScore?: string; awayScore?: string
  status?: string; gameDate?: string
}

function epochToDate(epoch: string | undefined): string | null {
  if (!epoch) return null
  const n = Number(epoch)
  if (!Number.isFinite(n)) return null
  // Europe/Berlin: Spieltage stehen lokal; einfache UTC->ISO-Tagesableitung reicht hier.
  const d = new Date(n * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function intOrNull(s: string | undefined): number | null {
  if (s === undefined || s === null || s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function parseSchedule(data: unknown): CollegeSeriesGame[] {
  const stages = (data as { stages?: unknown[] } | null)?.stages ?? []
  const games: CollegeSeriesGame[] = []
  for (const stage of stages as Array<{ name?: string; games?: RawGame[] }>) {
    const stageName = String(stage?.name ?? '')
    for (const g of stage?.games ?? []) {
      const date = epochToDate(g.gameDate)
      const ownIsHome = String(g.homeTeamID ?? '') === DEAD_SOX_TEAM_ID
      const ownIsAway = String(g.awayTeamID ?? '') === DEAD_SOX_TEAM_ID
      games.push({
        id: String(g.ID ?? `${g.homeTeamID}-${g.awayTeamID}-${g.gameDate}`),
        stage: stageName,
        date,
        matchdayLabel: date ? `${date.slice(8, 10)}.${date.slice(5, 7)}.` : 'TBA',
        home: String(g.homeTeamName ?? ''),
        away: String(g.awayTeamName ?? ''),
        homeColor: String(g.homeTeamColor ?? 'none'),
        awayColor: String(g.awayTeamColor ?? 'none'),
        homeLogo: g.homeTeamLogoURL ? String(g.homeTeamLogoURL) : null,
        awayLogo: g.awayTeamLogoURL ? String(g.awayTeamLogoURL) : null,
        homeTlc: String(g.homeTeamTlc ?? ''),
        awayTlc: String(g.awayTeamTlc ?? ''),
        homeScore: intOrNull(g.homeScore),
        awayScore: intOrNull(g.awayScore),
        isFinal: (g.status ?? '').toLowerCase() === 'final',
        involvesOwn: ownIsHome || ownIsAway,
        ownIsHome,
      })
    }
  }
  // chronologisch; tba ans Ende
  games.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
  return games
}

// ---------- Fetch ----------

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`College-Series API Fehler ${res.status}`)
  return res.json()
}

export async function fetchCollegeSeriesStandings(): Promise<CollegeSeriesRow[]> {
  return parseStandings(await getJson(`/league/standings/${LEAGUE_ID}/${SEASON_ID}`))
}

export async function fetchCollegeSeriesSchedule(): Promise<CollegeSeriesGame[]> {
  return parseSchedule(await getJson(`/schedule/league/${LEAGUE_ID}/${SEASON_ID}`))
}
