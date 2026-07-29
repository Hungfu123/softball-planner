import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewPlayerModal } from './NewPlayerModal'

describe('NewPlayerModal', () => {
  it('ruft onConfirm mit dem eingegebenen Namen auf', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<NewPlayerModal voterName="Max M." onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /Anlegen/ }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Max M.'))
  })

  it('bleibt bei einem Fehler offen und behält den eingetippten Namen', async () => {
    // Regressionstest: bei fehlgeschlagenem onConfirm darf sich das Modal weder schließen
    // noch den eingetippten Namen verlieren (Retry ohne erneutes Tippen).
    // mockImplementation statt mockRejectedValue: die abgelehnte Promise entsteht erst beim
    // Aufruf (innerhalb des try/await in NewPlayerModal) und wird dort sofort gefangen — sonst
    // meldet Vitest eine "unhandled rejection", weil mockRejectedValue sie sofort erzeugt.
    const onConfirm = vi.fn().mockImplementation(() => Promise.reject(new Error('Server-Fehler')))
    render(<NewPlayerModal voterName="Max M." onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /Anlegen/ }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(screen.getByDisplayValue('Max M.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anlegen' })).not.toBeDisabled())
  })

  it('zwei schnelle Klicks erzeugen nur einen onConfirm-Aufruf', async () => {
    let resolveConfirm: () => void = () => {}
    const onConfirm = vi.fn(() => new Promise<void>(resolve => { resolveConfirm = resolve }))
    render(<NewPlayerModal voterName="Max M." onCancel={vi.fn()} onConfirm={onConfirm} />)
    const button = screen.getByRole('button', { name: /Anlegen/ })

    fireEvent.click(button)
    fireEvent.click(button)

    expect(onConfirm).toHaveBeenCalledTimes(1)
    resolveConfirm()
    await waitFor(() => expect(button).not.toBeDisabled())
  })
})
