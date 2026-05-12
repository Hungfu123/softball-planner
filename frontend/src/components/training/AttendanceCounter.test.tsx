import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceCounter } from './AttendanceCounter'

describe('AttendanceCounter', () => {
  it('zeigt Anwesenheits-Anzahl', () => {
    render(<AttendanceCounter present={8} total={15} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText(/Anwesend/i)).toBeInTheDocument()
  })

  it('zeigt 0 wenn keiner da', () => {
    render(<AttendanceCounter present={0} total={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('zeigt kein Roster-Total mehr', () => {
    render(<AttendanceCounter present={5} total={27} />)
    expect(screen.queryByText(/\/ 27/)).not.toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})
