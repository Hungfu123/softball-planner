import { describe, it, expect } from 'vitest'
import { ohneKlickstile } from './klickstile'

describe('ohneKlickstile', () => {
  it('lässt Layout und Farbe stehen', () => {
    expect(ohneKlickstile('flex items-center bg-navy-900 text-white rounded-lg')).toBe('flex items-center bg-navy-900 text-white rounded-lg')
  })

  it('entfernt die einfachen Klickstile', () => {
    expect(ohneKlickstile('flex hover:bg-white/10 active:scale-95 cursor-pointer group group-hover:opacity-100 px-2'))
      .toBe('flex px-2')
  })

  it('entfernt benannte Gruppen', () => {
    expect(ohneKlickstile('group/zeile group-hover/zeile:underline p-1')).toBe('p-1')
  })

  it.each([
    'sm:hover:bg-white/10',
    'md:active:scale-95',
    'lg:group-hover:opacity-100',
    '!hover:bg-red-600',
    'hover:bg-red-600!',
    'sm:cursor-pointer',
    'cursor-pointer!',
    'group-hover/name:underline',
    'sm:group-hover/name:underline',
    'peer-hover:block',
    'dark:sm:hover:bg-black',
  ])('entfernt %s', token => {
    expect(ohneKlickstile(`p-1 ${token} m-1`)).toBe('p-1 m-1')
  })

  it('verwechselt nichts mit ähnlichen Namen', () => {
    // Keine Klickstile: Fokus, Gruppe als Wortteil, Cursor-Varianten ausser pointer
    expect(ohneKlickstile('focus-visible:ring-2 grouped cursor-default cursor-not-allowed hovering'))
      .toBe('focus-visible:ring-2 grouped cursor-default cursor-not-allowed hovering')
  })

  it('kennt die Grenze: eckige Klammern bleiben stehen', () => {
    expect(ohneKlickstile('[&:hover]:bg-white')).toBe('[&:hover]:bg-white')
  })

  it('verträgt leeren und fehlenden Eingang', () => {
    expect(ohneKlickstile()).toBe('')
    expect(ohneKlickstile('   ')).toBe('')
  })
})
