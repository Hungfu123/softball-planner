import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PlayerBattingStatsResponse } from '@/types'

const COLOR_NAVY: [number, number, number] = [30, 41, 59]
const COLOR_NAVY_SOFT: [number, number, number] = [71, 85, 105]
const COLOR_RED: [number, number, number] = [200, 46, 46]
const COLOR_CREAM_TINT: [number, number, number] = [250, 246, 235]
const COLOR_GRAY_LINE: [number, number, number] = [220, 215, 200]
const COLOR_GRAY_TEXT: [number, number, number] = [120, 120, 120]
const COLOR_GRAY_MUTED: [number, number, number] = [160, 160, 160]

function formatDec(val: number): string {
  return val.toFixed(3).replace(/^0\./, '.')
}

function formatPct(val: number): string {
  return `${Math.round(val * 100)}%`
}

function formatTimestamp(): string {
  return new Date().toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function safeFilename(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p))
    .map(s => s.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter(Boolean)
    .join('_')
}

function drawPageHeader(
  doc: jsPDF,
  title: string,
  contextLabel: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  // Eyebrow: tiny uppercase brand tag above title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_RED)
  doc.setCharSpace(0.8)
  doc.text('DEAD SOX · STATISTIK', margin, 14)
  doc.setCharSpace(0)

  // Titel: keine Sperrung. Gesperrte Grossbuchstaben in 22pt waren der Grund, warum die
  // Ueberschrift schwer lesbar war — Sperrung hilft nur bei kleinen Labels, nicht bei Fliesstext
  // oder Titeln.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COLOR_NAVY)
  doc.text(title.toUpperCase(), margin, 23)

  // Thin red rule below title — short, sharp accent
  doc.setDrawColor(...COLOR_RED)
  doc.setLineWidth(0.8)
  doc.line(margin, 26, margin + 22, 26)

  // Zeitstempel zuerst zeichnen und seine Breite messen — der Untertitel bekommt nur den Rest.
  // Vorher liefen beide unbegrenzt aufeinander zu und ueberlappten bei langen Filtern.
  const stamp = `Stand: ${formatTimestamp()}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_GRAY_TEXT)
  doc.text(stamp, pageWidth - margin, 32, { align: 'right' })
  const stampWidth = doc.getTextWidth(stamp)

  // Untertitel: nur contextLabel. Das scopeLabel stand vorher davor und verdoppelte sich
  // ("JAHR · Jahr 2026", "SPIELTAG · Spieltag · …") — das Scope-Wort steckt schon im Kontext.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_NAVY_SOFT)
  const subtitleWidth = pageWidth - 2 * margin - stampWidth - 6
  const subtitleLines = doc.splitTextToSize(contextLabel, subtitleWidth).slice(0, 2)
  doc.text(subtitleLines, margin, 32)

  return 32 + subtitleLines.length * 4.2 + 3
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  doc.setDrawColor(...COLOR_GRAY_LINE)
  doc.setLineWidth(0.2)
  doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_NAVY)
  doc.setCharSpace(1.5)
  doc.text('DEAD SOX', margin, pageHeight - 6)
  doc.setCharSpace(0)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_GRAY_TEXT)
  doc.text(`Seite ${pageNumber} / ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' })
}

function applyFootersToAllPages(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooter(doc, i, total)
  }
}

