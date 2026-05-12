import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanEditDrawer } from './PlanEditDrawer'

describe('PlanEditDrawer', () => {
  it('rendert Plan-Inhalt wenn open=true', () => {
    render(<PlanEditDrawer open={true} onClose={vi.fn()} planContent={null} onSave={vi.fn()} />)
    // vaul portals title in 2 Stellen — getAllByText for safety
    expect(screen.getAllByText(/Plan bearbeiten/i).length).toBeGreaterThan(0)
  })

  it('ruft onClose bei Abbrechen-Klick', () => {
    const onClose = vi.fn()
    render(<PlanEditDrawer open={true} onClose={onClose} planContent={null} onSave={vi.fn()} />)
    const cancelBtn = screen.getByRole('button', { name: /Abbrechen/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('Speichern disabled wenn kein Plan', () => {
    render(<PlanEditDrawer open={true} onClose={vi.fn()} planContent={null} onSave={vi.fn()} />)
    const saveBtn = screen.getByRole('button', { name: /Speichern/i })
    expect(saveBtn).toBeDisabled()
  })

  it('rendert nicht wenn open=false', () => {
    render(<PlanEditDrawer open={false} onClose={vi.fn()} planContent={null} onSave={vi.fn()} />)
    expect(screen.queryByText(/Plan bearbeiten/i)).not.toBeInTheDocument()
  })
})
