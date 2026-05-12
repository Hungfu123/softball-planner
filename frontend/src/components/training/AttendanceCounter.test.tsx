import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceCounter } from './AttendanceCounter'

describe('AttendanceCounter', () => {
  it('zeigt Anzahl/Total und Prozent', () => {
    render(<AttendanceCounter present={8} total={15} />)
    expect(screen.getByText('8 / 15')).toBeInTheDocument()
    expect(screen.getByText('53%')).toBeInTheDocument()
  })

  it('zeigt 0% wenn total=0', () => {
    render(<AttendanceCounter present={0} total={0} />)
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('zeigt 100% wenn alle da', () => {
    render(<AttendanceCounter present={5} total={5} />)
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
