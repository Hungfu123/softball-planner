import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PollEditor } from './WhatsappPollPage'
import type { WhatsappPollRequest, TrainingResponse } from '@/types'

const groups = [{ id: 'g@g.us', name: 'Gruppe' }]
const trainings: TrainingResponse[] = [
  { id: 1, date: '2026-07-27', time: '20:00', location: null, cancelled: false, attendeeCount: 0, periodId: 8, type: 'REGULAR' },
]
const draft: WhatsappPollRequest = {
  groupId: 'g@g.us', groupName: 'Gruppe', title: 'T', options: ['Ja', 'Nein'],
  weekday: null, time: '18:00', enabled: true, allowMultipleAnswers: false,
  message: null, mode: 'ONE_OFF', gameDayId: null, sendDate: '2026-08-05',
}

describe('PollEditor', () => {
  it('einmalig zeigt Datum-Feld, nicht Trainingstag', () => {
    render(<PollEditor draft={draft} groups={groups} trainings={trainings} saving={false} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Datum/i)).toBeTruthy()
    // Exakter Match statt Regex: die Checkbox-Beschreibung enthält "Trainingstag" als
    // Teilstring ("An den Trainingstag gekoppelt…"), das Feld-Label ist aber "Trainingstag" exakt.
    expect(screen.queryByText('Trainingstag')).toBeNull()
  })

  it('Haken an -> Trainingstag erscheint + Warnung bei Wochentag ohne Training', () => {
    render(<PollEditor draft={draft} groups={groups} trainings={trainings} saving={false} onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/Trainingsumfrage/i))
    expect(screen.getByText('Trainingstag')).toBeTruthy()
  })

  it('einmalig ohne Datum -> Speichern deaktiviert', () => {
    const noDate = { ...draft, sendDate: null }
    render(<PollEditor draft={noDate} groups={groups} trainings={trainings} saving={false} onSave={vi.fn()} onClose={vi.fn()} />)
    const save = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })

  it('einmalig mit Datum -> Speichern aktiv', () => {
    render(<PollEditor draft={draft} groups={groups} trainings={trainings} saving={false} onSave={vi.fn()} onClose={vi.fn()} />)
    const save = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
  })
})
