import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BogenLineupAccordion } from './BogenLineupAccordion'
import type { SpielbogenSlotResponse } from '@/types'

const homeLineup: SpielbogenSlotResponse[] = [
  { id: 1, side: 'HOME', slot: 1, name: 'Ylvi', position: '2B', battingOrder: 1 },
  { id: 2, side: 'HOME', slot: 2, name: 'Juli', position: null, battingOrder: 2 },
]

const awayLineup: SpielbogenSlotResponse[] = [
  { id: 3, side: 'AWAY', slot: 1, name: 'Weber', position: 'CF', battingOrder: 1 },
]

const base = {
  homeLineup,
  awayLineup,
  homeTeamName: 'Köln Abbots',
  awayTeamName: 'Allstar',
}

describe('BogenLineupAccordion', () => {
  it('startet eingeklappt', () => {
    render(<BogenLineupAccordion {...base} />)
    expect(screen.queryByText('Ylvi')).not.toBeInTheDocument()
  })

  it('klappt beim Klick auf die Kopfzeile auf und zeigt die Heim-Liste', async () => {
    render(<BogenLineupAccordion {...base} />)
    await userEvent.click(screen.getByText('Aufstellung'))
    expect(screen.getByText('Ylvi')).toBeInTheDocument()
    expect(screen.getByText('Juli')).toBeInTheDocument()
  })

  it('rendert eine Gedankenstrich-Position statt leer/null', async () => {
    render(<BogenLineupAccordion {...base} />)
    await userEvent.click(screen.getByText('Aufstellung'))
    const juliRow = screen.getByText('Juli').closest('div')
    expect(juliRow).toHaveTextContent('–')
  })

  it('wechselt zur Gast-Liste über die Pill, ohne die Heim-Liste zu verlieren', async () => {
    render(<BogenLineupAccordion {...base} />)
    await userEvent.click(screen.getByText('Aufstellung'))

    await userEvent.click(screen.getByRole('button', { name: 'Gast' }))
    expect(screen.getByText('Weber')).toBeInTheDocument()
    expect(screen.queryByText('Ylvi')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Heim' }))
    expect(screen.getByText('Ylvi')).toBeInTheDocument()
    expect(screen.getByText('Juli')).toBeInTheDocument()
  })

  it('rendert den Stift nur, wenn onEditSlot gesetzt ist', async () => {
    render(<BogenLineupAccordion {...base} />)
    await userEvent.click(screen.getByText('Aufstellung'))
    expect(screen.queryByRole('button', { name: 'Ylvi bearbeiten' })).not.toBeInTheDocument()
  })

  it('rendert den Stift, wenn onEditSlot gesetzt ist, und ruft ihn mit dem Slot auf', async () => {
    const onEditSlot = vi.fn()
    render(<BogenLineupAccordion {...base} onEditSlot={onEditSlot} />)
    await userEvent.click(screen.getByText('Aufstellung'))

    const pencil = screen.getByRole('button', { name: 'Ylvi bearbeiten' })
    expect(pencil).toBeInTheDocument()

    await userEvent.click(pencil)
    expect(onEditSlot).toHaveBeenCalledWith(homeLineup[0])
  })
})
