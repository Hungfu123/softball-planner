import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

// Diese Tests meinen den Blick des Trainers — der Reiter Einsätze gehoert ihm.
vi.mock('@/hooks/useRolle', () => ({ useRolle: () => ({ istAdmin: true }) }))

const empty = vi.hoisted(() => () => Promise.resolve([]))

vi.mock('@/api/client', () => ({
  getAllGameDays: vi.fn(() => Promise.resolve([
    { id: 7, date: '2101-05-12', label: null, games: [
      { id: 70, gameNumber: 1, opponentTeam: { name: 'Blue Devils' }, scoreUs: 5, scoreThem: 3 },
    ] },
  ])),
  getAllTimeAwards: vi.fn(empty),
  getAllTimeBattingStats: vi.fn(empty),
  getAllTimeStats: vi.fn(empty),
  getDistinctYears: vi.fn(() => Promise.resolve([2101, 2100])),
  getGame: vi.fn(empty),
  getGameBattingStats: vi.fn(empty),
  getGameDayAwards: vi.fn(empty),
  getGameDayBattingStats: vi.fn(empty),
  getOpponentBattingOverview: vi.fn(() => Promise.resolve([{ teamName: 'Blue Devils', battingAverage: 0.3, games: 1 }])),
  getOpponentBattingStats: vi.fn(empty),
  getSeasonAwards: vi.fn(empty),
  getSeasonBattingStats: vi.fn(empty),
  getSeasons: vi.fn(() => Promise.resolve([{ id: 3, name: 'Sommer', year: 2026 }])),
  getSeasonStats: vi.fn(empty),
  getYearAwards: vi.fn(empty),
  getYearBattingStats: vi.fn(empty),
  getYearSeasons: vi.fn(empty),
  getYearStats: vi.fn(empty),
}))

import { StatsPage } from './StatsPage'

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.search}</output>
}
function renderAt(search: string) {
  return render(<MemoryRouter initialEntries={[`/stats${search}`]}><StatsPage /><Where /></MemoryRouter>)
}

describe('StatsPage: Zeitraum als ein Knopf', () => {
  it.each([
    ['scope=year&year=2101', 'Jahr 2101'],
    ['scope=season&seasonId=3', 'Saison Sommer · 2026'],
    ['scope=gameDay&gameDayId=7', 'Spieltag 12.05.2101'],
    ['scope=opponent&opponent=Blue%20Devils', 'Nach Gegner: Blue Devils'],
    ['scope=allTime', 'Alle Zeit'],
    ['scope=game&gameId=70', 'Dieses Spiel'],
  ])('zeigt für %s den Text %s', async (query, text) => {
    renderAt(`?${query}`)
    await waitFor(() => expect(screen.getByTestId('zeitraum-knopf')).toHaveTextContent(text))
    expect(screen.getByTestId('zeitraum-knopf').textContent?.trim()).toBe(text)
  })

  it('öffnet das Blatt, eine Wahl ändert den Zeitraum und schließt es', async () => {
    renderAt('?scope=year&year=2101')
    fireEvent.click(await screen.findByTestId('zeitraum-knopf'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Zeitraum')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Alle Zeit' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('where')).toHaveTextContent('scope=allTime')
    expect(screen.getByTestId('zeitraum-knopf')).toHaveTextContent('Alle Zeit')
  })

  it('bietet im Blatt die Werte des Zeitraums an, Wahl eines Werts schließt', async () => {
    renderAt('?scope=year&year=2101')
    fireEvent.click(await screen.findByTestId('zeitraum-knopf'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('radio', { name: '2100' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('where')).toHaveTextContent('year=2100')
  })

  it.each(['year&year=2101', 'game&gameId=70'])('hat keine Zeitraum-Pillen und keine Auswahlfelder mehr auf der Seite (scope=%s)', async scope => {
    renderAt(`?scope=${scope}`)
    await screen.findByTestId('zeitraum-knopf')
    for (const name of ['Spieltag', 'Saison', 'Jahr', 'Nach Gegner', 'Alle Zeit']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    // „Dieses Spiel" ist nur der Knopf selbst, keine zweite Pille daneben
    expect(screen.queryAllByRole('button', { name: 'Dieses Spiel' }).length).toBe(scope.startsWith('game') ? 1 : 0)
  })

  it('lässt das Blatt nach der Wahl einer Art offen und zeigt die Werte darunter', async () => {
    renderAt('?scope=allTime')
    fireEvent.click(await screen.findByTestId('zeitraum-knopf'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Saison' }))
    expect(await within(dialog).findByRole('radio', { name: 'Sommer · 2026' })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lässt das Blatt nach der Wahl eines Gegners offen', async () => {
    renderAt('?scope=opponent&opponent=Blue%20Devils')
    fireEvent.click(await screen.findByTestId('zeitraum-knopf'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('radio', { name: /^Blue Devils/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('opponent=Blue+Devils')
  })

  it.each(['?scope=allTime', '?scope=year&year=2101', '?scope=opponent&opponent=Blue%20Devils', '?scope=game&gameId=70'])('schließt „Fertig" das Blatt in jedem Zustand (%s)', async query => {
    renderAt(query)
    fireEvent.click(await screen.findByTestId('zeitraum-knopf'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fertig' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('stellt Knopf und Reiter in einen gemeinsamen Container', async () => {
    renderAt('?scope=year&year=2101')
    const nav = await screen.findByRole('navigation', { name: 'Analyse-Ansichten' })
    expect(nav.parentElement).toContainElement(screen.getByTestId('zeitraum-knopf'))
    expect(nav.parentElement).toHaveClass('flex', 'flex-wrap')
  })

  it('zeigt „Dieses Spiel" im Blatt als nicht klickbare Zeile', async () => {
    renderAt('?scope=game&gameId=70')
    fireEvent.click(await screen.findByTestId('zeitraum-knopf'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Dieses Spiel')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Dieses Spiel' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: 'Dieses Spiel' })).not.toBeInTheDocument()
  })

  it('zeigt den Knopftext als Zustand, nicht als Versalien-Etikett', async () => {
    renderAt('?scope=year&year=2101')
    expect(await screen.findByTestId('zeitraum-knopf')).not.toHaveClass('uppercase')
  })

  it('kürzt einen langen Gegnernamen: Wrapper darf schrumpfen, Text trägt truncate', async () => {
    renderAt('?scope=opponent&opponent=Blue%20Devils')
    const knopf = await screen.findByTestId('zeitraum-knopf')
    expect(knopf.parentElement).toHaveClass('min-w-0', 'max-w-full')
    expect(knopf).toHaveClass('max-w-full')
    expect(knopf.querySelector('span')).toHaveClass('truncate')
  })
})
