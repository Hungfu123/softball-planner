import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AuditEntry, LastSeen } from '@/types'

const h = vi.hoisted(() => ({ getAudit: vi.fn(), getLastSeen: vi.fn() }))
vi.mock('@/api/client', () => ({ getAudit: h.getAudit, getLastSeen: h.getLastSeen }))

import { HistoriePage } from './HistoriePage'

const eintrag = (extra: Partial<AuditEntry>): AuditEntry => ({
  username: 'anna', kind: 'WRITE', label: 'Spieler angelegt', method: 'POST', path: '/api/players',
  targetType: null, targetId: null, status: 201, from: '2026-10-22T10:00:00Z', to: '2026-10-22T10:00:00Z', count: 1, ...extra,
})
const spanne = (from: string, to: string, count: number): AuditEntry =>
  eintrag({ kind: 'SCORING', label: `Gescort (${count} Aktionen)`, from, to, count })

const GESEHEN: LastSeen[] = [
  { userId: 1, username: 'anna', role: 'ADMIN', lastLoginAt: '2026-10-22T09:00:00Z', lastSeenAt: '2026-10-22T10:00:00Z' },
  { userId: 2, username: 'bert', role: 'PLAYER', lastLoginAt: null, lastSeenAt: null },
]

function zeige() {
  return render(<MemoryRouter><HistoriePage /></MemoryRouter>)
}

beforeEach(() => {
  h.getAudit.mockReset().mockResolvedValue([])
  h.getLastSeen.mockReset().mockResolvedValue(GESEHEN)
})

describe('HistoriePage', () => {
  it('zeigt eine Scoring-Spanne als eine Zeile, nicht als fünf', async () => {
    h.getAudit.mockResolvedValue([spanne('2026-10-22T14:00:00Z', '2026-10-22T14:30:00Z', 5)])
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).getAllByRole('listitem')).toHaveLength(1)
    expect(within(verlauf).getByText('Gescort (5 Aktionen)')).toBeInTheDocument()
  })

  it('hält zwei Spannen mit großer Lücke als zwei Zeilen auseinander', async () => {
    h.getAudit.mockResolvedValue([
      spanne('2026-10-22T16:00:00Z', '2026-10-22T16:20:00Z', 4),
      spanne('2026-10-22T14:00:00Z', '2026-10-22T14:30:00Z', 5),
    ])
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    const zeilen = within(verlauf).getAllByRole('listitem')
    expect(zeilen).toHaveLength(2)
    expect(zeilen[0]).toHaveTextContent('Gescort (4 Aktionen)')
    expect(zeilen[1]).toHaveTextContent('Gescort (5 Aktionen)')
  })

  it('sagt, dass gemeinsame Passwörter die Zuordnung weich machen — und der Passwort-Reset eines Admins auch', () => {
    zeige()
    const hinweis = screen.getByRole('note')
    expect(hinweis).toHaveTextContent(/Gemeinsame Passwörter machen die Zuordnung weich/)
    expect(hinweis).toHaveTextContent(/Passwort eines anderen Admins/)
    expect(hinweis).toHaveTextContent(/Hinweis, kein Beweis/)
  })

  it('lädt vorgabemäßig nur die letzten sieben Tage, nie alles', async () => {
    const vorher = Date.now()
    zeige()
    await waitFor(() => expect(h.getAudit).toHaveBeenCalled())
    const filter = h.getAudit.mock.calls[0][0]
    expect(filter.userId).toBeUndefined()
    const alter = vorher - new Date(filter.from).getTime()
    expect(alter).toBeGreaterThanOrEqual(7 * 86400_000 - 1000)
    expect(alter).toBeLessThan(7 * 86400_000 + 60_000)
  })

  it('filtert nach Nutzer und lädt neu', async () => {
    zeige()
    await waitFor(() => expect(h.getAudit).toHaveBeenCalledTimes(1))
    fireEvent.change(await screen.findByLabelText('Nutzer'), { target: { value: '2' } })
    await waitFor(() => expect(h.getAudit).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 2 })))
  })

  it('filtert nach Aktivität und lädt neu', async () => {
    zeige()
    await waitFor(() => expect(h.getAudit).toHaveBeenCalledTimes(1))
    // Ohne Wahl darf kein kind mitgehen, sonst verschwänden die anderen Arten still.
    expect(h.getAudit.mock.calls[0][0].kind).toBeUndefined()

    fireEvent.change(await screen.findByLabelText('Aktivität'), { target: { value: 'LOGIN' } })
    await waitFor(() => expect(h.getAudit).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'LOGIN' })))

    fireEvent.change(screen.getByLabelText('Aktivität'), { target: { value: '' } })
    await waitFor(() => expect(h.getAudit.mock.calls.at(-1)?.[0].kind).toBeUndefined())
  })

  it('bietet keine gescheiterten Anmeldungen an — die Art wird nie geschrieben', async () => {
    zeige()
    const auswahl = await screen.findByLabelText('Aktivität')
    const werte = Array.from(auswahl.querySelectorAll('option')).map(o => o.getAttribute('value'))
    expect(werte).toEqual(['', 'LOGIN', 'WRITE', 'SCORING'])
  })

  it('wechselt den Zeitraum und lädt neu', async () => {
    zeige()
    await waitFor(() => expect(h.getAudit).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Zeitraum'), { target: { value: '30' } })
    await waitFor(() => expect(h.getAudit).toHaveBeenCalledTimes(2))
    const alter = Date.now() - new Date(h.getAudit.mock.calls[1][0].from).getTime()
    expect(alter).toBeGreaterThanOrEqual(30 * 86400_000 - 1000)
  })

  it('zeigt „zuletzt gesehen" mit allen Accounts, auch dem noch nie angemeldeten', async () => {
    zeige()
    const liste = await screen.findByRole('list', { name: 'Zuletzt gesehen' })
    const zeilen = within(liste).getAllByRole('listitem')
    expect(zeilen).toHaveLength(2)
    expect(zeilen[0]).toHaveTextContent('anna')
    expect(zeilen[1]).toHaveTextContent('bert')
    expect(zeilen[1]).toHaveTextContent(/noch nie/)
  })

  it('erklärt einen leeren Zeitraum und sagt, was man tun kann', async () => {
    zeige()
    expect(await screen.findByText(/Im gewählten Zeitraum ist nichts passiert/)).toBeInTheDocument()
    expect(screen.getByText(/größeren Zeitraum/)).toBeInTheDocument()
  })

  it('meldet einen Fehler beim Laden sichtbar', async () => {
    h.getAudit.mockRejectedValue(new Error('Fehler 500'))
    zeige()
    expect(await screen.findByRole('alert')).toHaveTextContent('Fehler 500')
  })

  it('fragt bei eigenem Zeitraum mit Von und Bis an', async () => {
    zeige()
    await waitFor(() => expect(h.getAudit).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Zeitraum'), { target: { value: 'eigen' } })
    fireEvent.change(await screen.findByLabelText('Von'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-10-05' } })
    await waitFor(() => {
      const f = h.getAudit.mock.calls.at(-1)![0]
      expect(new Date(f.from).getTime()).toBe(new Date('2026-10-01T00:00:00').getTime())
      expect(new Date(f.to).getTime()).toBe(new Date('2026-10-05T23:59:59.999').getTime())
    })
  })
})
