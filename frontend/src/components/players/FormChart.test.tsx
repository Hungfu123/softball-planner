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
    expect(screen.getByText(/AVG aus 8 At-Bats/)).toBeInTheDocument()
  })

  it('waehlt den Punkt, der dem Finger am naechsten liegt', () => {
    const { container } = render(<FormChart {...basis} points={[
      point({ gameId: 1, date: '2026-04-11', hits: 2, atBats: 3, opponent: 'Münster' }),
      point({ gameId: 2, date: '2026-04-18', opponent: 'Köln' }),
    ]} />)

    // Eine Flaeche statt einer pro Punkt — getroffen wird ueber die Position.
    const flaeche = container.querySelector('rect')!
    flaeche.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 100,
      right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

    fireEvent.pointerDown(flaeche, { clientX: 2 })
    expect(screen.getByText(/vs Münster · 2 von 3/)).toBeInTheDocument()

    // Ziehen nach rechts wandert weiter, ohne neu zu zielen.
    fireEvent.pointerMove(flaeche, { clientX: 198, buttons: 1 })
    expect(screen.getByText(/vs Köln/)).toBeInTheDocument()
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
    expect(screen.getByText(/OPS aus 10 PA/)).toBeInTheDocument()
  })

  it('zeichnet eine zweite Linie und nennt beide Namen, sobald verglichen wird', () => {
    render(<FormChart
      {...basis}
      points={[
        point({ gameId: 1, date: '2026-04-11' }),
        point({ gameId: 2, date: '2026-04-18' }),
      ]}
      teammates={[{ playerId: 7, playerName: 'Khang' }]}
      compares={[{ playerId: 7, playerName: 'Khang', points: [point({ gameId: 3, date: '2026-04-11', atBats: 4, hits: 2 })] }]}
      onComparesChange={() => {}}
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
      onComparesChange={() => {}}
    />)

    expect(screen.getByRole('option', { name: 'Khang' })).toBeInTheDocument()
  })

  it('zeichnet die Vergleichsreihe als eigene Linie', () => {
    const { container } = render(<FormChart
      {...basis}
      points={[point({ gameId: 1, date: '2026-05-01' }), point({ gameId: 2, date: '2026-06-01' })]}
      compares={[
        { playerId: 7, playerName: 'Khang', points: [point({ gameId: 8, date: '2026-03-01' }), point({ gameId: 9, date: '2026-09-01' })] },
        { playerId: 9, playerName: 'Hung', points: [point({ gameId: 10, date: '2026-04-01' }), point({ gameId: 11, date: '2026-08-01' })] },
      ]}
      teammates={[{ playerId: 7, playerName: 'Khang' }, { playerId: 9, playerName: 'Hung' }]}
      onComparesChange={() => {}}
    />)

    // Eigene Linie plus zwei Vergleichslinien.
    expect(container.querySelectorAll('path').length).toBe(3)
  })

  it('nimmt hoechstens zwei Vergleiche und bietet dann keinen weiteren an', () => {
    render(<FormChart
      {...basis}
      points={[point({ gameId: 1 })]}
      compares={[
        { playerId: 7, playerName: 'Khang', points: [point({ gameId: 8 })] },
        { playerId: 9, playerName: 'Hung', points: [point({ gameId: 10 })] },
      ]}
      teammates={[
        { playerId: 7, playerName: 'Khang' },
        { playerId: 9, playerName: 'Hung' },
        { playerId: 11, playerName: 'Kairi' },
      ]}
      onComparesChange={() => {}}
    />)

    // Beide Vergleiche lassen sich wieder entfernen, ein dritter wird nicht angeboten.
    expect(screen.getByRole('button', { name: /Khang aus dem Vergleich nehmen/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hung aus dem Vergleich nehmen/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Kairi' })).not.toBeInTheDocument()
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
