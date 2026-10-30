import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/usePlays', () => ({
  usePlays: () => ({
    plays: [], categories: [], loading: false, error: null,
    duplicate: vi.fn(), remove: vi.fn(),
  }),
}))
vi.mock('@/hooks/useRolle', () => ({ useRolle: () => ({ istAdmin: false, istSuperadmin: false }) }))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: vi.fn() }) }))

const { default: PlaymakerOverview } = await import('./PlaymakerOverview')

describe('Play-Übersicht', () => {
  /*
   * Spieler kommen über den Reiter Spielwissen hierher, und dort heißt die Hälfte
   * Defense. Sie sollen unter dem Begriff ankommen, unter dem sie gesucht haben. Der
   * Name Playmaker bleibt trotzdem stehen: die Trainer kennen die Seite so.
   */
  it('überschreibt die Übersicht mit Defense und nennt Playmaker darüber', () => {
    render(<MemoryRouter><PlaymakerOverview /></MemoryRouter>)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Defense')
    expect(screen.getByText('Playmaker')).toBeInTheDocument()
  })
})