function drawHeroBlock(
  doc: jsPDF,
  startY: number,
  eyebrow: string,
  primary: string,
  valueLabel: string,
  value: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const boxX = margin
  const boxY = startY
  const boxW = pageWidth - 2 * margin
  const boxH = 16

  // Background block — deep navy
  doc.setFillColor(...COLOR_NAVY)
  doc.rect(boxX, boxY, boxW, boxH, 'F')

  // Red accent strip on the left edge — sharp 10% accent
  doc.setFillColor(...COLOR_RED)
  doc.rect(boxX, boxY, 2.4, boxH, 'F')

  // Eyebrow — kurz halten. Hier stand vorher der komplette Filtertext ("TOP HITTER · JAHR ·
  // JAHR 2026 · 5 SAISONS: …"), gesperrt und ohne Breitenbegrenzung: er lief aus dem Kasten
  // heraus und wurde am Seitenrand abgeschnitten. Der Filter steht schon im Untertitel.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 220, 220)
  doc.setCharSpace(0.8)
  doc.text(eyebrow.toUpperCase(), boxX + 6, boxY + 6)
  doc.setCharSpace(0)

  // Primary name — white. Breite begrenzt auf den Platz links vom Wert.
  const valueFontSize = 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(valueFontSize)
  const valueWidth = doc.getTextWidth(value)

  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  const nameMax = boxW - 12 - valueWidth - 8
  const nameLine = doc.splitTextToSize(primary, nameMax)[0] ?? primary
  doc.text(nameLine, boxX + 6, boxY + 12.5)

  // Value — right side, red
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(valueFontSize)
  doc.setTextColor(...COLOR_RED)
  doc.text(value, boxX + boxW - 6, boxY + 11.5, { align: 'right' })

  // Tiny value label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(255, 220, 220)
  doc.setCharSpace(0.8)
  doc.text(valueLabel.toUpperCase(), boxX + boxW - 6, boxY + 14.6, { align: 'right' })
  doc.setCharSpace(0)

  return boxY + boxH + 5
}

/**
 * Spaltenbreiten in mm, in Spaltenreihenfolge. Einzige Quelle: daraus entstehen sowohl die
 * `columnStyles` als auch `TABLE_WIDTH`. Vorher waren Breiten und Linienlaenge zwei unabhaengige
 * Zahlen — die Trennlinien wurden bis zum Seitenrand gezogen und ragten sichtbar ueber die
 * schmalere Tabelle hinaus.
 *
 * Summe: 180.5 mm bei A4-Portrait mit 14 mm Rand (182 mm verfuegbar).
 */
const COL_WIDTHS = [
  7,    // #
  30,   // Spieler
  7.5,  // PA
  7.5,  // AB
  7,    // H
  9.5,  // AVG
  6.8,  // 1B
  6.8,  // 2B
  6.8,  // 3B
  6.8,  // HR
  6.8,  // R
  6.8,  // BB
  8,    // HBP
  6.8,  // K
  6.8,  // SB
  6.8,  // CS
  6.8,  // PO
  8,    // RBI
  9,    // OBP
  9.5,  // SLG
  9.5,  // OPS
] as const

export const TABLE_WIDTH = COL_WIDTHS.reduce((sum, w) => sum + w, 0)

/** A4-Portrait-Breite minus beider Raender — exportiert, damit ein Test die Grenze prueft. */
export const PAGE_CONTENT_WIDTH = 210 - 2 * 14

/** Rechtsbuendige Zahlenspalte in Courier — alle Statistikspalten ausser # und Spieler. */
function numericColumn(width: number, bold = false) {
  return {
    cellWidth: width,
    halign: 'right' as const,
    font: 'courier',
    ...(bold ? { fontStyle: 'bold' as const } : {}),
  }
}

function buildColumnStyles() {
  const styles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: COL_WIDTHS[0], halign: 'right', textColor: COLOR_GRAY_MUTED, font: 'courier' },
    // Namen ellipsieren statt ueberlaufen zu lassen — ein langer Name darf nicht in die
    // Zahlenspalten bluten.
    1: { cellWidth: COL_WIDTHS[1], fontStyle: 'bold', overflow: 'ellipsize' },
  }
  const boldColumns = new Set([5, 20]) // AVG, OPS
  for (let i = 2; i < COL_WIDTHS.length; i++) {
    styles[i] = numericColumn(COL_WIDTHS[i], boldColumns.has(i))
  }
  return styles
}

export interface BattingStatsPdfOptions {
  stats: PlayerBattingStatsResponse[]
  contextLabel: string
  scopeLabel: string
}

