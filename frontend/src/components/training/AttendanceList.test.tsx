import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttendanceList } from './AttendanceList'
import type { Player } from '@/types'

const mockPlayer = (id: number, name: string): Player => ({ id, name } as Player)

describe('AttendanceList', () => {
  it('rendert alle Spieler', () => {
    const players = [mockPlayer(1, 'Khang'), mockPlayer(2, 'Hung')]
    render(<AttendanceList players={players} presentIds={new Set()} onToggle={vi.fn()} />)
    expect(screen.getByText('Khang')).toBeInTheDocument()
    expect(screen.getByText('Hung')).toBeInTheDocument()
  })

  it('sortiert alphabetisch', () => {
    const players = [mockPlayer(2, 'Bob'), mockPlayer(1, 'Alice'), mockPlayer(3, 'Charlie')]
    const { container } = render(<AttendanceList players={players} presentIds={new Set()} onToggle={vi.fn()} />)
    const names = Array.from(container.querySelectorAll('[data-player-name]')).map(el => el.textContent)
    expect(names).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('ruft onToggle bei Klick', () => {
    const onToggle = vi.fn()
    const players = [mockPlayer(1, 'Khang')]
    render(<AttendanceList players={players} presentIds={new Set()} onToggle={onToggle} />)
    const btn = screen.getByRole('button', { name: /Khang.*togglen/i })
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('zeigt anwesend visuell anders', () => {
    const players = [mockPlayer(1, 'Khang')]
    const { container, rerender } = render(<AttendanceList players={players} presentIds={new Set()} onToggle={vi.fn()} />)
    expect(container.querySelector('[data-attendance-icon]')?.getAttribute('data-present')).toBe('false')
    rerender(<AttendanceList players={players} presentIds={new Set([1])} onToggle={vi.fn()} />)
    expect(container.querySelector('[data-attendance-icon]')?.getAttribute('data-present')).toBe('true')
  })

  it('zeigt keine Quote/Anzahl im Hauptlisten-Row', () => {
    const players = [mockPlayer(1, 'Khang')]
    render(<AttendanceList players={players} presentIds={new Set()} onToggle={vi.fn()} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/3M/)).not.toBeInTheDocument()
  })
})
