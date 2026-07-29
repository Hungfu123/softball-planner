import { describe, expect, it } from 'vitest'
import {
  awayTemplate, homeTemplate, defaultSendDate,
  matchingTemplateKind, isTemplateUnmodified, refreshTemplateDateFields, NEUTRAL_TEMPLATE_FIELDS,
} from './pollTemplates'
import type { GameDayResponse } from '@/types'

const gameDay = {
  id: 42, date: '2026-08-09', label: 'CoSe Spieltag', location: 'Aachen',
  seasonId: 1, availablePlayers: [], games: [],
} as GameDayResponse

const otherGameDay = {
  id: 43, date: '2026-08-16', label: 'Heimspieltag', location: null,
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

  it('matchingTemplateKind erkennt die Auswärts-Vorlage', () => {
    expect(matchingTemplateKind(awayTemplate(gameDay), gameDay)).toBe('AWAY')
  })

  it('matchingTemplateKind erkennt die Heim-Vorlage', () => {
    expect(matchingTemplateKind(homeTemplate(gameDay), gameDay)).toBe('HOME')
  })

  it('matchingTemplateKind liefert null bei manuell getipptem Inhalt', () => {
    const manual = { title: 'Eigener Titel', message: 'Eigener Text', options: ['A', 'B'], allowMultipleAnswers: false }
    expect(matchingTemplateKind(manual, gameDay)).toBeNull()
  })

  it('isTemplateUnmodified: true solange Felder exakt der Vorlage entsprechen', () => {
    expect(isTemplateUnmodified('AWAY', awayTemplate(gameDay), gameDay)).toBe(true)
  })

  it('isTemplateUnmodified: false sobald ein Feld editiert wurde', () => {
    const edited = { ...awayTemplate(gameDay), title: 'Geändert' }
    expect(isTemplateUnmodified('AWAY', edited, gameDay)).toBe(false)
  })

  it('refreshTemplateDateFields: Frage und Nachricht folgen dem neuen Spieltag, wenn unverändert', () => {
    const current = { title: awayTemplate(gameDay).title, message: awayTemplate(gameDay).message }
    const next = refreshTemplateDateFields('AWAY', current, gameDay, otherGameDay)
    expect(next).toEqual({ title: awayTemplate(otherGameDay).title, message: awayTemplate(otherGameDay).message })
  })

  it('refreshTemplateDateFields: eigene Nachricht bleibt erhalten, Frage zieht nach', () => {
    const current = { title: awayTemplate(gameDay).title, message: 'Eigene Nachricht' }
    const next = refreshTemplateDateFields('AWAY', current, gameDay, otherGameDay)
    expect(next).toEqual({ title: awayTemplate(otherGameDay).title, message: 'Eigene Nachricht' })
  })

  it('NEUTRAL_TEMPLATE_FIELDS entspricht dem neutralen Ausgangszustand (blankDraft)', () => {
    expect(NEUTRAL_TEMPLATE_FIELDS).toEqual({
      title: '', options: ['Ja', 'Nein', 'Vielleicht'], allowMultipleAnswers: false, message: null,
    })
  })
})
