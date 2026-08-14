import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareCounterButton } from './ShareCounterButton'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ShareCounterButton', () => {
  it('nutzt das native Teilen-Blatt, wenn es da ist', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: navigator.clipboard })

    render(<ShareCounterButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('/counter') }),
      ),
    )
  })

  it('kopiert in die Zwischenablage, wenn Teilen fehlt, und meldet das zurück', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share: undefined,
      clipboard: { writeText },
    })

    render(<ShareCounterButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/counter')))
    expect(await screen.findByText('Link kopiert')).toBeInTheDocument()
  })

  it('meldet, wenn auch das Kopieren scheitert', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('nope'))
    vi.stubGlobal('navigator', {
      share: undefined,
      clipboard: { writeText },
    })

    render(<ShareCounterButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    expect(await screen.findByText('Kopieren nicht möglich')).toBeInTheDocument()
  })

  it('schweigt, wenn der Nutzer das Teilen-Blatt abbricht', async () => {
    const abort = Object.assign(new Error('abgebrochen'), { name: 'AbortError' })
    const share = vi.fn().mockRejectedValue(abort)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })

    render(<ShareCounterButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Link kopiert')).not.toBeInTheDocument()
    expect(screen.queryByText('Kopieren nicht möglich')).not.toBeInTheDocument()
  })
})
