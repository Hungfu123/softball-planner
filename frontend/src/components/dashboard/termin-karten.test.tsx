import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Termin } from '@/hooks/useTermine'
import { NaechstesTraining } from './NaechstesTraining'
import { JahresBand } from './JahresBand'

/*
 * Beide Karten nehmen ihre Termine als Prop — deshalb kein API-Mock, sondern echte
 * Daten und eine festgenagelte Uhr. "Naechstes" und "noch offen" haengen am HEUTE;
 * ohne feste Zeit waere jeder dieser Tests in ein paar Monaten etwas anderes.
 */
const HEUTE = new Date('2026-06-15T10:00:00')

function training(datum: string, extra: Partial<Termin> = {}): Termin {
  return { id: 1, art: 'TRAINING', datum, titel: 'Training', ort: 'Halle Nord', zeit: '19:00', ...extra }
}
function spieltag(datum: string, extra: Partial<Termin> = {}): Termin {
  return { id: 2, art: 'SPIELTAG', datum, titel: 'vs Berlin Bears', ort: 'Bottrop', zeit: null, ...extra }
}

function zeigeTraining(termine: Termin[], laden = false, fehler = false) {
  return render(
    <MemoryRouter><NaechstesTraining termine={termine} laden={laden} fehler={fehler} /></MemoryRouter>,
  )
}
function zeigeBand(termine: Termin[], laden = false, fehler = false) {
  return render(
    <MemoryRouter><JahresBand termine={termine} laden={laden} fehler={fehler} /></MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(HEUTE)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Nächstes Training', () => {
  it('nimmt den nächsten Termin ab heute, nicht den ersten der Liste', () => {
    zeigeTraining([training('2026-09-01', { id: 3 }), training('2026-06-18', { id: 4 }), training('2026-01-10', { id: 5 })])
    const karte = screen.getByRole('region', { name: 'Nächstes Training' })
    expect(within(karte).getByText(/Do · 18\. Jun/)).toBeInTheDocument()
    // Der Satz ist auf mehrere Textknoten verteilt — gegen den Gesamttext pruefen.
    expect(karte.textContent).toMatch(/Danach .*01\. Sep/)
  })

  it('zählt ein Training heute noch mit — der Tag ist nicht vorbei, nur weil er angefangen hat', () => {
    zeigeTraining([training('2026-06-15')])
    const karte = screen.getByRole('region', { name: 'Nächstes Training' })
    expect(within(karte).getByText('Heute')).toBeInTheDocument()
  })

  it('zeigt Uhrzeit und Ort, aber keine Zahl zur Beteiligung', () => {
    zeigeTraining([training('2026-06-18')])
    const karte = screen.getByRole('region', { name: 'Nächstes Training' })
    expect(within(karte).getByText('19:00')).toBeInTheDocument()
    expect(within(karte).getByText('Halle Nord')).toBeInTheDocument()
    expect(within(karte).queryByText(/Beteiligung|Anwesend|Teilnehmer|%/)).not.toBeInTheDocument()
  })

  /*
   * Ein verirrter Termin (im Datenbestand lag einer im Jahr 2090) hat "In 3307 Wochen"
   * erzeugt. Jenseits von etwa zwei Monaten traegt das Datum allein — dann aber mit Jahr,
   * sonst stuende dort "15. Mär" fuer etwas, das 64 Jahre entfernt ist.
   */
  it('sagt bei weit entfernten Terminen das Jahr statt einer Wochenzahl', () => {
    zeigeTraining([training('2090-03-15')])
    const karte = screen.getByRole('region', { name: 'Nächstes Training' })
    expect(karte.textContent).toMatch(/15\. März 2090/)
    expect(karte.textContent).not.toMatch(/In \d+ Wochen/)
  })

  it('übergeht Vergangenes und sagt, dass nichts ansteht', () => {
    zeigeTraining([training('2026-01-10')])
    const karte = screen.getByRole('region', { name: 'Nächstes Training' })
    expect(within(karte).getByText(/Kein Training angesetzt/)).toBeInTheDocument()
  })

  /* Ein Ausfall ist nicht "nichts angesetzt" — die beiden duerfen sich nicht gleich lesen. */
  it('unterscheidet „nicht erreichbar" von „nichts angesetzt"', () => {
    zeigeTraining([], false, true)
    const karte = screen.getByRole('region', { name: 'Nächstes Training' })
    expect(within(karte).getByText(/nicht erreichbar/)).toBeInTheDocument()
    expect(within(karte).queryByText(/Kein Training angesetzt/)).not.toBeInTheDocument()
  })
})

describe('Dein Jahr', () => {
  it('zählt nur das laufende Jahr und nur, was noch kommt', () => {
    zeigeBand([
      spieltag('2026-03-01', { id: 1 }),   // vorbei
      spieltag('2026-07-04', { id: 2 }),   // offen
      spieltag('2026-08-09', { id: 3 }),   // offen
      training('2026-06-20', { id: 4 }),   // offen
      training('2025-07-01', { id: 5 }),   // anderes Jahr
      spieltag('2027-05-05', { id: 6 }),   // anderes Jahr
    ])
    const karte = screen.getByRole('region', { name: 'Termine 2026' })
    expect(within(karte).getByText(/Noch offen:/)).toBeInTheDocument()
    const text = karte.textContent ?? ''
    expect(text).toMatch(/2\s*Spieltage/)
    expect(text).toMatch(/1\s*Training/)
  })

  it('beschriftet jeden Monat mit seiner Anzahl, auch den leeren', () => {
    zeigeBand([spieltag('2026-07-04'), training('2026-07-08', { id: 9 })])
    const karte = screen.getByRole('region', { name: 'Termine 2026' })
    expect(within(karte).getByTitle('Juli: 1 Spieltage, 1 Trainings')).toBeInTheDocument()
    expect(within(karte).getByTitle('Januar: nichts angesetzt')).toBeInTheDocument()
  })

  it('bleibt bei leerem Jahr stehen statt zu verschwinden', () => {
    zeigeBand([])
    const karte = screen.getByRole('region', { name: 'Termine 2026' })
    expect(within(karte).getByTitle('Dezember: nichts angesetzt')).toBeInTheDocument()
    expect(karte.textContent).toMatch(/0\s*Spieltage/)
  })
})
