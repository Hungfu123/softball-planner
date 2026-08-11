import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GameClockReadout, GameClockRule } from './GameClock'

describe('GameClockReadout', () => {
  it('rendert nichts, wenn die Uhr nie gestartet wurde und es keinen Handler gibt (kein toter Affordance-Text)', () => {
    const { container } = render(<GameClockReadout elapsedSeconds={0} limitMinutes={null} running={false} started={false} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Zeit')).not.toBeInTheDocument()
  })

  it('zeigt die blasse "Zeit"-Affordance nur, wenn ein Handler existiert', () => {
    render(<GameClockReadout elapsedSeconds={0} limitMinutes={null} running={false} started={false} onPress={() => {}} />)
    const affordance = screen.getByRole('button', { name: 'Spielzeit starten' })
    expect(affordance).toHaveTextContent('Zeit')
    expect(affordance.className).toContain('text-white/45')
  })

  it('zeigt bei laufender Uhr Label + MM:SS', () => {
    render(<GameClockReadout elapsedSeconds={37 * 60 + 12} limitMinutes={90} running started />)
    expect(screen.getByText('Zeit')).toBeInTheDocument()
    expect(screen.getByText('37:12')).toBeInTheDocument()
  })

  it('zeigt bei Pause das amber "Pause"-Label und dimmt die Zahl', () => {
    render(<GameClockReadout elapsedSeconds={37 * 60 + 12} limitMinutes={90} running={false} started />)
    const label = screen.getByText('Pause')
    expect(label.className).toContain('text-amber-400')
    const value = screen.getByText('37:12')
    expect(value.className).toContain('text-white/55')
  })

  it('zeigt bei Limitüberschreitung die Überschreitung als Label, zählt aber weiter hoch', () => {
    render(<GameClockReadout elapsedSeconds={93 * 60 + 20} limitMinutes={90} running started />)
    expect(screen.getByText('+3:20')).toBeInTheDocument()
    expect(screen.getByText('93:20')).toBeInTheDocument()
  })

  it('zeigt die geschätzte Gesamtdauer inline neben der verstrichenen Zeit, wenn übergeben', () => {
    render(<GameClockReadout elapsedSeconds={37 * 60 + 12} limitMinutes={null} running started estimatedTotalMinutes={95} />)
    expect(screen.getByText('≈ 1:35')).toBeInTheDocument()
  })

  it('zeigt keine Schätzung, wenn estimatedTotalMinutes fehlt (undefined)', () => {
    render(<GameClockReadout elapsedSeconds={37 * 60 + 12} limitMinutes={null} running started />)
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument()
  })

  it('zeigt keine Schätzung, wenn estimatedTotalMinutes explizit null ist', () => {
    render(<GameClockReadout elapsedSeconds={37 * 60 + 12} limitMinutes={null} running started estimatedTotalMinutes={null} />)
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument()
  })

  // Regression: eine nie gestartete Uhr bleibt exakt wie bisher, auch wenn (unerwartet)
  // eine estimatedTotalMinutes-Prop übergeben würde — die Backend-Gates garantieren das zwar
  // schon, aber die Komponente selbst darf sich nicht darauf verlassen.
  it('rendert bei nie gestarteter Uhr trotz estimatedTotalMinutes weiterhin nichts', () => {
    const { container } = render(
      <GameClockReadout elapsedSeconds={0} limitMinutes={null} running={false} started={false} estimatedTotalMinutes={95} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('ruft onPress beim Klick auf, wenn übergeben', async () => {
    let pressed = false
    render(<GameClockReadout elapsedSeconds={0} limitMinutes={null} running={false} started={false} onPress={() => { pressed = true }} />)
    screen.getByRole('button', { name: 'Spielzeit starten' }).click()
    expect(pressed).toBe(true)
  })

  it('rendert ohne onPress keinen interaktiven Button (kein toter Button ohne Handler)', () => {
    render(<GameClockReadout elapsedSeconds={0} limitMinutes={null} running={false} started={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('GameClockRule', () => {
  it('bleibt bei nie gestarteter Uhr exakt wie heute — solid red, keine Füllung', () => {
    const { container } = render(<GameClockRule elapsedSeconds={0} limitMinutes={null} running={false} started={false} />)
    const rule = container.firstElementChild as HTMLElement
    expect(rule.className).toBe('h-[3px] bg-softball-red-600')
  })

  it('bleibt auch mit Handler unverändert, solange die Uhr nicht gestartet ist (Affordance betrifft nur den Readout)', () => {
    const { container } = render(<GameClockRule elapsedSeconds={0} limitMinutes={null} running={false} started={false} />)
    const withoutHandler = (container.firstElementChild as HTMLElement).outerHTML

    const { container: container2 } = render(<GameClockRule elapsedSeconds={0} limitMinutes={null} running={false} started={false} onPress={() => {}} />)
    const withHandler = (container2.firstElementChild as HTMLElement).outerHTML

    expect(withHandler).toBe(withoutHandler)
  })

  it('füllt proportional zu elapsed/limit, wenn ein Limit gesetzt ist', () => {
    const { container } = render(<GameClockRule elapsedSeconds={90 * 60 * 0.41} limitMinutes={90} running started />)
    const fill = container.querySelector('.bg-amber-400') as HTMLElement
    expect(fill).toBeTruthy()
    expect(fill.style.width).toBe('41%')
  })

  it('zeigt ohne Limit keine Füllung (reine Stoppuhr)', () => {
    const { container } = render(<GameClockRule elapsedSeconds={600} limitMinutes={null} running started />)
    expect(container.querySelector('.bg-amber-400')).toBeNull()
  })

  it('dimmt die Füllung bei Pause', () => {
    const { container } = render(<GameClockRule elapsedSeconds={2000} limitMinutes={90} running={false} started />)
    const fill = container.querySelector('.bg-amber-400') as HTMLElement
    expect(fill.className).toContain('opacity-45')
  })

  it('wird bei Limitüberschreitung vollständig amber', () => {
    const { container } = render(<GameClockRule elapsedSeconds={93 * 60 + 20} limitMinutes={90} running started />)
    const rule = container.firstElementChild as HTMLElement
    expect(rule.className).toContain('bg-amber-500')
    expect(container.querySelector('.bg-amber-400')).toBeNull()
  })
})
