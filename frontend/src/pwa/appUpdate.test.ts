import { describe, expect, it } from 'vitest'
import { darfNeuLaden, schreibtGeradeMit } from './appUpdate'

describe('appUpdate', () => {
  it('lädt neu, wenn die App in den Vordergrund kommt', () => {
    expect(darfNeuLaden('/', true)).toBe(true)
    expect(darfNeuLaden('/spielbetrieb', true)).toBe(true)
    expect(darfNeuLaden('/gameday/4', true)).toBe(true)
  })

  it('lädt nicht neu, solange die App im Hintergrund ist', () => {
    // Sonst springt die Seite, während jemand hinsieht — der ganze Sinn ist ja, dass
    // es wie ein normaler Start der App aussieht.
    expect(darfNeuLaden('/', false)).toBe(false)
  })

  it('lädt nie neu, während ein Spiel mitgeschrieben wird', () => {
    // Der teuerste denkbare Zeitpunkt: der Stand der laufenden Begegnung steckt in der Seite.
    expect(darfNeuLaden('/gameday/4/scoring/0', true)).toBe(false)
    expect(darfNeuLaden('/spielbogen/12', true)).toBe(false)
    expect(darfNeuLaden('/spielbogen/new', true)).toBe(false)
  })

  it('zählt die Spielbogen-Liste nicht als Mitschreiben', () => {
    // Dort wird nur ausgewählt; ein Neuladen kostet dort niemanden etwas.
    expect(schreibtGeradeMit('/spielbogen')).toBe(false)
    expect(darfNeuLaden('/spielbogen', true)).toBe(true)
  })

  it('verwechselt ähnliche Pfade nicht mit dem Scoring', () => {
    expect(schreibtGeradeMit('/gameday/4')).toBe(false)
    expect(schreibtGeradeMit('/gameday/4/export')).toBe(false)
    expect(schreibtGeradeMit('/spielbogen/neu')).toBe(false)
  })
})
