import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UnknownVoterRow } from './UnknownVoterRow'

const players = [
  { id: 1, name: 'Max', regular: true, defaultBattingOrder: null },
  { id: 2, name: 'Ben', regular: true, defaultBattingOrder: null },
]

describe('UnknownVoterRow', () => {
  it('weist den gewählten Spieler zu', async () => {
    const onAssign = vi.fn()
    render(<UnknownVoterRow voterName="Sandra W." subline="Spieltag 09.08." players={players}
                            onAssign={onAssign} onCreate={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('Spieler für Sandra W.'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Zuweisen' }))

    expect(onAssign).toHaveBeenCalledWith(2)
  })

  it('Zuweisen ist ohne Auswahl deaktiviert', () => {
    render(<UnknownVoterRow voterName="Sandra W." players={players} onAssign={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Zuweisen' })).toBeDisabled()
  })

  it('legt über den Plus-Button einen neuen Spieler an', async () => {
    const onCreate = vi.fn()
    render(<UnknownVoterRow voterName="Sandra W." players={players} onAssign={vi.fn()} onCreate={onCreate} />)

    await userEvent.click(screen.getByRole('button', { name: 'Neuer Spieler' }))
    await userEvent.click(screen.getByRole('button', { name: /Anlegen/ }))

    expect(onCreate).toHaveBeenCalledWith('Sandra W.')
  })

  it('lässt das Modal bei fehlschlagendem onCreate offen, Name bleibt erhalten', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('boom'))
    render(<UnknownVoterRow voterName="Sandra W." players={players} onAssign={vi.fn()} onCreate={onCreate} />)

    await userEvent.click(screen.getByRole('button', { name: 'Neuer Spieler' }))
    await userEvent.click(screen.getByRole('button', { name: /Anlegen/ }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Sandra W.'))

    expect(screen.getByRole('heading', { name: 'Neuer Spieler' })).toBeInTheDocument()
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Sandra W.')
  })
})
