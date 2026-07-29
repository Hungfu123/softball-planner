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
const props = { draft, lastSentAt: null, groups, trainings, gameDays, saving: false, onSave: vi.fn(), onClose: vi.fn() }

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

    expect(screen.getByLabelText('Sendedatum')).toHaveValue('2026-08-02')
  })

  it('Spieltag-Modus beschriftet die Felder als Sendedatum/Sende-Uhrzeit, nicht Datum/Uhrzeit', async () => {
    // Punkt 9: direkt unter dem Spieltag-Dropdown liest man "Datum"/"Uhrzeit" sonst als Spielbeginn.
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))

    expect(screen.getByLabelText('Sendedatum')).toBeInTheDocument()
    expect(screen.getByText('Sende-Uhrzeit')).toBeInTheDocument()
    expect(screen.queryByText('Uhrzeit')).toBeNull()
  })

  it('Vorlage Auswärtsspiel füllt Antworten und Mehrfachauswahl', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Auswärtsspiel/ }))

    expect(screen.getByDisplayValue('Ja ich will spielen')).toBeInTheDocument()
    expect(screen.getByLabelText(/Mehrfachauswahl/)).toBeChecked()
  })

  it('Vorlage-Klick schaltet auf Umfrage-Tab, auch wenn "Nur Nachricht" aktiv war', async () => {
    // Regression: applyTemplate setzte früher nur die Optionen, buildRequest() verwarf sie
    // aber bei withPoll === false — der Klick war dann wirkungslos.
    const messageOnlyDraft: WhatsappPollRequest = { ...draft, options: [] }
    render(<PollEditor {...props} draft={messageOnlyDraft} />)
    expect(screen.queryByText('Frage')).toBeNull() // startet im Nur-Nachricht-Tab
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')

    await userEvent.click(screen.getByRole('button', { name: /Auswärtsspiel/ }))

    expect(screen.getByText('Frage')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ja ich will spielen')).toBeInTheDocument()
  })

  it('manuell geändertes Datum wird beim Spieltag-Wechsel nicht überschrieben', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    const dateInput = screen.getByLabelText('Sendedatum')
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2026-08-05')
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect(screen.getByLabelText('Sendedatum')).toHaveValue('2026-08-05')
  })

  it('Spieltag-Dropdown zeigt nur kommende Spieltage mit Jahr im Label', () => {
    // Punkt 5: nach mehreren Saisons stehen sonst Dutzende Einträge ohne Jahr in der Liste,
    // teils mit identischem Kurzlabel. Vergangene Spieltage werden ausgeblendet.
    const pastAndFuture: GameDayResponse[] = [
      { id: 1, date: '2026-07-01', label: 'Verpasst', location: null, seasonId: 1, availablePlayers: [], games: [] },
      ...gameDays,
    ]
    render(<PollEditor {...props} gameDays={pastAndFuture} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: null }} />)

    expect(screen.queryByText('Verpasst', { exact: false })).toBeNull()
    expect(screen.getByText(/09\.08\.2026/)).toBeInTheDocument()
  })

  it('bereits gesendeter Spieltag-Poll: Vorschau-Klammer nennt nur bei echten 7 Tagen "7 Tage vorher"', async () => {
    // Punkt 8: defaultSendDate klemmt bei einem zu nahen Spieltag auf heute — die Klammer
    // darf dann nicht trotzdem "7 Tage vor dem Spieltag" behaupten.
    const closeGameDay: GameDayResponse[] = [
      { id: 99, date: '2026-07-31', label: 'Übermorgen', location: null, seasonId: 1, availablePlayers: [], games: [] },
    ]
    render(<PollEditor {...props} gameDays={closeGameDay} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: 99, sendDate: '2026-07-29' }} />)

    const preview = screen.getByText(/einmalig gesendet/)
    expect(preview.textContent).not.toMatch(/\(7 Tage vor dem Spieltag\)/)
    expect(preview.textContent).toMatch(/zu nah für 7 Tage Vorlauf/)
  })

  it('bereits gesendete Spieltag-Umfrage warnt vor Optionsänderung', () => {
    render(<PollEditor {...props} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: 42 }} lastSentAt="2026-07-20T10:00:00" />)

    expect(screen.getByText(/bereits gesendet/)).toBeInTheDocument()
    expect(screen.getByText(/Sende-Sperre zurücksetzen/)).toBeInTheDocument()
  })

  it('Moduswechsel eines bereits gesendeten Spieltag-Polls warnt vor Stimmenverlust', async () => {
    render(<PollEditor {...props} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: 42 }} lastSentAt="2026-07-20T10:00:00" />)
    expect(screen.queryByText(/gehen die abgegebenen Stimmen/)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Einmalig' }))

    expect(screen.getByText(/gehen die abgegebenen Stimmen/)).toBeInTheDocument()
  })

  it('Spieltag-Wechsel eines bereits gesendeten Polls warnt ebenfalls', async () => {
    render(<PollEditor {...props} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: 42 }} lastSentAt="2026-07-20T10:00:00" />)

    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect(screen.getByText(/gehen die abgegebenen Stimmen/)).toBeInTheDocument()
  })

  it('noch nie gesendete Spieltag-Umfrage zeigt keine Warnungen', () => {
    render(<PollEditor {...props} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: 42 }} lastSentAt={null} />)

    expect(screen.queryByText(/bereits gesendet/)).toBeNull()
    expect(screen.queryByText(/gehen die abgegebenen Stimmen/)).toBeNull()
  })

  // Heim-Vorlage genutzt, weil Titel UND Nachricht dort das Datum enthalten (Auswärts-Titel
  // enthält nur den Ort) — so lässt sich das Nachziehen an beiden Feldern zeigen.
  it('Vorlage angewandt, dann Spieltag gewechselt: Frage und Nachricht tragen das neue Datum', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Heimspieltag/ }))
    const titleField = screen.getByPlaceholderText('z.B. Wer kommt zum Training?')
    const messageField = screen.getByPlaceholderText(/Wird vor der Umfrage gesendet/)
    expect((titleField as HTMLInputElement).value).toContain('09.08.')
    expect((messageField as HTMLTextAreaElement).value).toContain('09.08.')

    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect((titleField as HTMLInputElement).value).toContain('16.08.')
    expect((messageField as HTMLTextAreaElement).value).toContain('16.08.')
  })

  it('Vorlage angewandt, Nachricht selbst umgeschrieben, dann Spieltag gewechselt: eigene Nachricht bleibt, Frage zieht nach', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Heimspieltag/ }))

    const messageField = screen.getByPlaceholderText(/Wird vor der Umfrage gesendet/)
    await userEvent.clear(messageField)
    await userEvent.type(messageField, 'Meine eigene Nachricht')
    const titleField = screen.getByPlaceholderText('z.B. Wer kommt zum Training?')

    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect(messageField).toHaveValue('Meine eigene Nachricht')
    expect((titleField as HTMLInputElement).value).toContain('16.08.')
  })

  it('Vorlage angewandt, dann Modus auf Training: Frage/Antworten/Nachricht neutral zurückgesetzt', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Auswärtsspiel/ }))

    await userEvent.click(screen.getByRole('button', { name: 'Training' }))

    expect(screen.getByPlaceholderText('z.B. Wer kommt zum Training?')).toHaveValue('')
    expect(screen.getByDisplayValue('Ja')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Nein')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Vielleicht')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Wird vor der Umfrage gesendet/)).toHaveValue('')
  })

  it('Vorlage angewandt, Frage selbst umgeschrieben, dann Modus auf Einmalig: eigener Text bleibt stehen', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '42')
    await userEvent.click(screen.getByRole('button', { name: /Auswärtsspiel/ }))

    const titleField = screen.getByPlaceholderText('z.B. Wer kommt zum Training?')
    await userEvent.clear(titleField)
    await userEvent.type(titleField, 'Mein eigener Titel')

    await userEvent.click(screen.getByRole('button', { name: 'Einmalig' }))

    expect(screen.getByDisplayValue('Mein eigener Titel')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ja ich will spielen')).toBeInTheDocument()
  })

  it('ohne Vorlage getippter Inhalt im Spieltag-Modus bleibt bei Spieltagwechsel unverändert', async () => {
    render(<PollEditor {...props} draft={{ ...draft, mode: 'GAME_DAY', gameDayId: 42, title: 'Freihand-Titel' }} />)

    await userEvent.selectOptions(screen.getByLabelText('Spieltag'), '43')

    expect(screen.getByDisplayValue('Freihand-Titel')).toBeInTheDocument()
  })

  it('Trainingsumfrage-Vorlage erscheint nur im Trainings-Modus', async () => {
    render(<PollEditor {...props} />)
    expect(screen.queryByRole('button', { name: 'Trainingsumfrage' })).toBeNull() // Einmalig

    await userEvent.click(screen.getByRole('button', { name: 'Spieltag' }))
    expect(screen.queryByRole('button', { name: 'Trainingsumfrage' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Training' }))
    expect(screen.getByRole('button', { name: 'Trainingsumfrage' })).toBeInTheDocument()
  })

  it('Trainingsumfrage-Vorlage füllt Frage und die zwei Optionen Ja/Nein', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Training' }))

    await userEvent.click(screen.getByRole('button', { name: 'Trainingsumfrage' }))

    expect(screen.getByPlaceholderText('z.B. Wer kommt zum Training?')).toHaveValue('Wer kommt morgen zum Training?')
    expect(screen.getByDisplayValue('Ja')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Nein')).toBeInTheDocument()
    expect(screen.getByLabelText(/Mehrfachauswahl/)).not.toBeChecked()
  })

  it('Trainingsumfrage-Vorlage angewandt, dann Modus auf Einmalig: unveränderter Inhalt wird neutral zurückgesetzt', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Training' }))
    await userEvent.click(screen.getByRole('button', { name: 'Trainingsumfrage' }))

    await userEvent.click(screen.getByRole('button', { name: 'Einmalig' }))

    expect(screen.getByPlaceholderText('z.B. Wer kommt zum Training?')).toHaveValue('')
    expect(screen.getByDisplayValue('Ja')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Nein')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Vielleicht')).toBeInTheDocument()
  })

  it('Trainingsumfrage-Vorlage angewandt, Frage selbst umgeschrieben, dann Modus auf Einmalig: eigener Text bleibt stehen', async () => {
    render(<PollEditor {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Training' }))
    await userEvent.click(screen.getByRole('button', { name: 'Trainingsumfrage' }))
    const titleField = screen.getByPlaceholderText('z.B. Wer kommt zum Training?')
    await userEvent.clear(titleField)
    await userEvent.type(titleField, 'Mein eigener Titel')

    await userEvent.click(screen.getByRole('button', { name: 'Einmalig' }))

    expect(screen.getByDisplayValue('Mein eigener Titel')).toBeInTheDocument()
  })
})
