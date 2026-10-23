import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnalysisModeTabs } from './AnalysisModeTabs'

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AnalysisModeTabs />
    </MemoryRouter>,
  )
  return screen.getAllByRole('link')
}

const activeLabels = (links: HTMLElement[]) =>
  links.filter(l => l.getAttribute('aria-current') === 'page').map(l => l.textContent)

describe('AnalysisModeTabs', () => {
  it('zeigt vier Reiter in fester Reihenfolge mit ihren Zielen', () => {
    const links = renderAt('/stats')

    expect(links.map(l => l.textContent)).toEqual(['Schlagen', 'Einsätze', 'Spiel-Verlauf', 'Gegner'])
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      '/stats?view=batting',
      '/stats?view=games',
      '/teams/spiele',
      '/teams',
    ])
  })

  it('markiert auf /stats?view=batting nur Schlagen', () => {
    expect(activeLabels(renderAt('/stats?view=batting'))).toEqual(['Schlagen'])
  })

  it('markiert auf /stats?view=games nur Einsätze', () => {
    expect(activeLabels(renderAt('/stats?view=games'))).toEqual(['Einsätze'])
  })

  it('markiert auf /stats ohne Parameter Schlagen', () => {
    expect(activeLabels(renderAt('/stats'))).toEqual(['Schlagen'])
  })

  it('markiert auf /teams/spiele nur Spiel-Verlauf', () => {
    expect(activeLabels(renderAt('/teams/spiele'))).toEqual(['Spiel-Verlauf'])
  })

  it('markiert auf /teams nur Gegner', () => {
    expect(activeLabels(renderAt('/teams'))).toEqual(['Gegner'])
  })

  it('behält auf /stats den Zeitraum beim Wechsel zwischen Schlagen und Einsätzen', () => {
    const links = renderAt('/stats?scope=season&seasonId=3&view=batting')

    expect(links[1].getAttribute('href')).toBe('/stats?scope=season&seasonId=3&view=games')
  })

  it('gibt jedem Reiter mindestens 44 px Höhe', () => {
    for (const l of renderAt('/stats')) expect(l.className).toContain('min-h-11')
  })
})
