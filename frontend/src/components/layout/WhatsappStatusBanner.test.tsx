import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { WhatsappAccountStatus } from '@/types'

let status: WhatsappAccountStatus

vi.mock('@/api/client', () => ({
  getWhatsappStatus: vi.fn(() => Promise.resolve(status)),
}))

import { WhatsappStatusBanner } from './WhatsappStatusBanner'

function mockStatus(s: Partial<WhatsappAccountStatus>): WhatsappAccountStatus {
  return {
    connected: false, number: null, name: null, needsQr: false,
    state: null, lastError: null, lastErrorAt: null, lastPairingAt: null,
    ...s,
  }
}

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WhatsappStatusBanner />
    </MemoryRouter>,
  )
}

describe('WhatsappStatusBanner', () => {
  beforeEach(() => {
    sessionStorage.clear()
    status = mockStatus({ connected: true, state: 'CONNECTED' })
  })

  it('bleibt still wenn verbunden', async () => {
    renderAt()
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })

  it('warnt bei fehlender Kopplung und verlinkt auf die Umfragen-Seite', async () => {
    status = mockStatus({ state: 'WAITING_QR', needsQr: true })
    renderAt()
    expect(await screen.findByText(/nicht verknüpft/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'QR-Code scannen' })).toHaveAttribute('href', '/orga/whatsapp-umfrage')
  })

  it('warnt wenn der Dienst nicht erreichbar ist', async () => {
    status = mockStatus({ state: 'UNREACHABLE', lastError: 'refused' })
    renderAt()
    expect(await screen.findByText(/nicht erreichbar/)).toBeInTheDocument()
  })

  it('schweigt bei CONNECTING — Übergangszustand ist kein Alarm', async () => {
    status = mockStatus({ state: 'CONNECTING' })
    renderAt()
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })

  it('schweigt auf der Umfragen-Seite selbst (Karte zeigt dort schon alles)', async () => {
    status = mockStatus({ state: 'LOGGED_OUT' })
    renderAt('/orga/whatsapp-umfrage')
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })

  it('lässt sich für die Session ausblenden', async () => {
    status = mockStatus({ state: 'LOGGED_OUT' })
    renderAt()
    await screen.findByRole('status')
    await userEvent.click(screen.getByRole('button', { name: 'Hinweis ausblenden' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(sessionStorage.getItem('whatsapp-banner-dismissed')).toBe('1')
  })

  it('zeigt sich nach Wiederverbinden erneut — Dismiss wird zurückgesetzt', async () => {
    sessionStorage.setItem('whatsapp-banner-dismissed', '1')
    status = mockStatus({ connected: true, state: 'CONNECTED' })
    renderAt()
    await waitFor(() => expect(sessionStorage.getItem('whatsapp-banner-dismissed')).toBeNull())
  })
})
