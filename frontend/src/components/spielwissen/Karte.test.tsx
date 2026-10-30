import { render, screen, fireEvent } from '@testing-library/react'
import { MotionConfig } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { Karte } from './Karte'
import type { BuehnenProps, KartenDaten } from './kapitel'

function Attrappe({ lauf, ruhig }: BuehnenProps) {
  return <div data-testid="buehne" data-lauf={String(lauf)} data-ruhig={String(ruhig)} />
}

const KARTE: KartenDaten = {
  id: 'probe',
  stichwort: 'Probe',
  pointe: 'Lauf. Sofort.',
  satz: 'Nicht hinsehen, nicht abwarten.',
  Buehne: Attrappe,
}

/**
 * Die App haengt unter `<MotionConfig reducedMotion="user">` (main.tsx), wo motion die
 * Systemeinstellung aufloest. Im Test wird sie gestellt: motion liest `matchMedia` einmal
 * beim ersten Gebrauch, ein spaeter gesetzter Stub kaeme zu spaet.
 */
function zeige(karte: KartenDaten, bewegung: 'always' | 'never', aktiv = true) {
  return render(
    <MotionConfig reducedMotion={bewegung}>
      <Karte karte={karte} aktiv={aktiv} />
    </MotionConfig>,
  )
}

describe('Karte', () => {
  it('zeigt Pointe und Satz und haelt die Buehne', () => {
    zeige(KARTE, 'never')

    expect(screen.getByText('Lauf. Sofort.')).toBeInTheDocument()
    expect(screen.getByText('Nicht hinsehen, nicht abwarten.')).toBeInTheDocument()
    expect(screen.getByTestId('buehne')).toBeInTheDocument()
  })

  /*
   * Nichts laeuft in Schleife. Wer die Bewegung verpasst hat, muss sie zurueckholen
   * koennen, ohne die Seite neu zu laden — der Zaehler ist das Signal an die Buehne.
   */
  it('startet die Buehne neu, wenn man nochmal tippt', () => {
    zeige(KARTE, 'never')
    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '0')

    fireEvent.click(screen.getByRole('button', { name: 'nochmal' }))

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '1')
  })

  /*
   * Die Regel in styles/index.css ist reines CSS und fasst motion/react nicht an, weil
   * das aus JavaScript animiert. Die Karte muss das selbst tragen.
   */
  it('springt bei reduzierter Bewegung sofort in den Endzustand', () => {
    zeige(KARTE, 'always')

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'true')
  })

  it('bietet bei reduzierter Bewegung kein nochmal an', () => {
    zeige(KARTE, 'always')

    expect(screen.queryByRole('button', { name: 'nochmal' })).not.toBeInTheDocument()
  })

  /*
   * Welche Karte laeuft, entscheidet die Kapitelseite: bei 393x760 stehen bis zu drei
   * gleichzeitig weit genug im Bild. Eine nicht aktive Karte zeigt ihren Endzustand.
   */
  it('laeuft nicht, solange sie nicht an der Reihe ist', () => {
    zeige(KARTE, 'never', false)

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'true')
  })

  it('kommt ohne Satz aus', () => {
    zeige({ ...KARTE, satz: undefined }, 'never')

    expect(screen.getByText('Lauf. Sofort.')).toBeInTheDocument()
  })
})
