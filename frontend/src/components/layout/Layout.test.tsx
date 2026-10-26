import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Layout } from './Layout'
import type { MeResponse } from '@/types'

const auth = vi.hoisted(() => ({ me: null as MeResponse | null, logout: vi.fn() }))
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ me: auth.me, logout: auth.logout }),
}))

const ADMIN: MeResponse = { username: 'anna', role: 'ADMIN', playerId: 3, playerName: 'Anna Adler', mayScore: false, passwordChanged: true }
const SUPER: MeResponse = { ...ADMIN, username: 'hung', role: 'SUPERADMIN' }
const SPIELER: MeResponse = { ...ADMIN, username: 'paul', role: 'PLAYER', playerId: 9, playerName: 'Paul Pitcher' }

// Der Banner pollt die WhatsApp-Kopplung — für die Reiterleiste irrelevant. Als Markierung
// gerendert, damit geprüft werden kann, WER ihn überhaupt zu sehen bekommt.
vi.mock('./WhatsappStatusBanner', () => ({
  WhatsappStatusBanner: () => <div data-testid="whatsapp-band" />,
}))

function renderAt(pfad: string) {
  return render(
    <MemoryRouter initialEntries={[pfad]}>
      <Layout />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  auth.me = ADMIN
  auth.logout.mockClear()
})

const isTab = (el: HTMLElement) => el.closest('nav') !== null

describe('WhatsApp-Band', () => {
  const band = () => screen.queryByTestId('whatsapp-band')

  it.each([ADMIN, SUPER])('zeigt es $role', me => {
    auth.me = me
    renderAt('/')
    expect(band()).toBeInTheDocument()
  })

  it('zeigt es einem Spieler nicht — er kann an der Anlage nichts tun', () => {
    auth.me = SPIELER
    renderAt('/')
    expect(band()).toBeNull()
  })

  it('zeigt es auch bei unbeantwortetem /api/me nicht', () => {
    // Dort gilt sonst jeder als Admin, damit niemandem Wege wegbrechen (RequireRole hängt am
    // selben Wert). Das Band ist kein Weg: im Zweifel lieber nicht zeigen.
    auth.me = null
    renderAt('/')
    expect(band()).toBeNull()
  })

  it('lässt die Reiter davon unberührt: unbekannt zeigt weiter die Admin-Leiste', () => {
    auth.me = null
    renderAt('/')
    expect(screen.getAllByRole('link').filter(isTab)).toHaveLength(5)
  })
})

describe('Layout Reiterleiste', () => {
  it('zeigt einem Admin fünf Reiter', () => {
    renderAt('/')
    expect(screen.getAllByRole('link').filter(isTab)).toHaveLength(5)
  })

  it('zeigt die richtigen fünf Reiter in dieser Reihenfolge mit diesen Zielen', () => {
    renderAt('/')
    const tabs = screen.getAllByRole('link').filter(isTab)
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(['/', '/training', '/players', '/stats', '/orga'])
    // Jeder Reiter trägt Kurz- und Langlabel im DOM (CSS blendet eines aus), Kurzlabel zuerst.
    expect(tabs.map(t => t.textContent)).toEqual([
      'SpieleSpielbetrieb',
      'TrainingTraining',
      'SpielerSpieler',
      'AnalyseAnalyse',
      'OrgaOrga',
    ])
  })

  it.each(['/stats', '/teams', '/teams/spiele'])('markiert ANALYSE auf %s', (pfad) => {
    renderAt(pfad)
    expect(screen.getByRole('link', { name: /Analyse/ })).toHaveClass('bg-white')
  })

  it.each(['/spielbogen', '/spielbogen/new', '/kalender'])('markiert ORGA auf %s', (pfad) => {
    renderAt(pfad)
    expect(screen.getByRole('link', { name: /Orga/ })).toHaveClass('bg-white')
  })

  it('hat keinen Spielbogen-Reiter mehr', () => {
    renderAt('/')
    expect(screen.queryByRole('link', { name: /Bogen|Spielbogen/ })).toBeNull()
  })
})

describe('Layout Reiterleiste nach Rolle', () => {
  it('zeigt einem Spieler drei Reiter: Start, Analyse, Kalender', () => {
    auth.me = SPIELER
    renderAt('/')
    const tabs = screen.getAllByRole('link').filter(isTab)
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(['/', '/stats', '/kalender'])
    expect(tabs.map(t => t.textContent)).toEqual(['StartStart', 'AnalyseAnalyse', 'KalenderKalender'])
  })

  it('markiert beim Spieler den Kalender-Reiter auf /kalender', () => {
    auth.me = SPIELER
    renderAt('/kalender')
    expect(screen.getByRole('link', { name: /Kalender/ })).toHaveClass('bg-white')
  })

  it.each([ADMIN, SUPER])('zeigt $role fünf Reiter mit Orga', me => {
    auth.me = me
    renderAt('/')
    const tabs = screen.getAllByRole('link').filter(isTab)
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(['/', '/training', '/players', '/stats', '/orga'])
  })
})

