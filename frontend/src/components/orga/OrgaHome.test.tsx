import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MeResponse } from '@/types'
import { OrgaHome } from './OrgaHome'

const auth = vi.hoisted(() => ({ me: null as MeResponse | null }))
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ me: auth.me }) }))

const ADMIN: MeResponse = { username: 'anna', role: 'ADMIN', playerId: 3, playerName: 'Anna Adler', mayScore: false, passwordChanged: true }
const SUPER: MeResponse = { ...ADMIN, username: 'hung', role: 'SUPERADMIN' }

beforeEach(() => { auth.me = SUPER })

describe('OrgaHome', () => {
  it.each([
    ['Counter', '/counter'],
    ['WhatsApp-Umfragen', '/orga/whatsapp-umfrage'],
    ['Trainerabrechnung', '/orga/trainerabrechnung'],
    ['Kalender', '/kalender'],
    ['Einladungen', '/orga/einladungen'],
    ['Accounts', '/orga/accounts'],
    ['Spielbogen', '/spielbogen'],
    ['Historie', '/orga/historie'],
    ['Spielwissen', '/spielwissen'],
  ])('Kachel %s zeigt auf %s', (name, ziel) => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', ziel)
  })

  /*
   * EINE Tür zum Spielwissen, nicht zwei. Der Playmaker stand hier als eigene Kachel und
   * führte auf dieselbe Hälfte, die drinnen „Defense" heißt — wer die Kachel nahm, sah
   * die andere Hälfte nie.
   */
  it('zeigt keine eigene Playmaker-Kachel mehr', () => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)

    expect(screen.queryByRole('link', { name: /Playmaker/ })).toBeNull()
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

  it('hat keine Gegner-Kachel — der Einstieg ist der Reiter ANALYSE, dort der Chip „Gegner“', () => {
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /Gegner/ })).toBeNull()
  })

  it('zeigt die Historie nur dem Superadmin, die Accounts schon dem Admin', () => {
    auth.me = ADMIN
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /Historie/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Accounts/ })).toHaveAttribute('href', '/orga/accounts')
  })

  /*
   * Die Trainerabrechnung ist der Bogen EINER Person fuer den Hochschulsport, und der
   * Spielbogen ist die Arbeit des Scorers am Spieltag. Beides steht im Werkzeugkasten
   * aller Trainer, gehoert aber keinem von ihnen. Entscheidung des Betreibers.
   */
  it('zeigt Trainerabrechnung und Spielbogen nur dem Superadmin', () => {
    auth.me = ADMIN
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)

    expect(screen.queryByRole('link', { name: /Trainerabrechnung/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Spielbogen/ })).toBeNull()
  })

  /* „Selten" stuende sonst als Ueberschrift ueber einer leeren Flaeche: beide Zeilen
     darunter gehoeren dem Superadmin. */
  it('lässt dem Admin den leeren Block „Selten" ganz weg', () => {
    auth.me = ADMIN
    render(<MemoryRouter><OrgaHome /></MemoryRouter>)

    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Weiteres'])
  })
})
