import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { GameClockStartSheet } from './GameClockStartSheet'

// Geteilter Dialog zwischen Legacy-ScoringPage (Task 5) und Spielbogen (Task 6). Rein
// präsentational — der Aufrufer verdrahtet API-Calls über onStart/onReset. Zwei Modi:
// hasStarted=false zeigt die Start-Optionen (50/90 min, freie Eingabe, ohne Limit),
// hasStarted=true zeigt nur die Zurücksetzen-Aktion (kein Sinn, ein Limit zu wählen,
// während die Uhr schon läuft).

beforeEach(() => {
  // Erzwingt den Desktop-Zweig von ResponsiveSheet (CenterModal statt vaul's Drawer).
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

describe('GameClockStartSheet — Start-Modus (hasStarted=false)', () => {
  it('zeigt 50/90 min, freie Eingabe und "Ohne Limit"', () => {
    render(<GameClockStartSheet open onClose={() => {}} onStart={() => {}} onReset={() => {}} hasStarted={false} />)

    expect(screen.getByText('Uhr starten')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '50 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ohne Limit' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('eigenes Limit (min)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Uhr zurücksetzen' })).not.toBeInTheDocument()
  })

  it('"50 min" ruft onStart(50) auf', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameClockStartSheet open onClose={() => {}} onStart={onStart} onReset={() => {}} hasStarted={false} />)

    await user.click(screen.getByRole('button', { name: '50 min' }))
    expect(onStart).toHaveBeenCalledWith(50)
  })

  it('"Ohne Limit" ruft onStart(null) auf', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameClockStartSheet open onClose={() => {}} onStart={onStart} onReset={() => {}} hasStarted={false} />)

    await user.click(screen.getByRole('button', { name: 'Ohne Limit' }))
    expect(onStart).toHaveBeenCalledWith(null)
  })

  it('freie Eingabe: Start bleibt deaktiviert ohne gültige Zahl ≥1, aktiviert sich danach', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameClockStartSheet open onClose={() => {}} onStart={onStart} onReset={() => {}} hasStarted={false} />)

    const startButton = screen.getByRole('button', { name: 'Start' })
    expect(startButton).toBeDisabled()

    const input = screen.getByPlaceholderText('eigenes Limit (min)')
    fireEvent.change(input, { target: { value: '0' } })
    expect(startButton).toBeDisabled()

    fireEvent.change(input, { target: { value: '30' } })
    expect(startButton).toBeEnabled()

    await user.click(startButton)
    expect(onStart).toHaveBeenCalledWith(30)
  })
})

describe('GameClockStartSheet — Zurücksetzen-Modus (hasStarted=true)', () => {
  it('zeigt nur die Zurücksetzen-Aktion, keine Start-Optionen', () => {
    render(<GameClockStartSheet open onClose={() => {}} onStart={() => {}} onReset={() => {}} hasStarted />)

    expect(screen.getByRole('heading', { name: 'Uhr zurücksetzen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Uhr zurücksetzen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '50 min' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ohne Limit' })).not.toBeInTheDocument()
  })

  it('zeigt ohne durationEstimate keine Restzeit-Zeile', () => {
    render(<GameClockStartSheet open onClose={() => {}} onStart={() => {}} onReset={() => {}} hasStarted />)
    expect(screen.queryByText(/min noch/)).not.toBeInTheDocument()
  })

  it('zeigt Restzeit + Basis, wenn durationEstimate übergeben wird', () => {
    render(
      <GameClockStartSheet
        open
        onClose={() => {}}
        onStart={() => {}}
        onReset={() => {}}
        hasStarted
        durationEstimate={{ remainingMinutes: 53, completedHalfInnings: 7 }}
      />
    )
    expect(screen.getByText(/≈ 53 min noch/)).toBeInTheDocument()
    expect(screen.getByText(/7 abgeschlossenen Halbinnings/)).toBeInTheDocument()
  })

  it('fragt vor dem Zurücksetzen nach Bestätigung und nennt, dass nur die Uhr betroffen ist', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    render(<GameClockStartSheet open onClose={() => {}} onStart={() => {}} onReset={onReset} hasStarted />)

    await user.click(screen.getByRole('button', { name: 'Uhr zurücksetzen' }))
    expect(screen.getByText('Uhr zurücksetzen?')).toBeInTheDocument()
    expect(screen.getByText(/Score, Innings und At-Bats bleiben unverändert/)).toBeInTheDocument()
    expect(onReset).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('Abbrechen im Bestätigungsdialog ruft onReset nicht auf', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    render(<GameClockStartSheet open onClose={() => {}} onStart={() => {}} onReset={onReset} hasStarted />)

    await user.click(screen.getByRole('button', { name: 'Uhr zurücksetzen' }))
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))

    await waitFor(() => expect(screen.queryByText('Uhr zurücksetzen?')).not.toBeInTheDocument())
    expect(onReset).not.toHaveBeenCalled()
  })
})
