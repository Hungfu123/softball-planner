import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MeResponse, Role } from '@/types'

/*
 * Geprueft wird die WEICHE, nicht die beiden Seiten dahinter — die haben eigene Tests und
 * zoegen hier ein Dutzend API-Mocks nach sich. Echt bleibt `useRolle`: genau dort entscheidet
 * sich der Fall, um den es geht (Spielermodus trotz SUPERADMIN aus `/api/me`).
 */
const stand = vi.hoisted(() => ({ me: null as MeResponse | null, spielermodus: false }))

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ me: stand.me, neuLaden: vi.fn() }),
}))
vi.mock('@/hooks/useSpielermodus', () => ({
  spielermodusAktiv: () => stand.spielermodus,
}))
vi.mock('./Dashboard', () => ({ Dashboard: () => <p>Trainer-Werkbank</p> }))
vi.mock('./PlayerDashboard', () => ({ PlayerDashboard: () => <p>Spieler-Startseite</p> }))

import { Startseite } from './Startseite'

function me(role: Role): MeResponse {
  return { username: 'hung', role, playerId: 7, playerName: 'Hung Luu', mayScore: false, passwordChanged: true }
}

describe('Startseite', () => {
  beforeEach(() => {
    stand.me = null
    stand.spielermodus = false
  })

  it('zeigt einem Spieler seine eigene Seite', () => {
    stand.me = me('PLAYER')
    render(<Startseite />)
    expect(screen.getByText('Spieler-Startseite')).toBeInTheDocument()
  })

  it('zeigt einem Trainer die Werkbank', () => {
    stand.me = me('ADMIN')
    render(<Startseite />)
    expect(screen.getByText('Trainer-Werkbank')).toBeInTheDocument()
  })

  it('zeigt einem Superadmin die Werkbank', () => {
    stand.me = me('SUPERADMIN')
    render(<Startseite />)
    expect(screen.getByText('Trainer-Werkbank')).toBeInTheDocument()
  })

  /*
   * Der Fall, der kaputt war: `/api/me` liest die Rolle aus der Datenbank und meldet weiter
   * SUPERADMIN — der Modus haengt am Kopf der Anfrage, nicht am Konto. Wer die Rolle direkt
   * las, bekam die Werkbank mit den beschnittenen Daten eines Spielers.
   */
  it('zeigt im Spielermodus die Spielerseite, obwohl /api/me SUPERADMIN meldet', () => {
    stand.me = me('SUPERADMIN')
    stand.spielermodus = true
    render(<Startseite />)
    expect(screen.getByText('Spieler-Startseite')).toBeInTheDocument()
    expect(screen.queryByText('Trainer-Werkbank')).not.toBeInTheDocument()
  })

  it('zeigt ohne Auskunft keine der beiden Seiten', () => {
    render(<Startseite />)
    expect(screen.getByRole('status')).toHaveTextContent('Dein Konto wird noch geladen')
    expect(screen.queryByText('Trainer-Werkbank')).not.toBeInTheDocument()
    expect(screen.queryByText('Spieler-Startseite')).not.toBeInTheDocument()
  })
})
