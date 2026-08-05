import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { WhatsappPollResponse, GameDayResponse, WhatsappAccountStatus } from '@/types'

function poll(overrides: Partial<WhatsappPollResponse> & { id: number }): WhatsappPollResponse {
  return {
    groupId: 'g', groupName: 'G', title: 'Titel', options: ['Ja', 'Nein'],
    weekday: null, time: '18:00:00', enabled: true, allowMultipleAnswers: false, message: null,
    skipDates: [], lastSentAt: null, mode: 'ONE_OFF', gameDayId: null, sendDate: null,
    ...overrides,
  }
}

let polls: WhatsappPollResponse[] = []
let gameDays: GameDayResponse[] = []
const CONNECTED_STATUS: WhatsappAccountStatus = {
  connected: true, number: '123', name: 'Test', needsQr: false,
  state: 'CONNECTED', lastError: null, lastErrorAt: null,
}
let status: WhatsappAccountStatus = CONNECTED_STATUS

function mockStatus(s: Partial<WhatsappAccountStatus>) {
  status = { ...CONNECTED_STATUS, connected: false, state: null, ...s }
}

function mockPolls(list: WhatsappPollResponse[]) {
  polls = list
}

function mockGameDays(list: GameDayResponse[]) {
  gameDays = list
}

vi.mock('@/hooks/useWhatsappPoll', () => ({
  useWhatsappPoll: () => ({
    polls,
    status,
    groups: [], trainings: [], loading: false, error: null, reload: vi.fn(),
    createPoll: vi.fn(), updatePoll: vi.fn(), deletePoll: vi.fn(), sendNow: vi.fn(),
    addSkipDate: vi.fn(), removeSkipDate: vi.fn(), resetSent: vi.fn(),
  }),
}))
vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))
vi.mock('@/api/client', () => ({
  getWhatsappQr: vi.fn().mockResolvedValue({ qr: null }),
  getAllGameDays: vi.fn(() => Promise.resolve(gameDays)),
}))

import { WhatsappPollPage } from './WhatsappPollPage'

describe('WhatsappPollPage Gruppierung', () => {
  beforeEach(() => {
    mockPolls([])
    mockGameDays([])
    status = CONNECTED_STATUS
  })

  it('trennt Trainingsumfragen von Einmalig & Nachrichten mit Anzahl', () => {
    mockPolls([
      poll({ id: 1, title: 'Wer kommt zum Training?', weekday: 'MONDAY', time: '09:00:00', mode: 'TRAINING' }),
      poll({ id: 2, title: 'Grillabend?', time: '18:00:00', mode: 'ONE_OFF', sendDate: '2026-08-05' }),
    ])
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)
    // Zwei Abschnitts-Überschriften mit je (1)
    expect(screen.getByText(/Trainingsumfragen/)).toBeInTheDocument()
    expect(screen.getByText(/Einmalig & Nachrichten/)).toBeInTheDocument()
    // Beide Polls landen in ihrer Sektion (Titel gerendert)
    expect(screen.getByText('Wer kommt zum Training?')).toBeInTheDocument()
    expect(screen.getByText('Grillabend?')).toBeInTheDocument()
  })

  it('gruppiert Spieltag-Umfragen separat und zeigt den Spieltag auf der Karte', async () => {
    mockGameDays([
      { id: 42, date: '2026-08-09', label: 'Auswärts', location: 'Aachen', seasonId: 1, availablePlayers: [], games: [] },
    ])
    mockPolls([
      poll({ id: 1, mode: 'TRAINING', weekday: 'TUESDAY' }),
      poll({ id: 2, mode: 'ONE_OFF', sendDate: '2026-08-01' }),
      poll({ id: 3, mode: 'GAME_DAY', gameDayId: 42, sendDate: '2026-08-02', title: 'Spieltag in Aachen dabei?' }),
    ])
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)

    expect(await screen.findByText('Spieltag-Umfragen')).toBeInTheDocument()
    expect(screen.getByText(/09\.08\./)).toBeInTheDocument()
  })

  it('zeigt neutralen Hinweis statt kaputter Zeile wenn der Spieltag nicht mehr gefunden wird', async () => {
    mockGameDays([]) // Spieltag inzwischen gelöscht — Liste im Frontend veraltet
    mockPolls([
      poll({ id: 4, mode: 'GAME_DAY', gameDayId: 999, sendDate: '2026-08-02', title: 'Verwaiste Spieltag-Umfrage' }),
    ])
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)

    expect(await screen.findByText('Spieltag-Umfragen')).toBeInTheDocument()
    expect(screen.getByText('Spieltag nicht mehr vorhanden')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })
})

describe('WhatsappPollPage Verbindungszustand', () => {
  beforeEach(() => {
    mockPolls([])
    mockGameDays([])
    status = CONNECTED_STATUS
  })

  it('UNREACHABLE nennt den Grund statt QR-Spinner zu zeigen', () => {
    mockStatus({ state: 'UNREACHABLE', lastError: 'Connection refused' })
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)
    expect(screen.getByText('WhatsApp-Dienst nicht erreichbar')).toBeInTheDocument()
    expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
    expect(screen.queryByAltText('WhatsApp-Verknüpfungs-QR-Code')).toBeNull()
    expect(screen.queryByText(/Verknüpfte Geräte/)).toBeNull()
  })

  it('LOGGED_OUT erklärt, dass ein neuer QR automatisch kommt', () => {
    mockStatus({ state: 'LOGGED_OUT', lastError: 'logged_out (code 401)' })
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)
    expect(screen.getByText('Von WhatsApp abgemeldet')).toBeInTheDocument()
    expect(screen.getByText(/neuer QR-Code erscheint automatisch/)).toBeInTheDocument()
  })

  it('WAITING_QR ohne QR-Bild zeigt weiterhin die Scan-Anleitung', () => {
    mockStatus({ state: 'WAITING_QR', needsQr: true })
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)
    expect(screen.getByText('Noch nicht verbunden')).toBeInTheDocument()
    expect(screen.getByText(/Verknüpfte Geräte/)).toBeInTheDocument()
  })

  it('verbunden zeigt den Kontonamen', () => {
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)
    expect(screen.getByText(/Verbunden als Test/)).toBeInTheDocument()
  })
})
