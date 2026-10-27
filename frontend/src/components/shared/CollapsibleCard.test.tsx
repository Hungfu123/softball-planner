import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollapsibleCard } from './CollapsibleCard'

function card() {
  return render(
    <CollapsibleCard title="Letzte Spiele" subtitle="Was dahinter steckt." summary="24 Spiele im Detail">
      <p>Inhalt</p>
    </CollapsibleCard>,
  )
}

/** Breite simulieren: die Karte folgt dem Breakpoint, bis jemand selbst tippt. */
function withViewport(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
}

afterEach(() => vi.unstubAllGlobals())

describe('CollapsibleCard', () => {
  it('startet am Handy zugeklappt und zeigt die Zusammenfassung', () => {
    withViewport(false)
    card()

    expect(screen.getByText('24 Spiele im Detail')).toBeInTheDocument()
    expect(screen.queryByText('Inhalt')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('startet auf breiten Bildschirmen offen', () => {
    withViewport(true)
    card()

    expect(screen.getByText('Inhalt')).toBeInTheDocument()
    expect(screen.getByText('Was dahinter steckt.')).toBeInTheDocument()
  })

  it('ohne matchMedia offen — jsdom soll den Inhalt sehen', () => {
    vi.stubGlobal('matchMedia', undefined)
    card()
    expect(screen.getByText('Inhalt')).toBeInTheDocument()
  })

  it('klappt auf und wieder zu', () => {
    withViewport(false)
    card()

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Inhalt')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })
})
