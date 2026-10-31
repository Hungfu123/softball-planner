import { render, screen } from '@testing-library/react'
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
 *
 * **Pointe, Satz und „nochmal" stehen nicht mehr hier**, sondern auf der Kapitelseite —
 * sie fuellt den Bildschirm wie ein Play, und der Knopf sitzt unten am Rand. Geprueft
 * werden sie in `KapitelSeite.test.tsx`.
 */
function zeige(karte: KartenDaten, bewegung: 'always' | 'never', aktiv = true, lauf = 0) {
  return render(
    <MotionConfig reducedMotion={bewegung}>
      <Karte karte={karte} aktiv={aktiv} lauf={lauf} />
    </MotionConfig>,
  )
}

describe('Karte', () => {
  it('haelt die Buehne', () => {
    zeige(KARTE, 'never')

    expect(screen.getByTestId('buehne')).toBeInTheDocument()
  })

  /*
   * Nichts laeuft in Schleife. Wer die Bewegung verpasst hat, muss sie zurueckholen
   * koennen, ohne die Seite neu zu laden — der Zaehler ist das Signal an die Buehne, und
   * er kommt von aussen, weil „nochmal" unten am Bildschirmrand steht.
   */
  it('reicht den Zaehler an die Buehne durch', () => {
    const { rerender } = zeige(KARTE, 'never')
    expect(screen.getByTestId('buehne')).toHaveAttribute('data-lauf', '0')

    rerender(
      <MotionConfig reducedMotion="never">
        <Karte karte={KARTE} aktiv lauf={1} />
      </MotionConfig>,
    )

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

  /*
   * Welche Karte laeuft, entscheidet die Kapitelseite. Eine nicht aktive Karte zeigt
   * ihren Endzustand.
   */
  it('laeuft nicht, solange sie nicht an der Reihe ist', () => {
    zeige(KARTE, 'never', false)

    expect(screen.getByTestId('buehne')).toHaveAttribute('data-ruhig', 'true')
  })
})
