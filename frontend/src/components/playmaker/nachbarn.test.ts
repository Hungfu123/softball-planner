import { describe, expect, test } from 'vitest'
import { nachbarn } from './nachbarn'
import type { Play } from './board/types'

function play(id: number, categoryId: number, title = `Play ${id}`): Play {
  return {
    id,
    title,
    categoryId,
    gameState: 'ANY',
    gameStateNote: null,
    counterpartPlayId: null,
    steps: [],
  }
}

/*
 * Im Spielwissen blättert man durch ein Kapitel: „1 von 8", vor, zurück, am Ende
 * „Fertig". Defense bekommt dasselbe, und das Kapitel ist hier die Kategorie — nicht
 * die ganze Liste mit einundfünfzig Plays, in der kein Weg ein Ende hat.
 */
describe('nachbarn', () => {
  const liste = [play(1, 10), play(2, 10), play(3, 10), play(4, 20)]

  test('zählt innerhalb der Kategorie, nicht über die ganze Liste', () => {
    expect(nachbarn(liste, play(2, 10))).toMatchObject({ nummer: 2, anzahl: 3 })
    expect(nachbarn(liste, play(4, 20))).toMatchObject({ nummer: 1, anzahl: 1 })
  })

  test('nennt Vorgänger und Nachfolger', () => {
    const mitte = nachbarn(liste, play(2, 10))

    expect(mitte.vorheriges?.id).toBe(1)
    expect(mitte.naechstes?.id).toBe(3)
  })

  test('hat am Anfang keinen Vorgänger und am Ende keinen Nachfolger', () => {
    expect(nachbarn(liste, play(1, 10)).vorheriges).toBeNull()
    expect(nachbarn(liste, play(3, 10)).naechstes).toBeNull()
  })

  /* Ohne geladene Liste — kein Netz, direkt aufgerufener Link — blättert nichts. */
  test('bleibt still, wenn die Liste das Play nicht kennt', () => {
    expect(nachbarn([], play(1, 10))).toEqual({
      vorheriges: null, naechstes: null, nummer: 0, anzahl: 0,
    })
  })
})

/*
 * Ein Kapitel ist eine Lektion, und eine Lektion hat eine Reihenfolge.
 *
 * Nach id allein stand die Regel „Wohin der Wurf geht" als dreizehnte von vierzehn, weil
 * neue Plays die hoechste id bekommen — und das Detail („Backup hinter der 2") als
 * erste. Fuer eine Hobbymannschaft, die Situationen ueberhaupt erst lernt, ist das genau
 * verkehrt herum. `sortOrder` setzt einzelne Plays nach vorne; wer keins hat, behaelt
 * seinen Platz nach id dahinter.
 */
describe('Reihenfolge im Kapitel', () => {
  const p = (id: number, sortOrder?: number) =>
    ({ id, title: `P${id}`, categoryId: 1, gameState: 'ANY', gameStateNote: null,
       counterpartPlayId: null, steps: [], sortOrder } as unknown as Play)

  test('stellt Plays mit Reihenfolge vor die ohne', () => {
    const liste = [p(7), p(8), p(784, 10), p(785, 20)]

    expect(nachbarn(liste, p(784, 10)).nummer).toBe(1)
    expect(nachbarn(liste, p(785, 20)).nummer).toBe(2)
    expect(nachbarn(liste, p(7)).nummer).toBe(3)
  })
})
