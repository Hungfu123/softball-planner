import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PositionProfileSheet } from './PositionProfileSheet'
import type { Player } from '@/types'

const player: Player = {
  id: 7,
  name: 'Mia',
  regular: true,
  defaultBattingOrder: null,
  primaryPosition: 'SECOND_BASE',
  secondaryPosition: 'RF',
  tertiaryPosition: null,
}

/** Die Buttons einer der drei Slot-Sektionen. */
function section(title: string) {
  return screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
}

function selectedIn(title: string): string[] {
  return within(section(title))
    .getAllByRole('button')
    .filter(b => b.getAttribute('aria-pressed') === 'true')
    .map(b => b.textContent?.trim() ?? '')
}

function tap(title: string, label: string) {
  fireEvent.click(within(section(title)).getByRole('button', { name: label }))
}

describe('PositionProfileSheet', () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()

  beforeEach(() => {
    onSave.mockClear()
    onClose.mockClear()
    render(<PositionProfileSheet player={player} open onClose={onClose} onSave={onSave} />)
  })

  it('zeigt das gespeicherte Profil beim Öffnen', () => {
    expect(selectedIn('Erste Position')).toEqual(['2B'])
    expect(selectedIn('Zweite Position')).toEqual(['RF'])
    expect(selectedIn('Dritte Position')).toEqual([])
  })

  it('tauscht die Plätze, wenn eine schon vergebene Position gewählt wird', () => {
    tap('Erste Position', 'RF')

    expect(selectedIn('Erste Position')).toEqual(['RF'])
    expect(selectedIn('Zweite Position')).toEqual(['2B'])
  })

  it('ersetzt den Slot, wenn die Position noch frei ist', () => {
    tap('Erste Position', 'SS')

    expect(selectedIn('Erste Position')).toEqual(['SS'])
    expect(selectedIn('Zweite Position')).toEqual(['RF'])
  })

  it('rückt nach, wenn die Erstposition abgewählt wird — keine Lücke', () => {
    tap('Erste Position', '2B')

    expect(selectedIn('Erste Position')).toEqual(['RF'])
    expect(selectedIn('Zweite Position')).toEqual([])
  })

  it('speichert die drei Slots', async () => {
    tap('Dritte Position', 'IF/OF')
    fireEvent.click(screen.getByRole('button', { name: 'Positionen speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      primary: 'SECOND_BASE',
      secondary: 'RF',
      tertiary: 'IF_OF',
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('bleibt ohne Änderung inaktiv', () => {
    expect(screen.getByRole('button', { name: 'Positionen speichern' })).toBeDisabled()
  })
})
