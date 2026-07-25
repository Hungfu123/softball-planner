import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { WhatsappPollResponse } from '@/types'

const polls: WhatsappPollResponse[] = [
  {
    id: 1, groupId: 'g', groupName: 'G', title: 'Wer kommt zum Training?', options: ['Ja', 'Nein'],
    weekday: 'MONDAY', time: '09:00:00', enabled: true, allowMultipleAnswers: false, message: null,
    skipDates: [], lastSentAt: null, trainingCoupled: true, sendDate: null,
  },
  {
    id: 2, groupId: 'g', groupName: 'G', title: 'Grillabend?', options: ['Ja', 'Nein'],
    weekday: null, time: '18:00:00', enabled: true, allowMultipleAnswers: false, message: null,
    skipDates: [], lastSentAt: null, trainingCoupled: false, sendDate: '2026-08-05',
  },
]

vi.mock('@/hooks/useWhatsappPoll', () => ({
  useWhatsappPoll: () => ({
    polls,
    status: { connected: true, number: '123', name: 'Test', needsQr: false },
    groups: [], trainings: [], loading: false, error: null, reload: vi.fn(),
    createPoll: vi.fn(), updatePoll: vi.fn(), deletePoll: vi.fn(), sendNow: vi.fn(),
    addSkipDate: vi.fn(), removeSkipDate: vi.fn(), resetSent: vi.fn(),
  }),
}))
vi.mock('@/components/layout/Layout', () => ({
  useToastContext: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))
vi.mock('@/api/client', () => ({ getWhatsappQr: vi.fn().mockResolvedValue({ qr: null }) }))

// eslint-disable-next-line import/first
import { WhatsappPollPage } from './WhatsappPollPage'

describe('WhatsappPollPage Gruppierung', () => {
  it('trennt Trainingsumfragen von Einmalig & Nachrichten mit Anzahl', () => {
    render(<MemoryRouter><WhatsappPollPage /></MemoryRouter>)
    // Zwei Abschnitts-Überschriften mit je (1)
    expect(screen.getByText(/Trainingsumfragen/)).toBeInTheDocument()
    expect(screen.getByText(/Einmalig & Nachrichten/)).toBeInTheDocument()
    // Beide Polls landen in ihrer Sektion (Titel gerendert)
    expect(screen.getByText('Wer kommt zum Training?')).toBeInTheDocument()
    expect(screen.getByText('Grillabend?')).toBeInTheDocument()
  })
})
