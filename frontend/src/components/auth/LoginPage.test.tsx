import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('zeigt einen Link zum Counter, der ohne Anmeldung erreichbar ist', () => {
    render(
      <MemoryRouter>
        <LoginPage onLogin={() => {}} error={null} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Nur Counter öffnen' })
    expect(link).toHaveAttribute('href', '/counter')
  })

  it('trägt den Teamnamen als Überschrift, nicht einen zweiten Produktnamen', () => {
    render(<MemoryRouter><LoginPage onLogin={() => {}} error={null} /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dead Sox')
    expect(screen.queryByText(/Lineup HQ/i)).not.toBeInTheDocument()
  })

  it('nimmt die Marke ohne Hintergrundquadrat', () => {
    // deadsox.svg trägt ein <rect> in #142B49. Auf dem Navy der Seite wäre es heute unsichtbar,
    // weil navy-900 genau dieser Wert ist — aber das ist Zufall zweier Zahlen, nicht Absicht im
    // Code. Mit der Marke ohne Quadrat sitzt das Logo auf jedem Grund richtig.
    const { container } = render(<MemoryRouter><LoginPage onLogin={() => {}} error={null} /></MemoryRouter>)
    const bild = container.querySelector('img')
    expect(bild).toHaveAttribute('src', '/deadsox-mark.svg')
  })

  it('setzt eine eigene Fokusfarbe — der globale rote Ring ist auf Navy ein Fehlersignal', () => {
    const { container } = render(<MemoryRouter><LoginPage onLogin={() => {}} error={null} /></MemoryRouter>)
    expect(container.firstElementChild?.className).toContain('[--fokus-farbe:#fff]')
  })

  it('sagt, was Benutzername und Passwort sind (Deploy-Tag: alle sehen die Maske zum ersten Mal)', () => {
    render(<MemoryRouter><LoginPage onLogin={() => {}} error={null} /></MemoryRouter>)
    expect(screen.getByText(/Benutzername ist dein Vorname, klein geschrieben/)).toBeInTheDocument()
    // "für alle dasselbe" ist der Teil, nach dem sonst gesucht wird: es gibt kein
    // persönliches Startpasswort, und wer das nicht weiß, sucht vergeblich.
    expect(screen.getByText(/Passwort ist für alle dasselbe/)).toBeInTheDocument()
    expect(screen.getByText(/WhatsApp-Gruppe/)).toBeInTheDocument()
    expect(screen.getByText(/ein eigenes setzen/)).toBeInTheDocument()
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

  /*
   * Das Passwort wird aus der WhatsApp-Gruppe abgetippt, oft am Handy. Wer sich vertippt,
   * sieht sonst nur „Anmeldung fehlgeschlagen" und weiss nicht, welches der beiden Felder
   * schuld ist. Entscheidend ist dabei die Vorgabe: VERBORGEN. Offen anzufangen hiesse,
   * das Passwort jedem zu zeigen, der danebensteht.
   */
  it('zeigt das Passwort erst auf Wunsch — und beginnt verborgen', () => {
    render(
      <MemoryRouter>
        <LoginPage onLogin={() => {}} error={null} />
      </MemoryRouter>,
    )

    const passwort = screen.getByLabelText('Passwort')
    expect(passwort).toHaveAttribute('type', 'password')

    const schalter = screen.getByRole('button', { name: 'Passwort anzeigen' })
    expect(schalter).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(schalter)
    expect(passwort).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Passwort verbergen' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Passwort verbergen' }))
    expect(passwort).toHaveAttribute('type', 'password')
  })

  /* Der Schalter darf das Absenden nicht stoeren: sichtbar oder nicht, es geht dasselbe raus. */
  it('schickt dasselbe Passwort, ob sichtbar oder nicht', () => {
    const onLogin = vi.fn()
    render(
      <MemoryRouter>
        <LoginPage onLogin={onLogin} error={null} />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: 'maria' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort anzeigen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ready Up' }))

    expect(onLogin).toHaveBeenCalledWith('maria', 'geheim')
  })
})
