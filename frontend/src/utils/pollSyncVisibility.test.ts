import { describe, it, expect } from 'vitest'
import { shouldShowPollSyncButton } from './pollSyncVisibility'
import type { GameDayVotePreview } from '@/types'

// GameDayPlanner selbst voll zu rendern würde useGameDay, useLineup (522 Zeilen),
// useStaff, usePlayers, useLineupSets, mehrere Router-Hooks und ein Dutzend
// api-Calls in useEffects mocken müssen — unverhältnismäßig viel Aufwand für zwei
// Zeilen Sichtbarkeitslogik. Stattdessen testen wir die extrahierte, reine
// Sichtbarkeits-Funktion direkt (deckt die zwei Fälle aus dem Brief ab: Button
// nur bei gesendeter Umfrage, kein Button ohne Umfrage).
function preview(overrides: Partial<GameDayVotePreview>): GameDayVotePreview {
  return {
    pollExists: false,
    sent: false,
    toAdd: [],
    toRemove: [],
    optionVoters: [],
    unknownVoters: [],
    voteCount: 0,
    yesCount: 0,
    ...overrides,
  }
}

describe('shouldShowPollSyncButton', () => {
  it('zeigt den Button, wenn eine Umfrage existiert und gesendet wurde', () => {
    const status = preview({ pollExists: true, sent: true, unknownVoters: ['Sandra W.'], voteCount: 3, yesCount: 2 })
    expect(shouldShowPollSyncButton(status)).toBe(true)
  })

  it('versteckt den Button ohne Umfrage', () => {
    expect(shouldShowPollSyncButton(preview({ pollExists: false, sent: false }))).toBe(false)
  })

  it('versteckt den Button, solange die Umfrage noch nicht gesendet wurde', () => {
    expect(shouldShowPollSyncButton(preview({ pollExists: true, sent: false }))).toBe(false)
  })

  it('versteckt den Button, solange der Poll-Status noch nicht geladen ist', () => {
    expect(shouldShowPollSyncButton(null)).toBe(false)
  })
})
