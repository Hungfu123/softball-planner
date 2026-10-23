import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OrgaHome } from './OrgaHome'

describe('OrgaHome', () => {
  it.each([
    ['Counter', '/counter'],
    ['WhatsApp-Umfragen', '/orga/whatsapp-umfrage'],
    ['Trainerabrechnung', '/orga/trainerabrechnung'],
    ['Kalender', '/kalender'],
    ['Einladungen', '/orga/einladungen'],
    ['Playmaker', '/orga/playmaker'],
    ['Spielbogen', '/spielbogen'],
  ])('Kachel %s zeigt auf %s', (name, ziel) => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', ziel)
  })

  it('zeigt die drei Blöcke in der Reihenfolge oben, Weiteres, Selten', () => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    const ueberschriften = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
    expect(ueberschriften).toEqual(['Weiteres', 'Selten'])
  })

  it('nennt den Zähler Counter', () => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /Zähler/ })).toBeNull()
  })

  it('hat keine Gegner-Kachel — der Navigations-Tab GEGNER ist der Einstieg', () => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /Gegner/ })).toBeNull()
  })
})
