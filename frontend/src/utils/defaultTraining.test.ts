import { describe, it, expect } from 'vitest'
import { pickDefaultTrainingId, type SelectableTraining } from './defaultTraining'

const trainings: SelectableTraining[] = [
  { id: 1, date: '2026-05-30', cancelled: false },
  { id: 2, date: '2026-06-01', cancelled: false },
  { id: 3, date: '2026-06-04', cancelled: false },
]

describe('pickDefaultTrainingId', () => {
  it("wählt das HEUTIGE Training, wenn heute Training ist (Regression)", () => {
    expect(pickDefaultTrainingId(trainings, '2026-06-01')).toBe(2)
  })

  it('wählt das nächste anstehende, wenn heute kein Training ist', () => {
    expect(pickDefaultTrainingId(trainings, '2026-06-02')).toBe(3)
  })

  it('fällt auf das letzte vergangene zurück, wenn alle in der Vergangenheit', () => {
    expect(pickDefaultTrainingId(trainings, '2026-07-01')).toBe(3)
  })

  it('ignoriert abgesagte Trainings', () => {
    const withCancelled: SelectableTraining[] = [
      { id: 1, date: '2026-06-01', cancelled: true },
      { id: 2, date: '2026-06-04', cancelled: false },
    ]
    expect(pickDefaultTrainingId(withCancelled, '2026-06-01')).toBe(2)
  })

  it('liefert null bei leerer Liste', () => {
    expect(pickDefaultTrainingId([], '2026-06-01')).toBeNull()
  })

  it('ist unabhängig von der Eingabe-Reihenfolge (sortiert intern)', () => {
    const unsorted: SelectableTraining[] = [
      { id: 3, date: '2026-06-04', cancelled: false },
      { id: 1, date: '2026-05-30', cancelled: false },
      { id: 2, date: '2026-06-01', cancelled: false },
    ]
    expect(pickDefaultTrainingId(unsorted, '2026-06-01')).toBe(2)
  })
})
