import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from '../kapitel'

/* Die Saetze stehen in kapitel.ts, die Zeichnungen daneben. Geprueft wird das Kapitel. */
const BASE_KARTEN = KAPITEL[2].karten
import { FIRST_BASE, SECOND_BASE, PITCHING_PLATE } from '@/components/playmaker/board/geometry'

describe('Kapitel Auf der Base', () => {
  it('liefert sechs Karten mit genau diesen Pointen', () => {
    expect(BASE_KARTEN.map(k => k.pointe)).toEqual([
      'Auf der Base bist du safe',
      'Hinter dir rückt einer nach',
      'Los, wenn der Fuß landet',
      'Wild Pitch',
      'Steal',
      'Fly gefangen: erst dann los',
    ])
  })

  /*
   * Der Force. „Die Base ist sicher" nannte die Ausnahme in ihrem Satz, zeigte sie aber
   * nicht — und sie ist der haeufigste Grund, aus dem ein Anfaenger out geht: er bleibt
   * stehen, obwohl der Schlagmann hinter ihm auf dieselbe Base laeuft.
   */
  it('zeigt beim Force, dass zurück nicht geht und die Läuferin vorrückt', async () => {
    const { Buehne } = BASE_KARTEN[1]
    render(<Buehne lauf={0} ruhig />)

    expect(screen.getByTestId('kein-zurueck')).toBeInTheDocument()
    await waitFor(() => {
      const laeufer = screen.getByTestId('force-laeufer')
      expect(parseFloat(laeufer.getAttribute('cy') ?? '')).toBeCloseTo(SECOND_BASE.y, 0)
    })
    expect(parseFloat(screen.getByTestId('force-batter').getAttribute('cx') ?? ''))
      .toBeCloseTo(FIRST_BASE.x, 0)
  })

  it('schreibt in keiner Karte einen Gedankenstrich', () => {
    for (const k of BASE_KARTEN) {
      expect(k.pointe).not.toContain('—')
      expect(k.satz ?? '').not.toContain('—')
    }
  })

  /*
   * Kein Leadoff. Der Auslöser ist seit dem Regelwerk 2026 bis 2029 NICHT das Release,
   * sondern der Schrittfuß: Regel 5.10.3 b.ii) verlangt Kontakt zum Base, "bis der
   * Schrittfuß des Pitchers während seiner Pitch-Bewegung den Boden berührt". Deshalb
   * ist der Abdruck der Marker, an dem die Karte hängt, und nicht die Ballposition.
   * Dass sie erst danach losläuft, ist die Pointe.
   */
  it('lässt die Läuferin erst los, wenn der Schrittfuß aufsetzt', async () => {
    const { Buehne } = BASE_KARTEN[2]
    render(<Buehne lauf={0} ruhig />)

    const x = (testid: string) => parseFloat(screen.getByTestId(testid).getAttribute('cx') ?? '')
    // Der Pitch läuft senkrecht: Pitcherin, Platte und Catcher liegen auf derselben x.
    const y = (testid: string) => parseFloat(screen.getByTestId(testid).getAttribute('cy') ?? '')
    const weiter = () => fireEvent.click(screen.getByRole('button', { name: /Nächster Schritt|Von vorn/ }))

    // Stand 1: Ball in der Hand, Pitcherin noch hinten, Läuferin auf der Base.
    expect(y('ball')).toBeCloseTo(PITCHING_PLATE.y, 1)
    expect(screen.getByTestId('pitcher')).toHaveAttribute('data-schritt', 'hinten')
    expect(x('laeufer')).toBeCloseTo(FIRST_BASE.x, 1)

    // Stand 2: der Schritt ist gemacht, sie darf, steht aber noch.
    weiter()
    await waitFor(() => expect(screen.getByTestId('pitcher')).toHaveAttribute('data-schritt', 'vorne'))
    expect(x('laeufer')).toBeCloseTo(FIRST_BASE.x, 1)

    // Stand 3: jetzt erst ist sie weg.
    weiter()
    await waitFor(() => expect(x('laeufer')).toBeCloseTo(SECOND_BASE.x, 1))
  })

  it('zeigt bei Wild Pitch, dass der Ball am Catcher vorbeigeht', () => {
    const { Buehne } = BASE_KARTEN[3]
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
    const { Buehne } = BASE_KARTEN[5]
    render(<Buehne lauf={0} ruhig={false} />)

    fireEvent.click(screen.getByRole('button', { name: /Nächster Schritt/ }))

    await waitFor(() => expect(screen.getByTestId('tagup-schritt')).toHaveTextContent('2'))
  })
})
