import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GatedLink } from './GatedLink'
import { ohneKlickstile } from '@/utils/klickstile'

const KLASSEN = 'flex group cursor-pointer hover:bg-white/10 active:scale-[0.99] group-hover:underline rounded-lg'

function zeige(erlaubt: boolean) {
  render(
    <MemoryRouter>
      <GatedLink erlaubt={erlaubt} to="/gameday/1" className={KLASSEN}>Inhalt</GatedLink>
    </MemoryRouter>,
  )
  return screen.getByText('Inhalt')
}

describe('GatedLink', () => {
  it('ist mit Recht ein Link mit allen Stilen', () => {
    const el = zeige(true)
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/gameday/1')
    expect(el).toHaveClass('cursor-pointer', 'hover:bg-white/10', 'active:scale-[0.99]')
  })

  it('ist ohne Recht eine bloße Fläche ohne Hover-, Active-, Group- und Cursor-Stile', () => {
    const el = zeige(false)
    expect(el.tagName).toBe('DIV')
    expect(el).not.toHaveAttribute('href')
    expect(el.className).toBe('flex rounded-lg')
  })
})

describe('ohneKlickstile', () => {
  it('lässt Layout-Klassen stehen', () => {
    expect(ohneKlickstile('px-2 hover:bg-x active:scale-95 text-sm cursor-pointer')).toBe('px-2 text-sm')
  })
})
