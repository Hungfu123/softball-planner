import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Layout } from './Layout'

// Der Banner pollt die WhatsApp-Kopplung — für die Reiterleiste irrelevant.
vi.mock('./WhatsappStatusBanner', () => ({ WhatsappStatusBanner: () => null }))

function renderAt(pfad: string) {
  return render(
    <MemoryRouter initialEntries={[pfad]}>
      <Layout />
    </MemoryRouter>,
  )
}

const isTab = (el: HTMLElement) => el.closest('nav') !== null

describe('Layout Reiterleiste', () => {
  it('zeigt fünf Reiter', () => {
    renderAt('/')
    expect(screen.getAllByRole('link').filter(isTab)).toHaveLength(5)
  })

  it.each(['/stats', '/teams', '/teams/spiele'])('markiert ANALYSE auf %s', (pfad) => {
    renderAt(pfad)
    expect(screen.getByRole('link', { name: /Analyse/ })).toHaveClass('bg-white')
  })

  it('hat keinen Spielbogen-Reiter mehr', () => {
    renderAt('/')
    expect(screen.queryByRole('link', { name: /Bogen|Spielbogen/ })).toBeNull()
  })
})
