import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldView } from './FieldView'
import { FIELD_POSITIONS } from '@/types'
import type { LocalLineupEntry } from '@/types'

function neun(): LocalLineupEntry[] {
  return FIELD_POSITIONS.map((position, i) => ({
    player: { id: i + 1, name: `Spieler${i + 1}` },
    position,
    dhBatterId: null,
    dhBatterName: null,
  })) as LocalLineupEntry[]
}

describe('FieldView', () => {
  it('zeichnet ohne onPositionClick keine Schaltflaechen', () => {
    render(<FieldView entries={neun()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('traegt ohne onPositionClick weder title noch Cursor noch Hover', () => {
    const { container } = render(<FieldView entries={neun()} />)
    expect(container.querySelector('[title]')).toBeNull()
    expect(container.innerHTML).not.toContain('cursor-pointer')
    expect(container.innerHTML).not.toContain('hover:bg-')
  })

  it('zeigt den Zaehler und den Offen-Hinweis nur in der Werkbank', () => {
    const { rerender } = render(<FieldView entries={neun().slice(0, 8)} />)
    expect(screen.queryByText('8/9')).not.toBeInTheDocument()
    expect(screen.queryByText('1 offen')).not.toBeInTheDocument()
    rerender(<FieldView entries={neun().slice(0, 8)} onPositionClick={vi.fn()} />)
    expect(screen.getByText('8/9')).toBeInTheDocument()
    expect(screen.getByText('1 offen')).toBeInTheDocument()
  })

  it('zeichnet auf Wunsch ohne Ueberschrift, mit allem anderen', () => {
    const { container } = render(<FieldView entries={neun()} ohneUeberschrift />)
    expect(screen.queryByText('Feld')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Spieler1')).toBeInTheDocument()
  })

  it('hebt genau einen Spieler hervor', () => {
    const { container } = render(<FieldView entries={neun()} hervorgehobenerSpielerId={3} />)
    const markiert = container.querySelectorAll('[class*="amber-400"]')
    expect(markiert).toHaveLength(1)
    expect(markiert[0]).toHaveTextContent('Spieler3')
  })

  it('hebt ohne Angabe niemanden hervor', () => {
    const { container } = render(<FieldView entries={neun()} />)
    expect(container.querySelectorAll('[class*="amber-400"]')).toHaveLength(0)
  })

  it('nutzt keine Palettenfarben fuer Flaeche, Schrift und Linie', () => {
    const { container } = render(<FieldView entries={neun()} onPositionClick={vi.fn()} />)
    expect(container.innerHTML).not.toMatch(/navy-900|cream-\d|gray-400/)
  })
})
