import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { GenderSheet } from './GenderSheet'
import type { Gender, Player } from '@/types'

function player(id: number, name: string, gender?: Gender): Player {
  return { id, name, regular: true, defaultBattingOrder: null, gender: gender ?? null }
}

function row(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement
}

describe('GenderSheet', () => {
  it('setzt das Geschlecht per Tipp', async () => {
    const onSet = vi.fn().mockResolvedValue(undefined)
    render(<GenderSheet players={[player(1, 'Anne'), player(2, 'Hung')]} onSet={onSet} />)

    fireEvent.click(within(row('Anne')).getByRole('button', { name: 'Frau' }))

    await waitFor(() => expect(onSet).toHaveBeenCalledWith(1, 'FEMALE'))
  })

  it('hebt die Zuordnung auf, wenn man dieselbe Seite nochmal tippt', async () => {
    const onSet = vi.fn().mockResolvedValue(undefined)
    render(<GenderSheet players={[player(1, 'Anne', 'FEMALE'), player(2, 'Hung')]} onSet={onSet} />)

    fireEvent.click(within(row('Anne')).getByRole('button', { name: 'Frau' }))

    await waitFor(() => expect(onSet).toHaveBeenCalledWith(1, null))
  })

  it('zeigt, wie viele noch offen sind', () => {
    render(<GenderSheet players={[player(1, 'Anne', 'FEMALE'), player(2, 'Hung'), player(3, 'Dat')]} onSet={vi.fn()} />)
    expect(screen.getByText(/ohne Zuordnung/).textContent).toContain('Noch 2 ohne Zuordnung')
  })

  it('markiert die gewählte Seite', () => {
    render(<GenderSheet players={[player(1, 'Anne', 'FEMALE'), player(2, 'Hung')]} onSet={vi.fn()} />)
    expect(within(row('Anne')).getByRole('button', { name: 'Frau' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(row('Anne')).getByRole('button', { name: 'Mann' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('zeigt einen Fehler, wenn das Speichern scheitert', async () => {
    const onSet = vi.fn().mockRejectedValue(new Error('Netzwerk weg'))
    render(<GenderSheet players={[player(1, 'Anne'), player(2, 'Hung')]} onSet={onSet} />)

    fireEvent.click(within(row('Anne')).getByRole('button', { name: 'Mann' }))

    await waitFor(() => expect(screen.getByText('Netzwerk weg')).toBeInTheDocument())
  })

  it('lässt bei einer einzelnen Person Name und Zähler weg', () => {
    // Der Sheet-Titel nennt die Person bereits.
    render(<GenderSheet players={[player(1, 'Anne')]} onSet={vi.fn()} />)

    expect(screen.queryByText('Anne')).not.toBeInTheDocument()
    expect(screen.queryByText(/ohne Zuordnung/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Frau' })).toBeInTheDocument()
  })

  it('bietet auch Divers an', async () => {
    const onSet = vi.fn().mockResolvedValue(undefined)
    render(<GenderSheet players={[player(1, 'Anne'), player(2, 'Hung')]} onSet={onSet} />)

    fireEvent.click(within(row('Anne')).getByRole('button', { name: 'Divers' }))

    await waitFor(() => expect(onSet).toHaveBeenCalledWith(1, 'DIVERSE'))
  })

  it('zeigt Kürzel, nennt aber das ganze Wort für Screenreader', () => {
    render(<GenderSheet players={[player(1, 'Anne')]} onSet={vi.fn()} />)

    // Sichtbar steht W/M/D, der zugängliche Name bleibt ausgeschrieben.
    const frau = screen.getByRole('button', { name: 'Frau' })
    expect(frau).toHaveTextContent('W')
    expect(screen.getByRole('button', { name: 'Mann' })).toHaveTextContent('M')
    expect(screen.getByRole('button', { name: 'Divers' })).toHaveTextContent('D')
  })

  it('sagt, dass für die Quote nur „Frau“ zählt', () => {
    render(<GenderSheet players={[player(1, 'Anne')]} onSet={vi.fn()} />)
    expect(screen.getByText(/entscheidet der Verband/)).toBeInTheDocument()
  })
})
