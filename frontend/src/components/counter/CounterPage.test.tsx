import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CounterPage from './CounterPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <CounterPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('CounterPage', () => {
  it('zeigt beide Scores auf 0', () => {
    renderPage()
    expect(screen.getByLabelText('Ball: 0 von 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Strike: 0 von 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Out: 0 von 2')).toBeInTheDocument()
  })

  it('zählt einen Strike hoch', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Strike' }))
    expect(screen.getByLabelText('Strike: 1 von 2')).toBeInTheDocument()
  })

  it('macht aus drei Strikes einen Out', async () => {
    const user = userEvent.setup()
    renderPage()
    const strike = screen.getByRole('button', { name: 'Strike' })
    await user.click(strike)
    await user.click(strike)
    await user.click(strike)
    expect(screen.getByLabelText('Out: 1 von 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Strike: 0 von 2')).toBeInTheDocument()
  })

  it('sperrt Zurück, solange nichts passiert ist', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeDisabled()
  })

  // Der Bestätigungsknopf im Modal heißt bewusst anders als der auslösende Knopf
  // ("Alles zurücksetzen" vs. "Zurücksetzen") — sonst wären beide nicht unterscheidbar.
  it('setzt erst nach Bestätigung zurück', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Strike' }))
    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Strike: 1 von 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Alles zurücksetzen' }))
    expect(screen.getByLabelText('Strike: 0 von 2')).toBeInTheDocument()
  })

  it('bricht das Zurücksetzen ab, ohne den Stand anzufassen', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Strike' }))
    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Strike: 1 von 2')).toBeInTheDocument()
  })

  it('zählt einen Ball hoch, Strike bleibt unberührt', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Ball' }))
    expect(screen.getByLabelText('Ball: 1 von 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Strike: 0 von 2')).toBeInTheDocument()
  })

  it('zählt ein Foul als Strike', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Foul' }))
    expect(screen.getByLabelText('Strike: 1 von 2')).toBeInTheDocument()
  })

  it('ein Foul bei zwei Strikes treibt den Strike-Zähler nicht auf drei', async () => {
    const user = userEvent.setup()
    renderPage()
    const strike = screen.getByRole('button', { name: 'Strike' })
    await user.click(strike)
    await user.click(strike)
    await user.click(screen.getByRole('button', { name: 'Foul' }))
    expect(screen.getByLabelText('Strike: 2 von 2')).toBeInTheDocument()
  })

  it('zählt einen Out hoch und setzt Ball- und Strike-Zähler zurück', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Ball' }))
    await user.click(screen.getByRole('button', { name: 'Strike' }))
    await user.click(screen.getByRole('button', { name: 'Out' }))
    expect(screen.getByLabelText('Out: 1 von 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Ball: 0 von 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Strike: 0 von 2')).toBeInTheDocument()
  })

  it('Heim + Run erhöht nur den Heim-Score', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Heim + Run' }))
    const heim = screen.getByText('Heim').parentElement as HTMLElement
    const gast = screen.getByText('Gast').parentElement as HTMLElement
    expect(within(heim).getByText('1')).toBeInTheDocument()
    expect(within(gast).getByText('0')).toBeInTheDocument()
  })

  it('Gast + Run erhöht nur den Gast-Score', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Gast + Run' }))
    const heim = screen.getByText('Heim').parentElement as HTMLElement
    const gast = screen.getByText('Gast').parentElement as HTMLElement
    expect(within(gast).getByText('1')).toBeInTheDocument()
    expect(within(heim).getByText('0')).toBeInTheDocument()
  })

  it('Seitenwechsel kippt die Seite', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Seitenwechsel' }))
    expect(screen.getByText('1. Inning, unten, Heim schlägt')).toBeInTheDocument()
  })

  it('Zurück stellt den Stand vor der letzten Aktion wieder her', async () => {
    const user = userEvent.setup()
    renderPage()
    const back = screen.getByRole('button', { name: 'Zurück' })
    expect(back).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Strike' }))
    expect(back).not.toBeDisabled()

    await user.click(back)
    expect(screen.getByLabelText('Strike: 0 von 2')).toBeInTheDocument()
    expect(back).toBeDisabled()
  })
})
