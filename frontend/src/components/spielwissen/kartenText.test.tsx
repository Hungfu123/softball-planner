import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KAPITEL } from './kapitel'

/**
 * **Die Buehne erzaehlt, die Seite beschriftet.**
 *
 * Als die Karte noch ein Kasten auf einer langen Seite war, trug sie ihre Saetze selbst.
 * Seit Pointe und Satz unter der Buehne stehen (wie die Notiz unter einem Play), stand
 * beides da — und sagte zweimal dasselbe: „Der Ball hat den Boden nie beruehrt" ueber
 * „Ball aus der Luft gefangen, bevor er den Boden beruehrt". Drei bis fuenf Zeilen Text
 * unter einer Zeichnung, von denen die Haelfte schon oben stand.
 *
 * Deshalb: **nur eine selbstgesteuerte Karte traegt Text in der Buehne** — dort ist es
 * die Zeile zum Stand, an dem man gerade steht, und die kann die Seite nicht kennen.
 * Alles andere, was einen Satz wert ist, gehoert in den `satz` des Kapitels.
 *
 * Beschriftung IM Bild (FAIR, STRIKE, Positionskuerzel) ist kein Text in diesem Sinn:
 * sie steht an dem Ding, das sie meint, und wandert mit ihm.
 */
describe('Text in den Bühnen', () => {
  const karten = KAPITEL.flatMap(k => k.karten.map(karte => ({ kapitel: k.id, karte })))

  it.each(karten.filter(x => !x.karte.selbstgesteuert))(
    'Karte $kapitel/$karte.id spricht durch die Zeichnung, nicht durch Absätze',
    ({ karte }) => {
      const { container, unmount } = render(<karte.Buehne lauf={0} ruhig />)
      const absaetze = [...container.querySelectorAll('p')].map(p => p.textContent?.trim()).filter(Boolean)
      unmount()

      expect(absaetze).toEqual([])
    },
  )

  /* Und der Satz der Seite bleibt ein Satz: er ersetzt die Zeilen, er sammelt sie nicht. */
  it.each(karten)('Satz von $kapitel/$karte.id bleibt kurz', ({ karte }) => {
    expect((karte.satz ?? '').length).toBeLessThanOrEqual(120)
  })

  /*
   * Wer eigene Knoepfe mitbringt, ist selbstgesteuert — und bekommt das „nochmal" der
   * Seite NICHT. Sonst stehen zwei Wege zum selben Ziel nebeneinander, und einer davon
   * tut nichts: die Count-Karte ignoriert den Zaehler der Seite, sie hat ihren eigenen.
   *
   * Die Regel prueft sich selbst, statt in einer Liste gepflegt zu werden: gerendert wird
   * jede Buehne, gesucht wird nach Knoepfen.
   */
  it.each(karten)('Karte $kapitel/$karte.id: eigene Knöpfe heißen selbstgesteuert', ({ karte }) => {
    const { container, unmount } = render(<karte.Buehne lauf={0} ruhig />)
    const eigene = container.querySelectorAll('button').length
    unmount()

    expect(eigene > 0).toBe(Boolean(karte.selbstgesteuert))
  })
})
