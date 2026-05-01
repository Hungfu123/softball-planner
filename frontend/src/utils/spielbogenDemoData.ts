import type { CreateSpielbogenRequest, SetLineupRequest } from '@/types'

const KREFELD_NAMES = ['Olaf', 'Allie', 'Ben', 'Nils', 'Gregor', 'Daniel', 'Hanne', 'Percy', 'Carina', 'David']
const COLOGNE_NAMES = ['Max', 'Tim', 'Pascal', 'Orlando', 'Laura', 'Jochen', 'Andrea', 'Patrick', 'Alberto', 'Marion']
const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']

const HOME_TEAMS = ['Cologne Cardinals', 'Wuppertal Hilbillies', 'Krefeld Crows', 'Cologne Mixed Cards']
const AWAY_TEAMS = ['Krefeld Crows', 'Cologne Cardinals', 'Wuppertal Hilbillies', 'Cologne Mixed Cards']
const LOCATIONS = ['Krefeld', 'Wuppertal', 'Köln']

function buildLineup(names: string[]): SetLineupRequest['slots'] {
  return Array.from({ length: 10 }, (_, i) => {
    if (i < 9) {
      return {
        slot: i + 1,
        name: names[i % names.length],
        position: POSITIONS[i] ?? null,
        battingOrder: i + 1,
      }
    }
    return {
      slot: i + 1,
      name: '',
      position: null,
      battingOrder: i + 1,
    }
  })
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function buildDemoWizardData(): {
  meta: Partial<CreateSpielbogenRequest>
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
} {
  const today = new Date().toISOString().slice(0, 10)
  const homeIdx = Math.floor(Math.random() * HOME_TEAMS.length)
  let awayIdx = Math.floor(Math.random() * AWAY_TEAMS.length)
  if (AWAY_TEAMS[awayIdx] === HOME_TEAMS[homeIdx]) {
    awayIdx = (awayIdx + 1) % AWAY_TEAMS.length
  }

  return {
    meta: {
      date: today,
      location: pick(LOCATIONS),
      homeTeamName: HOME_TEAMS[homeIdx]!,
      awayTeamName: AWAY_TEAMS[awayIdx]!,
    },
    homeLineup: buildLineup(shuffle(COLOGNE_NAMES)),
    awayLineup: buildLineup(shuffle(KREFELD_NAMES)),
  }
}
