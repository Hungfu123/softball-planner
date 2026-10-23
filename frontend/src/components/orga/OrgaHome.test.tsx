import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OrgaHome } from './OrgaHome'

describe('OrgaHome', () => {
  it('zeigt vier Kacheln, jede verlinkt auf ihr eigenes Ziel', () => {
    render(
      <MemoryRouter>
        <OrgaHome />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /Einladungen/ })).toHaveAttribute('href', '/orga/einladungen')
    expect(screen.getByRole('link', { name: /WhatsApp-Umfragen/ })).toHaveAttribute('href', '/orga/whatsapp-umfrage')
    expect(screen.getByRole('link', { name: /Zähler/ })).toHaveAttribute('href', '/counter')
    expect(screen.getByRole('link', { name: /Kalender/ })).toHaveAttribute('href', '/kalender')
  })

  it('hat keine Gegner-Kachel mehr — der Navigations-Tab GEGNER ist der Einstieg', () => {
    render(
      <MemoryRouter>
        <OrgaHome />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: /Gegner/ })).toBeNull()
  })
})
