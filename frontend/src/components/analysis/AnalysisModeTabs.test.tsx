import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnalysisModeTabs } from './AnalysisModeTabs'

describe('AnalysisModeTabs', () => {
  it('zeigt drei Modi, Statistik zuerst', () => {
    render(
      <MemoryRouter>
        <AnalysisModeTabs />
      </MemoryRouter>,
    )

    const links = screen.getAllByRole('link')
    expect(links.map(l => l.textContent)).toEqual(['Statistik', 'Spiel-Verlauf', 'Gegner'])
    expect(links[0]).toHaveAttribute('href', '/stats')
    expect(links[1]).toHaveAttribute('href', '/teams/spiele')
    expect(links[2]).toHaveAttribute('href', '/teams')
  })
})
