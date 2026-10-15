import { describe, it, expect } from 'vitest'
import { countUntil, trainingYearFilterLabel, trainingYearLabel, trainingYearStart, trainingYearTitle } from './trainingYear'

describe('trainingYearStart', () => {
  it('nimmt den 1. November desselben Jahres, sobald November erreicht ist', () => {
    expect(trainingYearStart('2026-11-01')).toBe('2026-11-01')
    expect(trainingYearStart('2026-11-20')).toBe('2026-11-01')
    expect(trainingYearStart('2026-12-24')).toBe('2026-11-01')
  })

  it('greift vor November auf das Vorjahr zurück', () => {
    expect(trainingYearStart('2026-10-31')).toBe('2025-11-01')
    expect(trainingYearStart('2027-01-10')).toBe('2026-11-01')
    expect(trainingYearStart('2027-02-14')).toBe('2026-11-01')
    expect(trainingYearStart('2027-10-31')).toBe('2026-11-01')
  })

  it('zieht das Fenster über die Saison auf statt es mitzuschieben', () => {
    // Februar-Turnier und Oktober-Spieltag desselben Trainingsjahres teilen den Anfang —
    // deshalb waechst das Fenster, statt wie ein rollendes Fenster hinten abzuschneiden.
    expect(trainingYearStart('2027-02-14')).toBe(trainingYearStart('2027-10-03'))
  })
})

describe('trainingYearLabel', () => {
  it('benennt das Trainingsjahr wie die Perioden', () => {
    expect(trainingYearLabel('2026-11-01')).toBe('26/27')
    expect(trainingYearLabel('2027-02-14')).toBe('26/27')
    expect(trainingYearLabel('2027-10-03')).toBe('26/27')
  })

  it('rollt am 1. November weiter', () => {
    expect(trainingYearLabel('2026-10-31')).toBe('25/26')
    expect(trainingYearLabel('2026-11-01')).toBe('26/27')
    expect(trainingYearLabel('2027-11-01')).toBe('27/28')
  })

  it('haelt die Jahrhundertwende zweistellig', () => {
    expect(trainingYearLabel('2099-11-01')).toBe('99/00')
    expect(trainingYearLabel('2100-11-01')).toBe('00/01')
  })
})

describe('Abgrenzung zur einzelnen Trainingsperiode', () => {
  it('stellt "Jahr" voran, damit 26/27 nicht nach der Wintersaison aussieht', () => {
    // Blank stuende "26/27" neben Perioden wie "Wintersaison 25/26" und waere als eine
    // einzelne Periode lesbar. Gemeint sind aber Winter UND Sommer zusammen.
    expect(trainingYearFilterLabel('2027-02-14')).toBe('Jahr 26/27')
  })

  it('schreibt im Tooltip aus, dass beide Saisons drinstecken', () => {
    expect(trainingYearTitle('2027-02-14'))
      .toBe('Trainingsjahr 26/27 — Winter und Sommer zusammen, ab 1.11.2026')
  })
})

describe('countUntil', () => {
  it('zählt bis zum Spieltag, wenn der schon vorbei ist', () => {
    expect(countUntil('2026-06-20', '2026-10-15')).toBe('2026-06-20')
  })

  it('zählt nie über heute hinaus', () => {
    // Zwischen heute und einem geplanten Spieltag stehen schon Trainings in der DB.
    // Bei denen kann niemand gewesen sein — sie wuerden den Nenner aufblaehen.
    expect(countUntil('2026-11-07', '2026-10-15')).toBe('2026-10-15')
  })

  it('nimmt den Spieltag selbst, wenn er heute ist', () => {
    expect(countUntil('2026-10-15', '2026-10-15')).toBe('2026-10-15')
  })
})
