import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
