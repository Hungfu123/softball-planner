import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('zeigt einen Link zum Zähler, der ohne Anmeldung erreichbar ist', () => {
    render(
      <MemoryRouter>
        <LoginPage onLogin={() => {}} error={null} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Nur Zähler öffnen' })
    expect(link).toHaveAttribute('href', '/counter')
  })

  it('sagt, was Benutzername und Passwort sind (Deploy-Tag: alle sehen die Maske zum ersten Mal)', () => {
    render(<MemoryRouter><LoginPage onLogin={() => {}} error={null} /></MemoryRouter>)
    expect(screen.getByText(/Benutzername ist dein Vorname, klein geschrieben/)).toBeInTheDocument()
    expect(screen.getByText(/Passwort steht in der WhatsApp-Gruppe/)).toBeInTheDocument()
  })

  it('hat ein Benutzername-Feld vor dem Passwort, mit Autofill-Hinweisen', () => {
    render(
      <MemoryRouter>
        <LoginPage onLogin={() => {}} error={null} />
      </MemoryRouter>,
    )

    const benutzer = screen.getByLabelText('Benutzername')
    const passwort = screen.getByLabelText('Passwort')
    expect(benutzer).toBeVisible()
    expect(benutzer).toHaveAttribute('autocomplete', 'username')
    expect(benutzer).not.toHaveAttribute('readonly')
    expect(benutzer.compareDocumentPosition(passwort) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('übergibt Benutzername und Passwort beim Absenden', () => {
    const onLogin = vi.fn()
    render(
      <MemoryRouter>
        <LoginPage onLogin={onLogin} error={null} />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'maria' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ready Up' }))

    expect(onLogin).toHaveBeenCalledWith('maria', 'geheim')
  })
})
