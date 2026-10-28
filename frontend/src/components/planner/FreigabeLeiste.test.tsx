import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FreigabeLeiste } from './FreigabeLeiste'

const seit = '2026-10-31T09:12:00'

describe('FreigabeLeiste', () => {
  it('nennt den Zustand und bietet genau eine Handlung an', () => {
    render(<FreigabeLeiste freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung umschalten={vi.fn()} />)
    expect(screen.getByText(/Noch nicht für Spieler freigegeben/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Freigeben' })).toBeEnabled()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('gibt mit einem Klick frei, ohne Rückfrage', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    render(<FreigabeLeiste freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung umschalten={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Freigeben' }))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('zeigt nach der Freigabe, seit wann', () => {
    render(<FreigabeLeiste freigegebenSeit={seit} seitdemGeaendert={false} hatAufstellung umschalten={vi.fn()} />)
    expect(screen.getByText(/Für Spieler freigegeben/)).toBeInTheDocument()
    expect(screen.getByText(/09:12/)).toBeInTheDocument()
  })

  it('meldet eine Aenderung nach der Freigabe — ohne zu behaupten, es sei zu', () => {
    render(<FreigabeLeiste freigegebenSeit={seit} seitdemGeaendert hatAufstellung umschalten={vi.fn()} />)
    expect(screen.getByText(/Seit der Freigabe geändert/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut freigeben' })).toBeEnabled()
    expect(screen.queryByText(/Noch nicht für Spieler freigegeben/)).not.toBeInTheDocument()
  })

  it('Erneut freigeben ruft umschalten(true)', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    render(<FreigabeLeiste freigegebenSeit={seit} seitdemGeaendert hatAufstellung umschalten={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Erneut freigeben' }))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('fragt vor dem Zuruecknehmen nach', () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    render(<FreigabeLeiste freigegebenSeit={seit} seitdemGeaendert={false} hatAufstellung umschalten={fn} />)
    fireEvent.click(screen.getByRole('button', { name: 'zurücknehmen' }))
    expect(fn).not.toHaveBeenCalled()
    expect(screen.getByText(/verschwindet dann wieder aus der Spieler-Ansicht/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Zurücknehmen' }))
    expect(fn).toHaveBeenCalledWith(false)
  })

  it('gibt einen leeren Spieltag nicht frei', () => {
    render(<FreigabeLeiste freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung={false} umschalten={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Freigeben' })).toBeDisabled()
  })
})
