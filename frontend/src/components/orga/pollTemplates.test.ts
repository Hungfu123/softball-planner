import { describe, expect, it } from 'vitest'
import { awayTemplate, homeTemplate, defaultSendDate } from './pollTemplates'
import type { GameDayResponse } from '@/types'

const gameDay = {
  id: 42, date: '2026-08-09', label: 'CoSe Spieltag', location: 'Aachen',
  seasonId: 1, availablePlayers: [], games: [],
} as GameDayResponse

describe('pollTemplates', () => {
  it('Auswärts-Vorlage: Ja-Option zuerst, Mehrfachauswahl, Ort im Titel', () => {
    const t = awayTemplate(gameDay)
    expect(t.options[0]).toBe('Ja ich will spielen')
    expect(t.options).toHaveLength(3)
    expect(t.allowMultipleAnswers).toBe(true)
    expect(t.title).toContain('Aachen')
    expect(t.message).toContain('Sonntag')
  })

  it('Heim-Vorlage: Ja-Option zuerst, Einzelauswahl', () => {
    const t = homeTemplate(gameDay)
    expect(t.options[0]).toBe('Ja, ich spiele (und helfe natürlich mit)')
    expect(t.allowMultipleAnswers).toBe(false)
    expect(t.title).toContain('09.08.')
  })

  it('Sendedatum ist 7 Tage vor dem Spieltag', () => {
    expect(defaultSendDate('2026-08-09', '2026-07-29')).toBe('2026-08-02')
  })

  it('Sendedatum wird auf heute geklemmt, wenn Spieltag näher als 7 Tage ist', () => {
    expect(defaultSendDate('2026-08-01', '2026-07-29')).toBe('2026-07-29')
  })
})
