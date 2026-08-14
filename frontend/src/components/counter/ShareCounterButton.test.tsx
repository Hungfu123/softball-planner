import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareCounterButton } from './ShareCounterButton'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ShareCounterButton', () => {
  it('nutzt das native Teilen-Blatt, wenn es da ist', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: navigator.clipboard })
    const user = userEvent.setup()

    render(<ShareCounterButton />)
    await user.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('/counter') }),
    )
  })

  it('kopiert in die Zwischenablage, wenn Teilen fehlt, und meldet das zurück', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const mockClipboard = { writeText }
    const realNavigator = navigator

    // Verwende einen Proxy, um navigator.clipboard zu überschreiben
    const navProxy = new Proxy(realNavigator, {
      get(target, prop, receiver) {
        if (prop === 'clipboard') {
          return mockClipboard
        }
        if (prop === 'share') {
          return undefined
        }
        return Reflect.get(target, prop, receiver)
      },
    })

    vi.stubGlobal('navigator', navProxy as any)

    const user = userEvent.setup()

    render(<ShareCounterButton />)
    await user.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/counter'))
    expect(await screen.findByText('Link kopiert')).toBeInTheDocument()
  })

  it('meldet, wenn auch das Kopieren scheitert', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('nope'))
    const mockClipboard = { writeText }
    const realNavigator = navigator

    // Verwende einen Proxy, um navigator.clipboard zu überschreiben
    const navProxy = new Proxy(realNavigator, {
      get(target, prop, receiver) {
        if (prop === 'clipboard') {
          return mockClipboard
        }
        if (prop === 'share') {
          return undefined
        }
        return Reflect.get(target, prop, receiver)
      },
    })

    vi.stubGlobal('navigator', navProxy as any)

    const user = userEvent.setup()

    render(<ShareCounterButton />)
    await user.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    expect(await screen.findByText('Kopieren nicht möglich')).toBeInTheDocument()
  })

  it('schweigt, wenn der Nutzer das Teilen-Blatt abbricht', async () => {
    const abort = Object.assign(new Error('abgebrochen'), { name: 'AbortError' })
    const share = vi.fn().mockRejectedValue(abort)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    const user = userEvent.setup()

    render(<ShareCounterButton />)
    await user.click(screen.getByRole('button', { name: 'Zähler teilen' }))

    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Link kopiert')).not.toBeInTheDocument()
    expect(screen.queryByText('Kopieren nicht möglich')).not.toBeInTheDocument()
  })
})
