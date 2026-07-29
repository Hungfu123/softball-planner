import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GameDayVotePreview } from '@/types'
import { PollSyncToolbarButton } from './PollSyncToolbarButton'

function preview(overrides: Partial<GameDayVotePreview>): GameDayVotePreview {
  return {
    pollExists: false,
    sent: false,
    toAdd: [],
    toRemove: [],
    optionVoters: [],
    unknownVoters: [],
    voteCount: 0,
    yesCount: 0,
    ...overrides,
  }
}

describe('PollSyncToolbarButton', () => {
  it('zeigt den Button + Badge, wenn die Umfrage gesendet wurde und es unbekannte Wähler gibt', () => {
    const status = preview({ pollExists: true, sent: true, unknownVoters: ['Sandra W.'] })
    render(<PollSyncToolbarButton variant="desktop" pollStatus={status} onClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: /WhatsApp-Stimmen/ })).toBeInTheDocument()
    expect(screen.getByText(/1 unbekannt/)).toBeInTheDocument()
  })

  it('zeigt keinen Badge, wenn es keine unbekannten Wähler gibt', () => {
    const status = preview({ pollExists: true, sent: true, unknownVoters: [] })
    render(<PollSyncToolbarButton variant="mobile" pollStatus={status} onClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: /WhatsApp-Stimmen/ })).toBeInTheDocument()
    expect(screen.queryByText(/unbekannt/)).not.toBeInTheDocument()
  })

  it('rendert nichts ohne Umfrage', () => {
    render(<PollSyncToolbarButton variant="desktop" pollStatus={preview({ pollExists: false, sent: false })} onClick={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('rendert nichts, solange die Umfrage noch nicht gesendet wurde', () => {
    render(<PollSyncToolbarButton variant="desktop" pollStatus={preview({ pollExists: true, sent: false })} onClick={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('rendert nichts, solange der Poll-Status noch nicht geladen ist', () => {
    render(<PollSyncToolbarButton variant="desktop" pollStatus={null} onClick={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('ruft onClick auf, wenn geklickt wird (Verdrahtung zum Öffnen des Sheets)', async () => {
    const onClick = vi.fn()
    const status = preview({ pollExists: true, sent: true })
    render(<PollSyncToolbarButton variant="mobile" pollStatus={status} onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: /WhatsApp-Stimmen/ }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('mobil und Desktop treffen für denselben Status dieselbe Sichtbarkeitsentscheidung', () => {
    const status = preview({ pollExists: true, sent: true })
    const { unmount } = render(<PollSyncToolbarButton variant="mobile" pollStatus={status} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
    unmount()

    render(<PollSyncToolbarButton variant="desktop" pollStatus={status} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
