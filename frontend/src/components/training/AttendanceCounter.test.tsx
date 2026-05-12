import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttendanceCounter } from './AttendanceCounter'

describe('AttendanceCounter', () => {
  it('zeigt Anwesenheits-Anzahl + Trend', () => {
    render(<AttendanceCounter present={8} avgRecent={6.2} recentCount={5} onStatsClick={vi.fn()} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText(/Anwesend/i)).toBeInTheDocument()
    expect(screen.getByText(/Ø 6\.2/)).toBeInTheDocument()
    expect(screen.getByText(/letzte 5/)).toBeInTheDocument()
  })

  it('blendet Trend aus wenn keine Vergangenheit', () => {
    render(<AttendanceCounter present={5} avgRecent={null} recentCount={0} onStatsClick={vi.fn()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.queryByText(/letzte/)).not.toBeInTheDocument()
  })

  it('ruft onStatsClick bei Klick auf Statistik-Button', () => {
    const onStatsClick = vi.fn()
    render(<AttendanceCounter present={0} avgRecent={null} recentCount={0} onStatsClick={onStatsClick} />)
    fireEvent.click(screen.getByRole('button', { name: /Statistik anzeigen/i }))
    expect(onStatsClick).toHaveBeenCalled()
  })

  it('zeigt kein Roster-Total mehr', () => {
    render(<AttendanceCounter present={5} avgRecent={6} recentCount={5} onStatsClick={vi.fn()} />)
    expect(screen.queryByText(/\/ 27/)).not.toBeInTheDocument()
  })
})
