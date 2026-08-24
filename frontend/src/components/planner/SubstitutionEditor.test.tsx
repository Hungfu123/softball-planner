import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubstitutionEditor } from './SubstitutionEditor'
import type { Player, LocalLineupEntry, LocalSubstitution } from '@/types'

const mkPlayer = (id: number, name: string): Player => ({
  id,
  name,
  regular: false,
  defaultBattingOrder: null,
})

const entry = (player: Player, position: string): LocalLineupEntry => ({
  player,
  position,
  dhBatterId: null,
  dhBatterName: null,
})

describe('SubstitutionEditor', () => {
  const anne = mkPlayer(1, 'Anne')
  const yuki = mkPlayer(2, 'Yuki')
  const subs: LocalSubstitution[] = [{ playerOut: anne, playerIn: yuki, inning: 3 }]

  it('Entfernen-Button ist ohne Hover erreichbar (Touch)', () => {
    render(
      <SubstitutionEditor
        substitutions={subs}
        lineupEntries={[entry(anne, 'SS')]}
        poolPlayers={[yuki]}
        staff={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: /Auswechslung Anne → Yuki entfernen/ })
    // Kein opacity-0/group-hover — sonst auf dem Handy unsichtbar und untappbar
    expect(button.className).not.toMatch(/opacity-0/)
    expect(button.className).not.toMatch(/group-hover/)
  })

  it('Klick auf Entfernen meldet den Index', () => {
    const onRemove = vi.fn()
    render(
      <SubstitutionEditor
        substitutions={subs}
        lineupEntries={[entry(anne, 'SS')]}
        poolPlayers={[yuki]}
        staff={[]}
        onAdd={vi.fn()}
        onRemove={onRemove}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /entfernen/ }))
    expect(onRemove).toHaveBeenCalledWith(0)
  })
})
