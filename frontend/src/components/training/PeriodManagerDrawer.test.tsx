import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PeriodManagerDrawer } from './PeriodManagerDrawer'
import type { TrainingPeriodResponse } from '@/types'

/*
 * Der Ort haengt am Wochentag, nicht an der Periode: im Winter liegt der Montag in der einen
 * Halle und der Donnerstag in der anderen. Im Sommer liegt alles auf demselben Platz — dann
 * soll genau EIN Feld reichen. Beides zusammen ergibt die Regel, die diese Tests halten:
 * leer heisst „wie die Periode", und nur Abweichungen werden gespeichert.
 */
const WINTER: TrainingPeriodResponse = {
  id: 1,
  name: 'Winter 2026/27',
  startDate: '2026-11-01',
  endDate: '2027-03-31',
  weekdays: [1, 4],
  time: null,
  weekdayTimes: { 1: '20:00', 4: '19:00' },
  weekdayLocations: { 1: 'Halle Welheimer Mark' },
  location: 'Platz Düsseldorf',
  cycleWeeks: 1,
  activeWeeksInCycle: [1],
  pcOnlyWeekdays: [],
}

function zeichnen(periods: TrainingPeriodResponse[] = [WINTER]) {
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onCreate = vi.fn().mockResolvedValue(undefined)
  render(
    <PeriodManagerDrawer
      open
      onClose={() => {}}
      periods={periods}
      activePeriodId={null}
      onSelect={() => {}}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={async () => {}}
    />,
  )
  return { onUpdate, onCreate }
}

/** Die Periode zum Bearbeiten aufklappen. */
function bearbeiten() {
  fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
}

describe('Perioden-Editor: Ort je Wochentag', () => {
  it('zeigt je Wochentag ein eigenes Ortsfeld, vorbelegt mit dem gespeicherten Ort', () => {
    zeichnen()
    bearbeiten()

    expect(screen.getByLabelText('Ort am Mo')).toHaveValue('Halle Welheimer Mark')
    // Der Donnerstag hat keinen eigenen Ort — das Feld ist leer.
    expect(screen.getByLabelText('Ort am Do')).toHaveValue('')
  })

  /*
   * Der Platzhalter ist die eigentliche Auskunft: „leer lassen heisst, es gilt der Ort der
   * Periode". Ohne ihn saehe ein leeres Feld aus wie eine fehlende Angabe.
   */
  it('zeigt im leeren Feld den Ort der Periode als Platzhalter', () => {
    zeichnen()
    bearbeiten()
    expect(screen.getByLabelText('Ort am Do')).toHaveAttribute('placeholder', 'Platz Düsseldorf')
  })

  it('speichert nur die Abweichungen — ein geleertes Feld fällt auf die Periode zurück', async () => {
    const { onUpdate } = zeichnen()
    bearbeiten()

    fireEvent.change(screen.getByLabelText('Ort am Do'), { target: { value: 'Sporthalle Nord' } })
    fireEvent.change(screen.getByLabelText('Ort am Mo'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    const [, daten] = onUpdate.mock.calls[0]
    // Nur der Donnerstag weicht noch ab; der Montag ist raus, nicht als Leerstring drin.
    expect(daten.weekdayLocations).toEqual({ 4: 'Sporthalle Nord' })
  })

  /* Ein abgewaehlter Wochentag nimmt seinen Ort mit — sonst bliebe eine Leiche in den Daten. */
  it('vergisst den Ort eines Wochentags, der abgewählt wird', async () => {
    const { onUpdate } = zeichnen()
    bearbeiten()

    fireEvent.click(screen.getByRole('button', { name: 'Mo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    const [, daten] = onUpdate.mock.calls[0]
    expect(daten.weekdayLocations).toEqual({})
    expect(daten.weekdays).toEqual([4])
  })
})
