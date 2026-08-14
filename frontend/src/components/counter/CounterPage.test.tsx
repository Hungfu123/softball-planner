import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