export function generateBattingStatsPdf({ stats, contextLabel, scopeLabel }: BattingStatsPdfOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  let y = drawPageHeader(doc, 'Schlag-Statistiken', contextLabel)

  const sorted = [...stats].sort((a, b) => {
    const diff = Number(b.battingAverage) - Number(a.battingAverage)
    if (diff !== 0) return diff
    return b.hits - a.hits || a.playerName.localeCompare(b.playerName)
  })

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...COLOR_GRAY_MUTED)
    doc.text('Keine Schlag-Daten in diesem Zeitraum.', margin, y + 8)
    applyFootersToAllPages(doc)
    const fname = safeFilename(['Schlag-Statistiken', scopeLabel, contextLabel])
    doc.setProperties({ title: fname })
    doc.save(fname + '.pdf')
    return
  }

  const topPlayer = sorted.find(p => p.atBats > 0)
  if (topPlayer) {
    y = drawHeroBlock(
      doc,
      y,
      'Top Hitter',
      topPlayer.playerName,
      'AVG',
      formatDec(Number(topPlayer.battingAverage)),
    )
  }

  const head = [[
    '#', 'Spieler', 'PA', 'AB', 'H', 'AVG', '1B', '2B', '3B', 'HR', 'R',
    'BB', 'HBP', 'K', 'SB', 'CS', 'PO', 'RBI', 'OBP', 'SLG', 'OPS',
  ]]

  const rows = sorted.map((s, idx) => [
    String(idx + 1),
    s.playerName,
    String(s.plateAppearances),
    String(s.atBats),
    String(s.hits),
    formatDec(Number(s.battingAverage)),
    String(s.singles),
    String(s.doubles),
    String(s.triples),
    String(s.homeRuns),
    String(s.runs),
    String(s.walks),
    String(s.hitByPitch),
    String(s.strikeouts),
    String(s.stolenBases),
    String(s.caughtStealing),
    String(s.pickoffs ?? 0),
    String(s.runsBattedIn),
    formatPct(Number(s.onBasePct)),
    formatDec(Number(s.sluggingPct)),
    formatDec(Number(s.ops)),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 16 },
    head,
    body: rows,
    theme: 'plain',
    tableWidth: TABLE_WIDTH,
    styles: {
      // 6.5pt war zu klein zum Lesen, und die Seite war zur Haelfte leer — 17 Zeilen lassen
      // reichlich Luft nach unten.
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 1.2, right: 1.2 },
      lineColor: COLOR_GRAY_LINE,
      lineWidth: 0,
      textColor: COLOR_NAVY,
      overflow: 'visible',
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      cellPadding: { top: 2.4, bottom: 2.4, left: 1.2, right: 1.2 },
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
    columnStyles: buildColumnStyles(),
    didDrawCell: (data) => {
      // Linien enden an der Tabellenkante, nicht am Seitenrand. Vorher gingen sie bis
      // pageWidth - margin und standen sichtbar rechts ueber die Tabelle hinaus.
      const lineEnd = margin + TABLE_WIDTH

      // Thicker red rule below the header row
      if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
        doc.setDrawColor(...COLOR_RED)
        doc.setLineWidth(0.6)
        const lineY = data.cell.y + data.cell.height
        doc.line(margin, lineY, lineEnd, lineY)
      }
      // Hairline row separator
      if (data.section === 'body' && data.column.index === 0) {
        doc.setDrawColor(...COLOR_GRAY_LINE)
        doc.setLineWidth(0.1)
        const lineY = data.cell.y + data.cell.height
        doc.line(margin, lineY, lineEnd, lineY)
      }
    },
    didParseCell: (data) => {
      // Highlight top-1 row in red (only when AB > 0)
      if (data.section === 'body' && data.row.index === 0 && sorted[0].atBats > 0) {
        if (data.column.index === 0) {
          data.cell.styles.textColor = COLOR_RED
          data.cell.styles.fontStyle = 'bold'
        } else if (data.column.index === 1) {
          data.cell.styles.textColor = COLOR_RED
        } else {
          data.cell.styles.textColor = COLOR_NAVY
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  const legendY = Math.min(finalY + 7, pageHeight - 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_GRAY_TEXT)
  const legend = 'PA Plate Appearances · AB At Bats · H Hits · R Runs Scored · AVG Batting Average · BB Walks · HBP Hit by Pitch · K Strikeouts · SB Stolen Bases · CS Caught Stealing · PO Pickoffs · RBI Runs Batted In · OBP On-Base · SLG Slugging · OPS OBP + SLG'
  const lines = doc.splitTextToSize(legend, pageWidth - 2 * margin)
  doc.text(lines, margin, legendY)

  applyFootersToAllPages(doc)
  const fname = safeFilename(['Schlag-Statistiken', scopeLabel, contextLabel])
  doc.setProperties({ title: fname })
  doc.save(fname + '.pdf')
}
