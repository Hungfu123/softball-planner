import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PollEditor } from './PollEditor'
import type { WhatsappPollRequest, TrainingResponse, GameDayResponse } from '@/types'

const groups = [{ id: 'g@g.us', name: 'Gruppe' }]
const trainings: TrainingResponse[] = [
  { id: 1, date: '2026-07-27', time: '20:00', location: null, cancelled: false, attendeeCount: 0, periodId: 8, type: 'REGULAR' },
]
const gameDays: GameDayResponse[] = [
  { id: 42, date: '2026-08-09', label: 'CoSe Spieltag', location: 'Aachen', seasonId: 1, availablePlayers: [], games: [] },
  { id: 43, date: '2026-08-16', label: 'Heimspieltag', location: null, seasonId: 1, availablePlayers: [], games: [] },
]
const draft: WhatsappPollRequest = {
  groupId: 'g@g.us', groupName: 'Gruppe', title: 'T', options: ['Ja', 'Nein'],
  weekday: null, time: '18:00', enabled: true, allowMultipleAnswers: false,
  message: null, mode: 'ONE_OFF', gameDayId: null, sendDate: '2026-08-05',
}
const props = { draft, groups, trainings, gameDays, saving: false, onSave: vi.fn(), onClose: vi.fn() }

describe('PollEditor', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-07-29T10:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('einmalig zeigt Datum-Feld, nicht Trainingstag', () => {
    render(<PollEditor {...props} />)
    expect(screen.getByLabelText(/Datum/i)).toBeTruthy()
    // Exakter Match statt Regex: der Hinweistext enthält "Trainingstag" als
    // Teilstring ("...jedem Training..."), das Feld-Label ist aber "Trainingstag" exakt.
    expect(screen.queryByText('Trainingstag')).toBeNull()
  })

  it('Modus Training -> Trainingstag erscheint', () => {
    render(<PollEditor {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Training' }))
    expect(screen.getByText('Trainingstag')).toBeTruthy()
  })

  it('einmalig ohne Datum -> Speichern deaktiviert', () => {
    const noDate = { ...draft, sendDate: null }
    render(<PollEditor {...props} draft={noDate} />)
    const save = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })

  it('einmalig mit Datum -> Speichern aktiv', () => {
    render(<PollEditor {...props} />)
    const save = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
  })

  it('Modus Spieltag: Spieltag-Wahl setzt Sendedatum auf 7 Tage vorher', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-02')
  })

  it('Vorlage Auswärtsspiel füllt Antworten und Mehrfachauswahl', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Auswärtsspiel/ }))

    expect(screen.getByDisplayValue('Ja ich will spielen')).toBeInTheDocument()
    expect(screen.getByLabelText(/Mehrfachauswahl/)).toBeChecked()
  })

  it('manuell geändertes Datum wird beim Spieltag-Wechsel nicht überschrieben', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    const dateInput = screen.getByLabelText('Datum')
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2026-08-05')
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-05')
  })
})
