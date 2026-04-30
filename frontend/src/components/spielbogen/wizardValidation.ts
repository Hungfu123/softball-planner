import type { CreateSpielbogenRequest, SetLineupRequest } from '@/types'

export function metaIsValid(meta: Partial<CreateSpielbogenRequest>): boolean {
  return !!(meta.date && meta.homeTeamName?.trim() && meta.awayTeamName?.trim()
            && meta.homeTeamName.trim() !== meta.awayTeamName.trim())
}

export function lineupIsValid(homeLineup: SetLineupRequest['slots'], awayLineup: SetLineupRequest['slots']): boolean {
  const filledHome = homeLineup.filter(s => s.name.trim()).length
  const filledAway = awayLineup.filter(s => s.name.trim()).length
  return filledHome >= 9 && filledAway >= 9
}
