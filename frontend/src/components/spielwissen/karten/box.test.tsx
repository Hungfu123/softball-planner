import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from '../kapitel'
import { HOME, FIRST_BASE } from '@/components/playmaker/board/geometry'

/* Die Saetze stehen in kapitel.ts, die Zeichnungen daneben. Geprueft wird das Kapitel. */
const BOX_KARTEN = KAPITEL[0].karten

describe('Kapitel In der Box', () => {
  it('liefert acht Karten mit genau diesen Pointen', () => {
    expect(BOX_KARTEN.map(k => k.pointe)).toEqual([
      'Die Zone bist du',
      'Drin ist Strike',
      'Auch Strike',
      'Der Count ist ein Wettlauf',
      'Dritter Strike am Boden',
      'Ein Fuß bleibt drin',
      'Wofür ein Bunt gut ist',
      'Die Bunt-Falle',
    ])
  })

  /* Vorgabe des Betreibers: keine Gedankenstriche in sichtbarem Text. */
  it('schreibt in keiner Karte einen Gedankenstrich', () => {
    for (const k of BOX_KARTEN) {
      expect(k.pointe).not.toContain('—')
      expect(k.satz ?? '').not.toContain('—')
    }
  })

  /*
   * Der ganze Punkt der ersten Karte: die Zone klebt nicht am Boden, sondern am
   * Menschen. Waechst die Figur, waechst die Zone mit.
   */
  it('lässt die Zone mit der Figur wachsen', async () => {
    const { Buehne } = BOX_KARTEN[0]
    render(<Buehne lauf={0} ruhig={false} />)

    // motion schreibt das Attribut mit Einheit ("44px"), deshalb parseFloat.
    const hoehe = () => parseFloat(screen.getByTestId('zone').getAttribute('height') ?? '')
    const klein = hoehe()
    expect(klein).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Groß' }))

    // motion schreibt das Attribut ueber Frames, nicht im selben Tick.
    await waitFor(() => expect(hoehe()).toBeGreaterThan(klein))
  })

  /*
   * Regel 5.1.46 des Regelwerks 2026 bis 2029: der nicht gefangene dritte Strike macht
   * den Schlagmann nur dann zum Laeufer, wenn die erste Base frei ist (oder zwei Aus
   * vorliegen). Steht dort jemand, ist er aus. Genau diese Bedingung ist die Karte, und
   * sie muss in beide Richtungen schalten.
   */
  it('lässt beim dritten Strike am Boden nur laufen, wenn die 1 frei ist', async () => {
    const { Buehne } = BOX_KARTEN[4]
    render(<Buehne lauf={0} ruhig />)

    const laeufer = () => parseFloat(screen.getByTestId('dts-laeufer').getAttribute('cx') ?? '')

    fireEvent.click(screen.getByRole('button', { name: 'Die 1 ist frei' }))
    await waitFor(() => expect(laeufer()).toBeCloseTo(FIRST_BASE.x, 1))

    fireEvent.click(screen.getByRole('button', { name: 'Die 1 ist besetzt' }))
    await waitFor(() => expect(laeufer()).toBeCloseTo(HOME.x, 1))
  })

  /*
   * Regel 5.4.2 e): zwischen den Pitches muss MINDESTENS EIN Fuss vollstaendig in der Box
   * bleiben. Einer darf also raus, beide nicht. Der Unterschied ist die ganze Karte, und
   * er ist messbar: am zweiten Stand liegt genau ein Abdruck links der Box, am dritten
   * liegen beide dort.
   */
  it('lässt einen Fuß raus und erst beim zweiten Strike werden', async () => {
    const { Buehne } = BOX_KARTEN[5]
    render(<Buehne lauf={0} ruhig />)

    const links = () => parseFloat(screen.getByTestId('box').getAttribute('x') ?? '')
    const fuss = (id: string) => parseFloat(screen.getByTestId(id).getAttribute('x') ?? '')
    const draussen = () => [fuss('fuss-vorne'), fuss('fuss-hinten')].filter(x => x < links()).length
    const weiter = () => fireEvent.click(screen.getByRole('button', { name: /Nächster Schritt|Von vorn/ }))

    expect(draussen()).toBe(0)

    weiter()
    await waitFor(() => expect(draussen()).toBe(1))
    expect(screen.queryByText('Strike')).not.toBeInTheDocument()

    weiter()
    await waitFor(() => expect(draussen()).toBe(2))
    expect(screen.getByText('Strike')).toBeInTheDocument()
  })

  /*
   * Bei abgeschalteter Bewegung laeuft keine Sequenz. Jede Buehne muss trotzdem etwas
   * zeigen, und zwar ihren Endzustand: das Bild traegt die Auskunft.
   */
  it.each(BOX_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s im Ruhig-Modus ohne Absturz',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={0} ruhig />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  it.each(BOX_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s auch mit laufender Bewegung',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={1} ruhig={false} />)
      expect(container.firstChild).not.toBeNull()
    },
  )
})
