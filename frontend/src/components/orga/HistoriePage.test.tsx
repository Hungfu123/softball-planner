import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AuditEntry, AuditVerlauf, LastSeen } from '@/types'

const h = vi.hoisted(() => ({ getAudit: vi.fn(), getLastSeen: vi.fn() }))
vi.mock('@/api/client', () => ({ getAudit: h.getAudit, getLastSeen: h.getLastSeen }))

import { HistoriePage } from './HistoriePage'

const eintrag = (extra: Partial<AuditEntry>): AuditEntry => ({
  username: 'anna', playerName: 'Anna', kind: 'WRITE', label: 'Spieler angelegt', method: 'POST', path: '/api/players',
  targetType: null, targetId: null, status: 201, from: '2026-10-22T10:00:00Z', to: '2026-10-22T10:00:00Z', count: 1, ...extra,
})
const spanne = (from: string, to: string, count: number): AuditEntry =>
  eintrag({ kind: 'SCORING', label: `Gescort (${count} Aktionen)`, from, to, count })

/** Die uebliche Antwort: vollstaendig. Wer das Abschneiden braucht, reicht es als zweites Argument. */
const antwortet = (eintraege: AuditEntry[], extra: Partial<AuditVerlauf> = {}) =>
  h.getAudit.mockResolvedValue({ eintraege, abgeschnitten: false, bisZurueck: null, ...extra })

const GESEHEN: LastSeen[] = [
  { userId: 1, username: 'anna', playerName: 'Anna', role: 'ADMIN', lastLoginAt: '2026-10-22T09:00:00Z', lastSeenAt: '2026-10-22T10:00:00Z' },
  { userId: 2, username: 'bert', playerName: 'Bert', role: 'PLAYER', lastLoginAt: null, lastSeenAt: null },
]

function zeige() {
  return render(<MemoryRouter><HistoriePage /></MemoryRouter>)
}

beforeEach(() => {
  h.getAudit.mockReset(); antwortet([])
  h.getLastSeen.mockReset().mockResolvedValue(GESEHEN)
})

describe('HistoriePage', () => {
  it('zeigt eine Scoring-Spanne als eine Zeile, nicht als fünf', async () => {
    antwortet([spanne('2026-10-22T14:00:00Z', '2026-10-22T14:30:00Z', 5)])
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).getAllByRole('listitem')).toHaveLength(1)
    expect(within(verlauf).getByText('Gescort (5 Aktionen)')).toBeInTheDocument()
  })

  it('hält zwei Spannen mit großer Lücke als zwei Zeilen auseinander', async () => {
    antwortet([
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

  it('sagt kurz, dass geteilte Passwörter und der Reset durch einen Admin die Zuordnung weich machen', () => {
    zeige()
    const hinweis = screen.getByRole('note')
    expect(hinweis).toHaveTextContent(/Konto, nicht die Person/)
    expect(hinweis).toHaveTextContent(/Passwörter sind geteilt/)
    expect(hinweis).toHaveTextContent(/Admin kann das eines anderen/)
    expect(hinweis).toHaveTextContent(/Hinweis, kein Beweis/)
    // Der Kasten steht über jedem Seitenaufbau: er darf nicht wieder zum Absatz werden.
    expect(hinweis.textContent!.trim().length).toBeLessThan(170)
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

  it('nennt den Spieler, wenn der Benutzername ein anderer ist', async () => {
    // Der Fall, für den die Spalte da ist: jemand benennt sich in etwas Ausgedachtes um.
    antwortet([eintrag({ username: 'ballermann99', playerName: 'Anna' })])
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).getByText('ballermann99')).toBeInTheDocument()
    expect(within(verlauf).getByText(/· Anna/)).toBeInTheDocument()
  })

  it('wiederholt den Namen nicht, wenn er dasselbe sagt', async () => {
    antwortet([eintrag({ username: 'anna', playerName: 'Anna' })])
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).queryByText(/· Anna/)).toBeNull()
  })

  it('kommt ohne Spielernamen aus — ein gelöschter Account hat keinen mehr', async () => {
    antwortet([eintrag({ username: 'weg', playerName: null })])
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).getByText('weg')).toBeInTheDocument()
    expect(within(verlauf).queryByText(/·/)).toBeNull()
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

  it('bietet jede Art an, die geschrieben wird — auch gescheiterte Anmeldungen', async () => {
    zeige()
    const auswahl = await screen.findByLabelText('Aktivität')
    const werte = Array.from(auswahl.querySelectorAll('option')).map(o => o.getAttribute('value'))
    expect(werte).toEqual(['', 'LOGIN', 'LOGIN_FAILED', 'WRITE', 'SCORING'])
  })

  it('zeigt erst 50 Zeilen, dann auf Knopfdruck mehr', async () => {
    const viele = Array.from({ length: 120 }, (_, i) => eintrag({ label: `Eintrag ${i}` }))
    antwortet(viele)
    zeige()

    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).getAllByRole('listitem')).toHaveLength(50)
    expect(screen.getByText('50 von 120 Einträgen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mehr anzeigen' }))
    await waitFor(() => expect(within(verlauf).getAllByRole('listitem')).toHaveLength(100))
    expect(screen.getByText('100 von 120 Einträgen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mehr anzeigen' }))
    await waitFor(() => expect(within(verlauf).getAllByRole('listitem')).toHaveLength(120))
    // Alles da: der Knopf hat nichts mehr zu tun und verschwindet.
    expect(screen.queryByRole('button', { name: 'Mehr anzeigen' })).not.toBeInTheDocument()
  })

  it('fängt nach einem Filterwechsel wieder bei 50 an', async () => {
    antwortet(Array.from({ length: 120 }, (_, i) => eintrag({ label: `Eintrag ${i}` })))
    zeige()
    const verlauf = await screen.findByRole('list', { name: 'Verlauf' })
    fireEvent.click(await screen.findByRole('button', { name: 'Mehr anzeigen' }))
    await waitFor(() => expect(within(verlauf).getAllByRole('listitem')).toHaveLength(100))

    fireEvent.change(screen.getByLabelText('Aktivität'), { target: { value: 'WRITE' } })
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Verlauf' })).getAllByRole('listitem')).toHaveLength(50))
  })

  it('sagt es, wenn der Server den Zeitraum abgeschnitten hat', async () => {
    // Eine abgeschnittene Historie, die so tut als waere sie vollstaendig, ist schlimmer
    // als gar keine — der Superadmin zoege daraus falsche Schluesse.
    antwortet([eintrag({})], { abgeschnitten: true, bisZurueck: '2026-02-03T08:00:00Z' })
    zeige()
    // Erst die Liste abwarten: das Lade-Skelett traegt selbst role="status".
    await screen.findByText('Spieler angelegt')
    const hinweis = await screen.findByText(/Älter als 03\.02\.2026/)
    expect(hinweis).toHaveTextContent(/Grenze ihn ein/)
  })

  it('schweigt, wenn nichts abgeschnitten wurde', async () => {
    antwortet([eintrag({})])
    zeige()
    await screen.findByText('Spieler angelegt')
    expect(screen.queryByText(/nicht geladen/)).not.toBeInTheDocument()
  })

  it('zeigt bei kurzer Liste keinen Knopf, aber die Zahl', async () => {
    antwortet([eintrag({}), eintrag({})])
    zeige()
    expect(await screen.findByText('2 von 2 Einträgen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mehr anzeigen' })).not.toBeInTheDocument()
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
