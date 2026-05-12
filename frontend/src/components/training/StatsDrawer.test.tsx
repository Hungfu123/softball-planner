import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatsDrawer } from './StatsDrawer'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('StatsDrawer', () => {
  it('zeigt Spieler-Namen wenn open', () => {
    const players = [mockPlayer(1, 'Khang'), mockPlayer(2, 'Hung')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
      [2, { last3Months: { attended: 7, total: 15, percentage: 47 }, lastYear: { attended: 20, total: 50, percentage: 40 } }],
    ])
    render(<StatsDrawer open={true} onClose={() => {}} players={players} stats={stats} avgPresent={8.2} totalTrainings={15} trainings={[]} attendance={new Map()} />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
    expect(screen.getByText('Hung')).toBeInTheDocument()
  })

  it('zeigt Aggregate-Section', () => {
    render(<StatsDrawer open={true} onClose={() => {}} players={[]} stats={new Map()} avgPresent={8.2} totalTrainings={15} trainings={[]} attendance={new Map()} />)
    expect(screen.getByText(/8\.2/)).toBeInTheDocument()
  })

  it('sortiert nach Quote DESC', () => {
    const players = [mockPlayer(1, 'Alice'), mockPlayer(2, 'Bob'), mockPlayer(3, 'Charlie')]
    const stats = new Map([
      [1, { last3Months: { attended: 3, total: 10, percentage: 30 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [2, { last3Months: { attended: 8, total: 10, percentage: 80 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [3, { last3Months: { attended: 5, total: 10, percentage: 50 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
    ])
    render(<StatsDrawer open={true} onClose={() => {}} players={players} stats={stats} avgPresent={5} totalTrainings={10} trainings={[]} attendance={new Map()} />)
    const names = Array.from(document.querySelectorAll('[data-stats-row-name]')).map(el => el.textContent)
    expect(names).toEqual(['Bob', 'Charlie', 'Alice'])
  })

  it('rendert nicht wenn open=false', () => {
    render(<StatsDrawer open={false} onClose={() => {}} players={[mockPlayer(1, 'Khang')]} stats={new Map()} avgPresent={0} totalTrainings={0} trainings={[]} attendance={new Map()} />)
    expect(screen.queryByText('Khang')).not.toBeInTheDocument()
  })

  it('Tab-Toggle: klick auf Matrix zeigt HistoryMatrix', () => {
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([
      [1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
    ])
    const trainings = [{ id: 1, date: '2026-05-01' }]
    const attendance = new Map([[1, new Map([[1, true]])]])
    render(<StatsDrawer open={true} onClose={() => {}} players={players} stats={stats} avgPresent={5} totalTrainings={1} trainings={trainings} attendance={attendance} />)

    const matrixTab = screen.getByRole('button', { name: /^Matrix$/i })
    fireEvent.click(matrixTab)
    // After click, matrix shows training date
    expect(screen.getByText(/01\.05/)).toBeInTheDocument()
  })
})
