import { render, screen } from '@testing-library/react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { Karte } from './Karte'
import type { BuehnenProps, KartenDaten } from './kapitel'

function Attrappe({ lauf, ruhig }: BuehnenProps) {
  return <div data-testid="buehne" data-lauf={String(lauf)} data-ruhig={String(ruhig)} />
}

/**
 * Eine Buehne mit echter Bewegung: Anfang r=4, Ende r=11. Die Attrappe oben kann nicht
 * zeigen, WO eine wartende Buehne steht — und genau darum geht es hier.
 */
function Bewegt({ ruhig }: BuehnenProps) {
  return (
    <svg>
      <motion.circle
        data-testid="punkt"
        cx="5" cy="5"
        initial={ruhig ? false : { r: 4 }}
        animate={{ r: 11 }}
        transition={{ duration: ruhig ? 0 : 0.6 }}
      />
    </svg>
  )
}

const BEWEGT: KartenDaten = { id: 'bewegt', stichwort: 'Bewegt', pointe: 'Bewegt', Buehne: Bewegt }

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
   * Welche Karte laeuft, entscheidet die Kapitelseite. **Eine wartende Karte zeigt ihre
   * AUSGANGSSITUATION**, nicht ihr Ergebnis: das Ergebnis als Standbild nimmt der
   * Bewegung die Pointe, und wer dann abspielt, sieht dasselbe Bild zweimal.
   */
  it('steht auf dem Anfang, solange sie nicht an der Reihe ist', () => {
    zeige(BEWEGT, 'never', false)

    expect(screen.getByTestId('punkt')).toHaveAttribute('r', '4')
  })

  /* Und bleibt dort stehen: gewartet heisst nicht langsam abgespielt. */
  it('laeuft im Warten nicht los', async () => {
    zeige(BEWEGT, 'never', false)
    await new Promise(r => setTimeout(r, 120))

    expect(screen.getByTestId('punkt')).toHaveAttribute('r', '4')
  })

  /**
   * **Und zwar auch dort, wo sie wirklich haengt.**
   *
   * Die Kapitelseite blaettert in einer `AnimatePresence mode="wait" initial={false}` —
   * kein Einflug beim Ankommen. Das `initial={false}` gilt aber nicht nur fuer das
   * blaetternde Element, es reicht ueber den PresenceContext in den GANZEN Teilbaum: jede
   * Buehne darin rendert beim Aufbau sofort ihren Zielzustand. Getroffen hat es genau
   * eine Karte, die erste eines Kapitels — die zweite kam spaeter an und war frei. Also
   * stand ausgerechnet die Karte, die man zuerst sieht, auf ihrem Ergebnis, und ▶ tat
   * nichts.
   *
   * Darum schneidet die Karte den PresenceContext ab. Geprueft wird es hier mit
   * derselben Verpackung wie auf der Seite.
   */
  it('steht auch in einer AnimatePresence mit initial={false} auf dem Anfang', () => {
    render(
      <MotionConfig reducedMotion="never">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key="eine">
            <Karte karte={BEWEGT} aktiv={false} lauf={0} />
          </motion.div>
        </AnimatePresence>
      </MotionConfig>,
    )

    expect(screen.getByTestId('punkt')).toHaveAttribute('r', '4')
  })

  /* Bei reduzierter Bewegung gibt es nichts zu warten: dort traegt der Endzustand alles. */
  it('zeigt bei reduzierter Bewegung sofort das Ende, auch wartend', () => {
    zeige(BEWEGT, 'always', false)

    expect(screen.getByTestId('punkt')).toHaveAttribute('r', '11')
  })
})
