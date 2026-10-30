import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from '../kapitel'

/* Die Saetze stehen in kapitel.ts, die Zeichnungen daneben. Geprueft wird das Kapitel. */
const BASE_KARTEN = KAPITEL[2].karten
import { FIRST_BASE, SECOND_BASE, PITCHING_PLATE } from '@/components/playmaker/board/geometry'

describe('Kapitel Auf der Base', () => {
  it('liefert fünf Karten mit genau diesen Pointen', () => {
    expect(BASE_KARTEN.map(k => k.pointe)).toEqual([
      'Die Base ist sicher',
      'Los erst beim Release',
      'Wild Pitch',
      'Steal',
      'Fly gefangen: erst dann los',
    ])
  })

  it('schreibt in keiner Karte einen Gedankenstrich', () => {
    for (const k of BASE_KARTEN) {
      expect(k.pointe).not.toContain('—')
      expect(k.satz ?? '').not.toContain('—')
    }
  })

  /*
   * Kein Leadoff: solange der Ball in der Hand der Pitcherin ist, steht die Läuferin auf
   * der Base. Die Karte führt in drei Ständen durch, und der dritte ist der einzige, in
   * dem sie weg ist.
   */
  it('lässt die Läuferin erst los, wenn der Ball die Hand verlässt', async () => {
    const { Buehne } = BASE_KARTEN[1]
    render(<Buehne lauf={0} ruhig />)

    const x = (testid: string) => parseFloat(screen.getByTestId(testid).getAttribute('cx') ?? '')
    // Der Pitch läuft senkrecht: Pitcherin, Platte und Catcher liegen auf derselben x.
    const y = (testid: string) => parseFloat(screen.getByTestId(testid).getAttribute('cy') ?? '')
    const weiter = () => fireEvent.click(screen.getByRole('button', { name: /Nächster Schritt|Von vorn/ }))

    // Stand 1: Ball in der Hand, Läuferin auf der Base.
    expect(y('ball')).toBeCloseTo(PITCHING_PLATE.y, 1)
    expect(x('laeufer')).toBeCloseTo(FIRST_BASE.x, 1)

    // Stand 2: der Ball ist unterwegs, sie steht immer noch.
    weiter()
    await waitFor(() => expect(y('ball')).not.toBeCloseTo(PITCHING_PLATE.y, 1))
    expect(x('laeufer')).toBeCloseTo(FIRST_BASE.x, 1)

    // Stand 3: jetzt erst ist sie weg.
    weiter()
    await waitFor(() => expect(x('laeufer')).toBeCloseTo(SECOND_BASE.x, 1))
  })

  it('zeigt bei Wild Pitch, dass der Ball am Catcher vorbeigeht', () => {
    const { Buehne } = BASE_KARTEN[2]
    render(<Buehne lauf={0} ruhig />)

    expect(screen.getByTestId('ball-wild')).toBeInTheDocument()
  })

  it.each(BASE_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s im Ruhig-Modus ohne Absturz',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={0} ruhig />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  it.each(BASE_KARTEN.map(k => [k.id, k.Buehne] as const))(
    'zeigt %s auch mit laufender Bewegung',
    (_id, Buehne) => {
      const { container } = render(<Buehne lauf={1} ruhig={false} />)
      expect(container.firstChild).not.toBeNull()
    },
  )

  /* Die Tag-up-Karte ist der Zwilling von "Raus: gefangen" und erklärt sich am Ablauf. */
  it('lässt sich die Tag-up-Karte Schritt für Schritt durchtippen', async () => {
    const { Buehne } = BASE_KARTEN[4]
    render(<Buehne lauf={0} ruhig={false} />)

    fireEvent.click(screen.getByRole('button', { name: /Nächster Schritt/ }))

    await waitFor(() => expect(screen.getByTestId('tagup-schritt')).toHaveTextContent('2'))
  })
})
