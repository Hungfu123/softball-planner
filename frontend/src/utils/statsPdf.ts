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
  scopeLabel: string,
  contextLabel: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  // Eyebrow: tiny uppercase brand tag above title — magazine cover style
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_RED)
  doc.setCharSpace(1.2)
  doc.text('DEAD SOX · STATISTIK', margin, 14)
  doc.setCharSpace(0)

  // Main title — large, bold, uppercase
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...COLOR_NAVY)
  doc.setCharSpace(0.8)
  doc.text(title.toUpperCase(), margin, 24)
  doc.setCharSpace(0)

  // Thin red rule below title — short, sharp accent
  doc.setDrawColor(...COLOR_RED)
  doc.setLineWidth(0.8)
  doc.line(margin, 27, margin + 22, 27)

  // Subtitle row: scope · context (left), timestamp (right)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_NAVY_SOFT)
  doc.text(`${scopeLabel.toUpperCase()} · ${contextLabel}`, margin, 33)

  doc.setFontSize(8)
  doc.setTextColor(...COLOR_GRAY_TEXT)
  doc.text(`Stand: ${formatTimestamp()}`, pageWidth - margin, 33, { align: 'right' })

  return 38
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
  const boxH = 22

  // Background block — deep navy
  doc.setFillColor(...COLOR_NAVY)
  doc.rect(boxX, boxY, boxW, boxH, 'F')

  // Red accent strip on the left edge — sharp 10% accent
  doc.setFillColor(...COLOR_RED)
  doc.rect(boxX, boxY, 2.4, boxH, 'F')

  // Eyebrow
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 220, 220)
  doc.setCharSpace(1.5)
  doc.text(eyebrow.toUpperCase(), boxX + 6, boxY + 7)
  doc.setCharSpace(0)

  // Primary name — large, white
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(primary, boxX + 6, boxY + 16)

  // Value — right side, oversized, red
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...COLOR_RED)
  doc.text(value, boxX + boxW - 6, boxY + 16, { align: 'right' })

  // Tiny value label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(255, 220, 220)
  doc.setCharSpace(1.2)
  doc.text(valueLabel.toUpperCase(), boxX + boxW - 6, boxY + 20, { align: 'right' })
  doc.setCharSpace(0)

  return boxY + boxH + 6
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

  let y = drawPageHeader(doc, 'Schlag-Statistiken', scopeLabel, contextLabel)

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
      `Top Hitter · ${scopeLabel} · ${contextLabel}`,
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
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.6, bottom: 1.6, left: 1, right: 1 },
      lineColor: COLOR_GRAY_LINE,
      lineWidth: 0,
      textColor: COLOR_NAVY,
      overflow: 'visible',
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6,
      halign: 'center',
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
    columnStyles: {
      0: { cellWidth: 6.5, halign: 'right', textColor: COLOR_GRAY_MUTED, font: 'courier' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 7, halign: 'right', font: 'courier' },
      3: { cellWidth: 7, halign: 'right', font: 'courier' },
      4: { cellWidth: 7, halign: 'right', font: 'courier' },
      5: { cellWidth: 9.5, halign: 'right', fontStyle: 'bold', font: 'courier' },
      6: { cellWidth: 6.5, halign: 'right', font: 'courier' },
      7: { cellWidth: 6.5, halign: 'right', font: 'courier' },
      8: { cellWidth: 6.5, halign: 'right', font: 'courier' },
      9: { cellWidth: 6.5, halign: 'right', font: 'courier' },
      10: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // R
      11: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // BB
      12: { cellWidth: 7.5, halign: 'right', font: 'courier' },   // HBP
      13: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // K
      14: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // SB
      15: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // CS
      16: { cellWidth: 6.5, halign: 'right', font: 'courier' },   // PO
      17: { cellWidth: 7.5, halign: 'right', font: 'courier' },   // RBI
      18: { cellWidth: 8.5, halign: 'right', font: 'courier' },   // OBP
      19: { cellWidth: 9.5, halign: 'right', font: 'courier' },   // SLG
      20: { cellWidth: 9.5, halign: 'right', fontStyle: 'bold', font: 'courier' }, // OPS
    },
    didDrawCell: (data) => {
      // Thicker red rule below the header row
      if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
        doc.setDrawColor(...COLOR_RED)
        doc.setLineWidth(0.6)
        const lineY = data.cell.y + data.cell.height
        doc.line(margin, lineY, pageWidth - margin, lineY)
      }
      // Hairline row separator
      if (data.section === 'body' && data.column.index === 0) {
        doc.setDrawColor(...COLOR_GRAY_LINE)
        doc.setLineWidth(0.1)
        const lineY = data.cell.y + data.cell.height
        doc.line(margin, lineY, pageWidth - margin, lineY)
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
