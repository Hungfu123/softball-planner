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

const stand = vi.hoisted(() => ({
  istAdmin: false,
  plays: [] as unknown[],
  categories: [] as unknown[],
}))

vi.mock('@/hooks/usePlays', () => ({
  usePlays: () => ({
    plays: stand.plays, categories: stand.categories, loading: false, error: null,
    duplicate: vi.fn(), remove: vi.fn(),
  }),
}))
vi.mock('@/hooks/useRolle', () => ({
  useRolle: () => ({ istAdmin: stand.istAdmin, istSuperadmin: false }),
}))
vi.mock('@/components/layout/Layout', () => ({ useToastContext: () => ({ show: vi.fn() }) }))

const { default: PlaymakerOverview } = await import('./PlaymakerOverview')

function zeige(adresse = '/orga/playmaker') {
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <PlaymakerOverview />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  stand.istAdmin = false
  stand.plays = []
  stand.categories = []
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

  /*
   * Die Adresse steht jedem offen — ein Tippfehler, ein alter Link, eine gelöschte
   * Kategorie. `?kategorie=999` zeigte eine leere Fläche unter einem Auswahlkasten, auf
   * dem „Alle Kategorien · 54" stand: eine Sackgasse, die sich selbst widersprach.
   */
  /*
   * Im Kapitel steht dieselbe Zeile wie im Spielwissen — eine Karte mit Vorschau, Titel,
   * Lage und Winkel, und zwar EINE je Play. Vorher waren es zwei Links nebeneinander
   * (Bild und Text) in einer randlosen Zeile mit Trennstrich: eine zweite Zeilensprache
   * fuer dieselbe Handlung und zwei Tipp-Flaechen fuer dasselbe Ziel.
   */
  it('zeigt im Kapitel dieselbe Zeile wie das Spielwissen: eine je Play', () => {
    stand.plays = [PLAY]
    stand.categories = [{ id: 1, name: 'Base-Coverage', sortOrder: 10 }]

    zeige('/orga/playmaker?kategorie=1')

    const zumPlay = screen.getAllByRole('link').filter(a => a.getAttribute('href') === '/orga/playmaker/7')
    expect(zumPlay).toHaveLength(1)
    expect(zumPlay[0]).toHaveTextContent('Grounder zum 3B')
  })

  /*
   * Der Positionsfilter liegt im localStorage und ueberlebt den Besuch. Wer ihn vor
   * Wochen auf CF gestellt hat, sieht Wochen spaeter ein Kapitel, in dem Plays fehlen —
   * und nichts sagt ihm, warum. Neue Plays bleiben so unsichtbar. Also sagt es die Seite.
   */
  it('sagt, wenn der Positionsfilter etwas wegnimmt', () => {
    // Zwei Staende, in denen der CF laeuft — nur so zaehlt er als mitwirkend.
    const stand2 = (x: number) => ({
      ordinal: x, durationMs: 600, note: '', outs: 0,
      markers: {
        defenders: [{ position: 'CF' as const, x: 100 + x * 40, y: 60 }],
        runners: [],
        ball: { state: 'AT_BAT' as const, holder: null, x: 155, y: 216, trajectory: 'AIR' as const },
      },
    })
    stand.plays = [
      { ...PLAY, steps: [stand2(1), stand2(2)] },
      { ...PLAY, id: 8, title: 'Anderes Play', steps: [] },
    ]
    stand.categories = [{ id: 1, name: 'Base-Coverage', sortOrder: 10 }]
    localStorage.setItem('playmaker-position', 'CF')

    zeige('/orga/playmaker?kategorie=1')

    expect(screen.getByText(/1 von 2 Plays, gefiltert nach CF/)).toBeInTheDocument()
    localStorage.removeItem('playmaker-position')
  })

  it('zeigt bei einer unbekannten Kategorie die volle Liste', () => {
    stand.istAdmin = true
    stand.plays = [PLAY]
    stand.categories = [{ id: 1, name: 'Base-Coverage', sortOrder: 10 }]

    zeige('/orga/playmaker?kategorie=999')

    expect(screen.getByText('Grounder zum 3B')).toBeInTheDocument()
  })
})