describe('KontoMenu', () => {
  const knopf = () => screen.getByRole('button', { name: 'Konto' })

  it('zeigt Initialen des Spielernamens im Knopf, mindestens 44 px', () => {
    renderAt('/')
    expect(knopf()).toHaveTextContent('AA')
    expect(knopf()).toHaveClass('w-11', 'h-11')
  })

  it('fällt ohne Spielerbezug auf den Benutzernamen zurück', () => {
    auth.me = { ...SUPER, playerId: null, playerName: null }
    renderAt('/')
    expect(knopf()).toHaveTextContent('HU')
  })

  it('ist zu, bis man es öffnet, und portalt nach body, nicht in den Kopf', () => {
    renderAt('/')
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(knopf())
    const menu = screen.getByRole('menu')
    expect(menu.closest('header')).toBeNull()
    expect(menu.parentElement?.parentElement).toBe(document.body)
  })

  it('bietet einem Spieler Mein Profil mit der playerId, Konto und Abmelden', () => {
    auth.me = SPIELER
    renderAt('/')
    fireEvent.click(knopf())
    const menu = within(screen.getByRole('menu'))
    expect(menu.getByRole('menuitem', { name: 'Mein Profil' })).toHaveAttribute('href', '/players/9')
    expect(menu.getAllByRole('menuitem').map(e => e.textContent)).toEqual(['Mein Profil', 'Konto & Passwort', 'Abmelden'])
  })

  it('lässt Mein Profil weg, wenn der Account an keinem Spieler hängt', () => {
    auth.me = { ...SUPER, playerId: null, playerName: null }
    renderAt('/')
    fireEvent.click(knopf())
    expect(screen.queryByRole('menuitem', { name: 'Mein Profil' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Abmelden' })).toBeInTheDocument()
  })

  it('meldet ab und schließt das Menü', () => {
    renderAt('/')
    fireEvent.click(knopf())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abmelden' }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('schließt auf Escape und auf Klick daneben', () => {
    renderAt('/')
    fireEvent.click(knopf())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(knopf())
    fireEvent.click(document.querySelector('[data-portal-overlay]')!)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('bietet Abmelden auch ohne Auskunft vom Server (me === null), aber kein Mein Profil', () => {
    auth.me = null
    renderAt('/')
    fireEvent.click(knopf())
    expect(screen.queryByRole('menuitem', { name: 'Mein Profil' })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abmelden' }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
  })

  it('führt Konto & Passwort jede Rolle zu /konto', () => {
    for (const me of [SPIELER, ADMIN, SUPER]) {
      auth.me = me
      const { unmount } = renderAt('/')
      fireEvent.click(knopf())
      expect(screen.getByRole('menuitem', { name: 'Konto & Passwort' })).toHaveAttribute('href', '/konto')
      unmount()
    }
  })

  it('zeigt Accounts erst ab Admin', () => {
    auth.me = SPIELER
    const spieler = renderAt('/')
    fireEvent.click(knopf())
    expect(screen.queryByRole('menuitem', { name: 'Accounts' })).toBeNull()
    spieler.unmount()

    for (const me of [ADMIN, SUPER]) {
      auth.me = me
      const { unmount } = renderAt('/')
      fireEvent.click(knopf())
      expect(screen.getByRole('menuitem', { name: 'Accounts' })).toHaveAttribute('href', '/orga/accounts')
      unmount()
    }
  })

  it('zeigt Historie nur dem Superadmin', () => {
    for (const me of [SPIELER, ADMIN]) {
      auth.me = me
      const { unmount } = renderAt('/')
      fireEvent.click(knopf())
      expect(screen.queryByRole('menuitem', { name: 'Historie' })).toBeNull()
      unmount()
    }
    auth.me = SUPER
    renderAt('/')
    fireEvent.click(knopf())
    expect(screen.getByRole('menuitem', { name: 'Historie' })).toHaveAttribute('href', '/orga/historie')
  })

  it('bietet ohne Auskunft vom Server nur Abmelden, keine Verwaltung', () => {
    auth.me = null
    renderAt('/')
    fireEvent.click(knopf())
    expect(screen.getAllByRole('menuitem').map(e => e.textContent)).toEqual(['Abmelden'])
  })

  it('jeder Menüeintrag ist mindestens 44 px hoch', () => {
    renderAt('/')
    fireEvent.click(knopf())
    for (const e of screen.getAllByRole('menuitem')) expect(e).toHaveClass('min-h-11')
  })
})
