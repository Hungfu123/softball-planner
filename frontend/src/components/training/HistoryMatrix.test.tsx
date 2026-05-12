import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryMatrix } from './HistoryMatrix'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('HistoryMatrix', () => {
  it('rendert Spieler-Namen und Trainings-Datum', () => {
    const players = [mockPlayer(1, 'Khang')]
    const trainings = [{ id: 1, date: '2026-05-01' }, { id: 2, date: '2026-05-08' }]
    const attendance = new Map([[1, new Map([[1, true]])], [2, new Map([[1, false]])]])
    render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
    expect(screen.getByText(/01\.05/)).toBeInTheDocument()
    expect(screen.getByText(/08\.05/)).toBeInTheDocument()
  })

  it('zeigt ✓ wenn anwesend, · wenn nicht', () => {
    const players = [mockPlayer(1, 'Khang')]
    const trainings = [{ id: 1, date: '2026-05-01' }, { id: 2, date: '2026-05-08' }]
    const attendance = new Map([[1, new Map([[1, true]])], [2, new Map([[1, false]])]])
    const { container } = render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    const cells = container.querySelectorAll('[data-attendance]')
    expect(cells.length).toBe(2)
    expect(cells[0].getAttribute('data-attendance')).toBe('true')
    expect(cells[1].getAttribute('data-attendance')).toBe('false')
  })

  it('ignoriert cancelled Trainings', () => {
    const players = [mockPlayer(1, 'Khang')]
    const trainings = [{ id: 1, date: '2026-05-01' }, { id: 2, date: '2026-05-08', cancelled: true }]
    const attendance = new Map([[1, new Map([[1, true]])], [2, new Map([[1, true]])]])
    const { container } = render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    const cells = container.querySelectorAll('[data-attendance]')
    expect(cells.length).toBe(1) // Nur cancelled-false training
  })

  it('zeigt Empty-State wenn keine Trainings', () => {
    render(<HistoryMatrix players={[]} trainings={[]} attendance={new Map()} />)
    expect(screen.getByText(/Keine Trainings vorhanden/i)).toBeInTheDocument()
  })

  it('sortiert Spieler alphabetisch', () => {
    const players = [mockPlayer(1, 'Bob'), mockPlayer(2, 'Alice'), mockPlayer(3, 'Charlie')]
    const trainings = [{ id: 1, date: '2026-05-01' }]
    const attendance = new Map()
    const { container } = render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    const names = Array.from(container.querySelectorAll('tbody td.font-medium')).map(el => el.textContent)
    expect(names).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sortiert Trainings chronologisch', () => {
    const players = [mockPlayer(1, 'Khang')]
    const trainings = [
      { id: 1, date: '2026-05-15' },
      { id: 2, date: '2026-05-01' },
      { id: 3, date: '2026-05-08' },
    ]
    const attendance = new Map()
    render(<HistoryMatrix players={players} trainings={trainings} attendance={attendance} />)
    // header should have dates in chronological order: 01.05, 08.05, 15.05
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent)
    expect(headers[1]).toMatch(/01\.05/)
    expect(headers[2]).toMatch(/08\.05/)
    expect(headers[3]).toMatch(/15\.05/)
  })
})
