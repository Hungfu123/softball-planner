import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormChart } from './FormChart'
import type { PlayerFormPoint } from '@/types'

function point(overrides: Partial<PlayerFormPoint> = {}): PlayerFormPoint {
  return {
    gameId: 1,
    date: '2026-04-11',
    opponent: 'Köln Blue Abbots',
    seasonId: 5,
    seasonName: 'Ruhr Fun Liga',
    year: 2026,
    plateAppearances: 4,
    atBats: 4,
    hits: 1,
    walks: 0,
    strikeouts: 1,
    runsBattedIn: 1,
    totalBases: 1,
    timesOnBase: 1,
    stolenBases: 0,
    caughtStealing: 0,
    // Die Kurve rechnet selbst kumulativ — die rolling-Felder des Backends
    // bleiben im Typ, werden hier aber nicht mehr gelesen.
    rollingAverage: 0.333,
    rollingOnBase: 0.4,
    rollingSlugging: 0.5,
    rollingOps: 0.9,
    rollingPlateAppearances: 12,
    provisional: true,
    ...overrides,
  }
}

const basis = { playerName: 'Anne' }

describe('FormChart', () => {
  it('sagt, dass noch nichts gescort ist', () => {
    render(<FormChart points={[]} {...basis} />)
    expect(screen.getByText(/Noch nichts gescort/)).toBeInTheDocument()
  })

  it('summiert über die Spiele auf statt ein Fenster mitzuziehen', () => {
    render(<FormChart {...basis} points={[
      point({ gameId: 1, date: '2026-04-11', atBats: 4, hits: 1, totalBases: 1, timesOnBase: 1, plateAppearances: 4 }),
      point({ gameId: 2, date: '2026-04-18', atBats: 4, hits: 3, totalBases: 3, timesOnBase: 3, plateAppearances: 4 }),
    ]} />)

    // 4 Hits aus 8 Versuchen — nicht der Wert des letzten Spiels allein.
    expect(screen.getByText('.500')).toBeInTheDocument()
    expect(screen.getByText(/AVG über 8 Schlagversuche/)).toBeInTheDocument()
  })

  it('zeigt beim Antippen eines Punktes dessen einzelnes Spiel', () => {
    const { container } = render(<FormChart {...basis} points={[
      point({ gameId: 1, date: '2026-04-11', hits: 2, atBats: 3, opponent: 'Münster' }),
      point({ gameId: 2, date: '2026-04-18' }),
    ]} />)

    fireEvent.pointerEnter(container.querySelectorAll('rect')[0])

    expect(screen.getByText(/vs Münster · 2 von 3/)).toBeInTheDocument()
  })

  it('beschriftet die Kurve für Screenreader', () => {
    render(<FormChart {...basis} points={[
      point({ gameId: 1, date: '2026-04-11', atBats: 4, hits: 1 }),
      point({ gameId: 2, date: '2026-04-18', atBats: 4, hits: 3 }),
    ]} />)
    expect(screen.getByRole('img', { name: /Schlagdurchschnitt über 2 Spiele, zuletzt .500/ })).toBeInTheDocument()
  })

  it('schaltet die Kurve auf eine andere Kennzahl um', () => {
    render(<FormChart {...basis} points={[
      point({ gameId: 1, date: '2026-04-11', atBats: 4, hits: 1, totalBases: 2, timesOnBase: 2, plateAppearances: 5 }),
      point({ gameId: 2, date: '2026-04-18', atBats: 4, hits: 1, totalBases: 2, timesOnBase: 2, plateAppearances: 5 }),
    ]} />)

    fireEvent.click(screen.getByRole('button', { name: 'OPS' }))

    // OBP = 4/10 = .400, SLG = 4/8 = .500 -> OPS .900
    expect(screen.getByText('.900')).toBeInTheDocument()
    expect(screen.getByText(/OPS über 10 Schlagversuche/)).toBeInTheDocument()
  })

  it('zeichnet eine zweite Linie und nennt beide Namen, sobald verglichen wird', () => {
    render(<FormChart
      {...basis}
      points={[
        point({ gameId: 1, date: '2026-04-11' }),
        point({ gameId: 2, date: '2026-04-18' }),
      ]}
      teammates={[{ playerId: 7, playerName: 'Khang' }]}
      compareId={7}
      compareName="Khang"
      comparePoints={[point({ gameId: 3, date: '2026-04-11', atBats: 4, hits: 2 })]}
      onCompare={() => {}}
    />)

    // Beide Namen stehen in der Legende — "Khang" kommt zusaetzlich in der
    // Auswahlliste vor, deshalb gezielt die Legende pruefen.
    const legende = screen.getByText('Anne').parentElement?.parentElement
    expect(legende).toHaveTextContent('Anne')
    expect(legende).toHaveTextContent('Khang')
  })

  it('bietet die Mitspieler zur Auswahl an', () => {
    render(<FormChart
      {...basis}
      points={[point({ gameId: 1 })]}
      teammates={[{ playerId: 7, playerName: 'Khang' }]}
      onCompare={() => {}}
    />)

    expect(screen.getByRole('option', { name: 'Khang' })).toBeInTheDocument()
  })

  it('beschriftet die Zeitachse nach der Skala, nicht nach der eigenen Reihe', () => {
    // Der Vergleichspartner hat frueher angefangen und spaeter aufgehoert — die
    // Achsenenden gehoeren ihm, sonst stuende links ein Datum, das nicht zum Rand passt.
    const { container } = render(<FormChart
      {...basis}
      points={[
        point({ gameId: 1, date: '2026-05-01' }),
        point({ gameId: 2, date: '2026-06-01' }),
      ]}
      compareId={7}
      compareName="Khang"
      comparePoints={[
        point({ gameId: 8, date: '2026-03-01' }),
        point({ gameId: 9, date: '2026-09-01' }),
      ]}
      teammates={[{ playerId: 7, playerName: 'Khang' }]}
      onCompare={() => {}}
    />)

    const texte = [...container.querySelectorAll('text')].map(t => t.textContent)
    expect(texte).toContain('01.03.26')
    expect(texte).toContain('01.09.26')
  })

  it('beginnt die Achse bei null, damit zwei Spieler vergleichbar bleiben', () => {
    const { container } = render(<FormChart {...basis} points={[
      point({ gameId: 1, date: '2026-04-11', atBats: 4, hits: 2 }),
      point({ gameId: 2, date: '2026-04-18', atBats: 4, hits: 2 }),
    ]} />)

    const beschriftungen = [...container.querySelectorAll('text')].map(t => t.textContent)
    expect(beschriftungen).toContain('.000')
  })
})
