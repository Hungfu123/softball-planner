import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FreigabeLeiste } from './FreigabeLeiste'
import type { AufstellungsLage } from '@/types'

const seit = '2026-10-31T09:12:00'

describe('FreigabeLeiste', () => {
  it('nennt den Zustand und bietet genau eine Handlung an', () => {
    render(<FreigabeLeiste lage="GESPERRT" freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung umschalten={vi.fn()} />)
    expect(screen.getByText(/Noch nicht für Spieler freigegeben/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Freigeben' })).toBeEnabled()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('gibt mit einem Klick frei, ohne Rückfrage', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    render(<FreigabeLeiste lage="GESPERRT" freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung umschalten={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Freigeben' }))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('zeigt nach der Freigabe, seit wann', () => {
    render(<FreigabeLeiste lage="FREIGEGEBEN" freigegebenSeit={seit} seitdemGeaendert={false} hatAufstellung umschalten={vi.fn()} />)
    expect(screen.getByText(/Für Spieler sichtbar/)).toBeInTheDocument()
    expect(screen.getByText(/09:12/)).toBeInTheDocument()
  })

  it('meldet eine Aenderung nach der Freigabe — ohne zu behaupten, es sei zu', () => {
    render(<FreigabeLeiste lage="FREIGEGEBEN" freigegebenSeit={seit} seitdemGeaendert hatAufstellung umschalten={vi.fn()} />)
    expect(screen.getByText(/Seit der Freigabe geändert/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut freigeben' })).toBeEnabled()
    expect(screen.queryByText(/Noch nicht für Spieler freigegeben/)).not.toBeInTheDocument()
  })

  it('Erneut freigeben ruft umschalten(true)', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    render(<FreigabeLeiste lage="FREIGEGEBEN" freigegebenSeit={seit} seitdemGeaendert hatAufstellung umschalten={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Erneut freigeben' }))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('fragt vor dem Zuruecknehmen nach', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    render(<FreigabeLeiste lage="FREIGEGEBEN" freigegebenSeit={seit} seitdemGeaendert={false} hatAufstellung umschalten={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'zurücknehmen' }))
    expect(fn).not.toHaveBeenCalled()
    expect(screen.getByText(/verschwindet dann wieder aus der Spieler-Ansicht/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Zurücknehmen' }))
    expect(fn).toHaveBeenCalledWith(false)
  })

  it('gibt einen leeren Spieltag nicht frei', () => {
    render(<FreigabeLeiste lage="GESPERRT" freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung={false} umschalten={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Freigeben' })).toBeDisabled()
  })

  const zeige = (lage: AufstellungsLage, hatAufstellung = true, umschalten = vi.fn()) =>
    render(<FreigabeLeiste lage={lage} freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung={hatAufstellung} umschalten={umschalten} />)

  it.each([
    ['GESPERRT ohne Aufstellung', 'GESPERRT', false, 'Noch nichts aufgestellt'],
    ['GESPERRT mit Aufstellung', 'GESPERRT', true, 'Noch nicht für Spieler freigegeben'],
    ['vor 7 Uhr', 'HEUTE_VOR_SIEBEN', true, 'Ab 7 Uhr für alle sichtbar'],
    ['ab 7 Uhr', 'OFFEN_AB_SIEBEN', true, 'Für alle sichtbar · seit 7 Uhr'],
    ['vorbei', 'OFFEN_VERGANGEN', true, 'Für alle sichtbar · Spieltag vorbei'],
  ] as const)('%s zeigt die passende Zeile', (_, lage, hat, erwartet) => {
    zeige(lage, hat)
    expect(screen.getByText(erwartet)).toBeInTheDocument()
  })

  const punktKlasse = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]')!.className

  it('zeigt vor 7 Uhr einen grauen Punkt, keinen amberfarbenen', () => {
    const { container } = zeige('HEUTE_VOR_SIEBEN')
    expect(punktKlasse(container)).toContain('bg-ink-faint')
    expect(punktKlasse(container)).not.toContain('amber')
  })

  it('faerbt den Punkt nach Bedeutung: accent sichtbar, amber handlungsfaehig, grau nichts zu tun', () => {
    expect(punktKlasse(zeige('OFFEN_AB_SIEBEN').container)).toContain('bg-accent')
    expect(punktKlasse(zeige('OFFEN_VERGANGEN').container)).toContain('bg-accent')
    expect(punktKlasse(zeige('GESPERRT', true).container)).toContain('amber')
    expect(punktKlasse(zeige('GESPERRT', false).container)).toContain('bg-ink-faint')
  })

  // Der Rückfrage-Text ("verschwindet dann wieder aus der Spieler-Ansicht") verspricht sonst etwas,
  // was nicht eintritt: in offenen Lagen bleibt die Aufstellung sichtbar. Realistischer Fall ist ein
  // gesetzter Zeitstempel — der Trainer hat am Vortag freigegeben.
  it.each(['OFFEN_AB_SIEBEN', 'OFFEN_VERGANGEN'] as const)('%s bietet auch mit Freigabe-Zeitstempel keinen Knopf an', (lage) => {
    render(<FreigabeLeiste lage={lage} freigegebenSeit={seit} seitdemGeaendert={false} hatAufstellung umschalten={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sperrt "Früher freigeben" vor 7 Uhr ohne Aufstellung', () => {
    zeige('HEUTE_VOR_SIEBEN', false)
    expect(screen.getByRole('button', { name: 'Früher freigeben' })).toBeDisabled()
  })

  it('bietet vor 7 Uhr "Früher freigeben" an, ohne zurücknehmen', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    zeige('HEUTE_VOR_SIEBEN', true, fn)
    expect(screen.queryByRole('button', { name: 'zurücknehmen' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Früher freigeben' }))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('FREIGEGEBEN ohne Änderung: accent-Punkt, nur zurücknehmen', () => {
    const { container } = render(<FreigabeLeiste lage="FREIGEGEBEN" freigegebenSeit={seit} seitdemGeaendert={false} hatAufstellung umschalten={vi.fn()} />)
    expect(punktKlasse(container)).toContain('bg-accent')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('FREIGEGEBEN mit Änderung: amber-Punkt, Erneut freigeben und zurücknehmen', () => {
    const { container } = render(<FreigabeLeiste lage="FREIGEGEBEN" freigegebenSeit={seit} seitdemGeaendert hatAufstellung umschalten={vi.fn()} />)
    expect(punktKlasse(container)).toContain('amber')
    expect(screen.getByRole('button', { name: 'zurücknehmen' })).toBeInTheDocument()
  })

  it('zeigt "seit der Freigabe geändert" nicht in Lagen, in denen ohnehin alle sehen', () => {
    render(<FreigabeLeiste lage="OFFEN_AB_SIEBEN" freigegebenSeit={seit} seitdemGeaendert hatAufstellung umschalten={vi.fn()} />)
    expect(screen.queryByText(/Seit der Freigabe geändert/)).not.toBeInTheDocument()
  })
})
