import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Play } from './board/types'

const PLAY: Play = {
  id: 7,
  title: 'Grounder zum 3B',
  categoryId: 1,
  gameState: 'ANY',
  gameStateNote: null,
  counterpartPlayId: null,
  steps: [],
}

const stand = vi.hoisted(() => ({ istAdmin: false, plays: [] as unknown[] }))

vi.mock('@/hooks/usePlays', () => ({
  usePlays: () => ({
    plays: stand.plays, categories: [], loading: false, error: null,
    duplicate: vi.fn(), remove: vi.fn(),
  }),
}))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ istAdmin: stand.istAdmin, istSuperadmin: false }),
}))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: vi.fn() }) }))

const { default: PlaymakerOverview } = await import('./PlaymakerOverview')

function zeige() {
  return render(<MemoryRouter><PlaymakerOverview /></MemoryRouter>)
}

beforeEach(() => {
  stand.istAdmin = false
  stand.plays = []
})

describe('Play-Übersicht', () => {
  /*
   * Spieler kommen über den Reiter Spielwissen hierher, und dort heißt die Hälfte
   * Defense. Sie sollen unter dem Begriff ankommen, unter dem sie gesucht haben. Der
   * Name Playmaker bleibt trotzdem stehen: die Trainer kennen die Seite so.
   */
  it('überschreibt die Übersicht mit Defense und nennt Playmaker darüber', () => {
    stand.istAdmin = true
    zeige()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Defense')
    expect(screen.getByText('Playmaker')).toBeInTheDocument()
  })

  /*
   * Der Weg zurück fehlte. Ein Spieler kommt aus Spielwissen, und die Seite liegt unter
   * /orga — einem Reiter, den er nicht hat. Die Zeile über der Überschrift ist bei ihm
   * deshalb der Rückweg, beim Trainer bleibt sie der Name der Seite: der steht über Orga
   * und hat seinen Reiter markiert.
   */
  it('gibt einem Spieler den Weg zurück ins Spielwissen', () => {
    zeige()

    expect(screen.getByRole('link', { name: /Spielwissen/ })).toHaveAttribute('href', '/spielwissen')
  })

  it('gibt einem Trainer keinen Rückweg, sondern den Namen der Seite', () => {
    stand.istAdmin = true
    zeige()

    expect(screen.queryByRole('link', { name: /Spielwissen/ })).toBeNull()
  })

  /*
   * Das große Feld oben ist weg, bei beiden Rollen.
   *
   * Es zeigte das zuletzt bearbeitete Play in Großaufnahme vor der Liste. Als die Seite
   * eine Werkbank war, war das der Einstieg; seit sie ein Inhaltsverzeichnis aus
   * Kapiteln ist, steht es vor dem, was man sucht — und „zuletzt bearbeitet" ist eine
   * Auskunft über die Arbeit des Trainers, nicht über Softball.
   */
  it.each([true, false])('zeigt kein großes Feld mehr (Admin: %s)', admin => {
    stand.istAdmin = admin
    stand.plays = [PLAY]
    zeige()

    expect(screen.queryByText(/zuletzt bearbeitet/)).toBeNull()
  })

  /* Die Suche gehört dem Trainer: ein Spieler liest ein Kapitel aus fünf bis elf Zeilen. */
  it('zeigt die Suche nur dem Trainer', () => {
    stand.plays = [PLAY]
    zeige()
    expect(screen.queryByLabelText('Plays durchsuchen')).toBeNull()
  })
})
