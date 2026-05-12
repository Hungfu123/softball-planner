import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttendanceList } from './AttendanceList'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('AttendanceList', () => {
  it('rendert alle Spieler', () => {
    const players = [mockPlayer(1, 'Khang'), mockPlayer(2, 'Hung')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
      [2, { last3Months: { attended: 7, total: 15, percentage: 47 }, lastYear: { attended: 20, total: 50, percentage: 40 } }],
    ])
    render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
    expect(screen.getByText('Hung')).toBeInTheDocument()
  })

  it('zeigt Quote-Inline 3M und Jahr', () => {
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([
      [1, { last3Months: { attended: 12, total: 15, percentage: 80 }, lastYear: { attended: 36, total: 50, percentage: 72 } }],
    ])
    render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    expect(screen.getByText(/3M 80%/i)).toBeInTheDocument()
    expect(screen.getByText(/J 72%/i)).toBeInTheDocument()
  })

  it('sortiert nach Quote DESC', () => {
    const players = [mockPlayer(1, 'Alice'), mockPlayer(2, 'Bob'), mockPlayer(3, 'Charlie')]
    const stats = new Map([
      [1, { last3Months: { attended: 3, total: 10, percentage: 30 }, lastYear: { attended: 10, total: 30, percentage: 33 } }],
      [2, { last3Months: { attended: 8, total: 10, percentage: 80 }, lastYear: { attended: 24, total: 30, percentage: 80 } }],
      [3, { last3Months: { attended: 5, total: 10, percentage: 50 }, lastYear: { attended: 15, total: 30, percentage: 50 } }],
    ])
    const { container } = render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    const names = Array.from(container.querySelectorAll('[data-player-name]')).map(el => el.textContent)
    expect(names).toEqual(['Bob', 'Charlie', 'Alice'])
  })

  it('sortiert alphabetisch', () => {
    const players = [mockPlayer(2, 'Bob'), mockPlayer(1, 'Alice'), mockPlayer(3, 'Charlie')]
    const stats = new Map([
      [1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [2, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
      [3, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }],
    ])
    const { container } = render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="alpha" />)
    const names = Array.from(container.querySelectorAll('[data-player-name]')).map(el => el.textContent)
    expect(names).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('ruft onToggle bei Klick', () => {
    const onToggle = vi.fn()
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([[1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }]])
    render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={onToggle} sortBy="quote" />)
    const icon = screen.getByRole('button', { name: /Khang.*togglen/i })
    fireEvent.click(icon)
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('zeigt anwesend visuell anders', () => {
    const players = [mockPlayer(1, 'Khang')]
    const stats = new Map([[1, { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }]])
    const { container, rerender } = render(<AttendanceList players={players} stats={stats} presentIds={new Set()} onToggle={vi.fn()} sortBy="quote" />)
    expect(container.querySelector('[data-attendance-icon]')?.getAttribute('data-present')).toBe('false')
    rerender(<AttendanceList players={players} stats={stats} presentIds={new Set([1])} onToggle={vi.fn()} sortBy="quote" />)
    expect(container.querySelector('[data-attendance-icon]')?.getAttribute('data-present')).toBe('true')
  })
})
