import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GamesNeedRangeNotice } from './GamesNeedRangeNotice'

describe('GamesNeedRangeNotice', () => {
  it('sagt, warum es hier nichts gibt und was zu tun ist', () => {
    render(<GamesNeedRangeNotice />)

    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Einsätze zählt ganze Spiele')
    expect(note).toHaveTextContent('Saison, Jahr oder Alle Zeit')
  })
})
