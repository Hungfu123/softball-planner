import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorPickerDrawer } from './ErrorPickerDrawer'

describe('ErrorPickerDrawer', () => {
  it('Tap auf Fielder selektiert (kein direkter onPick); Bestätigen submitted', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<ErrorPickerDrawer open onClose={onClose} onPick={onPick} />)
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    // Kein submit nach Tap
    expect(onPick).not.toHaveBeenCalled()
    // Selection-Hint visible
    expect(screen.getByText(/E5 — 3B/i)).toBeInTheDocument()
    // Bestätigen submitted
    fireEvent.click(screen.getByText(/Bestätigen/i))
    expect(onPick).toHaveBeenCalledWith(5)
    expect(onClose).toHaveBeenCalled()
  })

  it('Bestätigen disabled ohne Auswahl', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<ErrorPickerDrawer open onClose={onClose} onPick={onPick} />)
    const btn = screen.getByText(/Bestätigen/i) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
