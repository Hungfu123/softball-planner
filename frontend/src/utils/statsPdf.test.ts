import { describe, it, expect } from 'vitest'
import { TABLE_WIDTH, PAGE_CONTENT_WIDTH } from './statsPdf'

describe('statsPdf — Tabellenbreite', () => {
  // Regressionsschutz: die Spaltenbreiten und die Laenge der Trennlinien waren einmal zwei
  // unabhaengige Zahlen. Die Linien wurden bis zum Seitenrand gezogen und ragten sichtbar
  // ueber die schmalere Tabelle hinaus. Beide leiten sich jetzt aus COL_WIDTHS ab — dieser
  // Test faengt den Fall, dass eine neue Statistikspalte die Tabelle ueber die Seite schiebt.
  it('passt in die Seitenbreite', () => {
    expect(TABLE_WIDTH).toBeLessThanOrEqual(PAGE_CONTENT_WIDTH)
  })

  it('nutzt die Seitenbreite auch aus — keine halbleere Zeile', () => {
    expect(TABLE_WIDTH).toBeGreaterThan(PAGE_CONTENT_WIDTH * 0.9)
  })
})
