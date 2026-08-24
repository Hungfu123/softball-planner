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

  it('sortiert nach 3-Monats-Anzahl DESC', () => {
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

  it('zeigt Anzahl statt Prozent', () => {
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
    ])
    render(<StatsDrawer open={true} onClose={() => {}} players={players} stats={stats} avgPresent={5} totalTrainings={15} trainings={[]} attendance={new Map()} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('36')).toBeInTheDocument()
    expect(screen.queryByText(/80%/)).not.toBeInTheDocument()
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

  it('zeigt Wochentag-Chips nur wenn mehrere Trainingstage vorkommen', () => {
    const players = [mockPlayer(1, 'Khang')]
    const monOnly = [{ id: 1, date: '2026-05-04' }, { id: 2, date: '2026-05-11' }]
    const { unmount } = render(
      <StatsDrawer open={true} onClose={() => {}} players={players} stats={new Map()}
        avgPresent={1} totalTrainings={2} trainings={monOnly} attendance={new Map()} />
    )
    expect(screen.queryByText('Trainingstage')).not.toBeInTheDocument()
    unmount()

    render(
      <StatsDrawer open={true} onClose={() => {}} players={players} stats={new Map()}
        avgPresent={1} totalTrainings={2}
        trainings={[{ id: 1, date: '2026-05-04' }, { id: 2, date: '2026-05-06' }]}
        attendance={new Map()} />
    )
    expect(screen.getByText('Trainingstage')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Montag \(P\/C\) ausblenden/ })).toBeInTheDocument()
  })

  it('Montag ausblenden rechnet Trainings-Anzahl und Teilnahmen neu', () => {
    const players = [mockPlayer(1, 'Khang')]
    // Mo 04.05. (da), Mi 06.05. (da), Mo 11.05. (nicht da)
    const trainings = [
      { id: 1, date: '2026-05-04' },
      { id: 2, date: '2026-05-06' },
      { id: 3, date: '2026-05-11' },
    ]
    const attendance = new Map<number, Map<number, boolean>>([
      [1, new Map([[1, true]])],
      [2, new Map([[1, true]])],
      [3, new Map([[1, false]])],
    ])
    const stats = new Map([
      [1, { last3Months: { attended: 2, total: 3, percentage: 67 }, lastYear: { attended: 2, total: 3, percentage: 67 } }],
    ])
    render(
      <StatsDrawer open={true} onClose={() => {}} players={players} stats={stats}
        avgPresent={0.67} totalTrainings={3} trainings={trainings} attendance={attendance} />
    )
    const trainingsTile = () => screen.getByText('Trainings').parentElement as HTMLElement
    // ungefiltert: 3 Trainings
    expect(trainingsTile()).toHaveTextContent('3')

    fireEvent.click(screen.getByRole('button', { name: /Montag \(P\/C\) ausblenden/ }))

    // nur noch das Mittwoch-Training -> 1 Training
    expect(trainingsTile()).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /Montag \(P\/C\) einblenden/ })).toBeInTheDocument()
  })
})
