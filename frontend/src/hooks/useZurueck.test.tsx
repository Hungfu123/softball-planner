import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useZurueck, zurueckLabel, zurueckSatz } from './useZurueck'

function Probe({ standard }: { standard: string }) {
  return <span>{useZurueck(standard)}</span>
}

/*
 * Liest aus dem EIGENEN Container, nicht aus `screen` und auch nicht aus den Abfragen des
 * Render-Ergebnisses: beide suchen im ganzen `body`. Aufgeräumt wird zwischen Testfällen,
 * nicht innerhalb — zwei Aufrufe in einem Fall hinterließen sonst zwei Treffer.
 */
function zeige(state: unknown, standard = '/orga') {
  const { container } = render(
    <MemoryRouter initialEntries={[{ pathname: '/counter', state }]}>
      <Probe standard={standard} />
    </MemoryRouter>,
  )
  return container.textContent
}

describe('useZurueck', () => {
  it('nimmt den gemerkten Weg, nicht die Vorgabe', () => {
    expect(zeige({ zurueck: '/' })).toBe('/')
  })

  it('fällt ohne Angabe auf die Vorgabe zurück — geteilter Link, eingetippte Adresse', () => {
    expect(zeige(null)).toBe('/orga')
    expect(zeige({})).toBe('/orga')
  })

  /*
   * `state` kommt aus dem Verlauf des Browsers. Ein Sprungziel ungeprüft daraus zu bauen,
   * hiesse, einem Wert zu folgen, den man nicht selbst gesetzt hat — auch wenn hier nur die
   * eigene App schreibt. Die feste Liste ist billiger als die Frage, ob das je ausnutzbar wird.
   */
  it('folgt keinem Ziel, das nicht auf der Liste steht', () => {
    expect(zeige({ zurueck: 'https://example.invalid' })).toBe('/orga')
    expect(zeige({ zurueck: '/gameday/1/scoring/0' })).toBe('/orga')
    expect(zeige({ zurueck: 42 })).toBe('/orga')
  })
})

describe('Beschriftung', () => {
  it('nennt das Ziel kurz neben dem Pfeil', () => {
    expect(zurueckLabel('/')).toBe('Start')
    expect(zurueckLabel('/players')).toBe('Kader')
    expect(zurueckLabel('/orga')).toBe('Orga')
  })

  /* „Zurück zu Start" sagt niemand — der Satz braucht den Artikel. */
  it('baut den ganzen Satz mit Artikel', () => {
    expect(zurueckSatz('/')).toBe('Zurück zur Startseite')
    expect(zurueckSatz('/players')).toBe('Zurück zum Kader')
    expect(zurueckSatz('/orga')).toBe('Zurück zur Orga')
  })
})
