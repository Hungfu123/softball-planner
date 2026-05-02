import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorPickerDrawer } from './ErrorPickerDrawer'

describe('ErrorPickerDrawer', () => {
  it('Tap auf Fielder ruft onPick mit Position', () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<ErrorPickerDrawer open onClose={onClose} onPick={onPick} />)
    fireEvent.click(screen.getByLabelText('Feldposition 5 3B'))
    expect(onPick).toHaveBeenCalledWith(5)
    expect(onClose).toHaveBeenCalled()
  })
})
