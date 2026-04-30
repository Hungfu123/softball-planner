import { jsPDF } from 'jspdf'
import { renderCells, cellKey } from './bogenSheetRenderer'
import type { BogenSheetResponse, SpielbogenSlotResponse, SpielbogenAtBatResponse, SpielbogenStealingResponse, BogenSide } from '@/types'

export function generateSpielbogenPdf(sheet: BogenSheetResponse): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

  // Header (Y 8-22)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RFL — Ruhr-Fun-Liga Mixed Fastpitch Softball', 30, 16)

  // Right header: Ort, Datum
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ort: ${sheet.meta.location ?? '—'}`, 220, 10)
  const date = new Date(sheet.meta.date + 'T00:00:00').toLocaleDateString('de-DE')
  doc.text(`Datum: ${date}`, 220, 16)

  // Logo placeholder (red+green diamond)
  drawLogo(doc, 10, 8, 16, 16)

  // Team banners (Y 28-34)
  drawTeamBanner(doc, 8, 28, 'Gast', sheet.meta.awayTeamName, sheet.meta.awayRuns, 130)
  drawTeamBanner(doc, 152, 28, 'Heim', sheet.meta.homeTeamName, sheet.meta.homeRuns, 130)

  // Compute max inning across all at-bats (default 7, extends for extra innings)
  const maxInning = Math.max(
    7,
    ...sheet.homeAtBats.map(a => a.inning),
    ...sheet.awayAtBats.map(a => a.inning),
  )

  // Sheets (Y 42-180)
  drawSheet(doc, 8, 42, 'AWAY', sheet.awayLineup, sheet.awayAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning)
  drawSheet(doc, 152, 42, 'HOME', sheet.homeLineup, sheet.homeAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning)

  doc.save(`spielbogen-${sheet.meta.date}-${sheet.meta.homeTeamName}-vs-${sheet.meta.awayTeamName}.pdf`)
}

function drawLogo(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Red right triangle
  doc.setFillColor(204, 41, 54)
  doc.line(x + w / 2, y, x + w, y + h / 2)
  doc.line(x + w, y + h / 2, x + w / 2, y + h)
  doc.line(x + w / 2, y + h, x + w / 2, y)
  // Simple colored rectangles as diamond substitute
  doc.setFillColor(204, 41, 54)
  doc.rect(x + w / 2, y, w / 2, h / 2, 'F')
  doc.setFillColor(40, 100, 70)
  doc.rect(x, y, w / 2, h / 2, 'F')
  doc.setFillColor(40, 100, 70)
  doc.rect(x + w / 2, y + h / 2, w / 2, h / 2, 'F')
  doc.setFillColor(204, 41, 54)
  doc.rect(x, y + h / 2, w / 2, h / 2, 'F')
}

function drawTeamBanner(doc: jsPDF, x: number, y: number, label: string, team: string, runs: number, width: number) {
  doc.setFillColor(245, 235, 215)
  doc.rect(x, y, width, 6, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 27, 107)
  doc.text(`${label}: ${team}`, x + 2, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(`Summe: ${runs}`, x + width - 25, y + 4)
  doc.setTextColor(0, 0, 0)
}

function drawSheet(
  doc: jsPDF,
  x: number,
  y: number,
  side: BogenSide,
  lineup: SpielbogenSlotResponse[],
  atBats: SpielbogenAtBatResponse[],
  stealings: SpielbogenStealingResponse[],
  inningRuns: Record<number, { home: number; away: number }>,
  numInnings: number
) {
  const tableW = 137
  const colNum = 8
  const colName = 35
  const colPos = 12
  const colInning = (tableW - colNum - colName - colPos) / numInnings
  const rowH = 11
  const sideKey = side === 'HOME' ? 'home' : 'away'

  // Header row
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(245, 235, 215)
  doc.rect(x, y, tableW, 5, 'F')
  doc.setTextColor(0, 0, 0)
  doc.text('Nr', x + 2, y + 3.5)
  doc.text('Name', x + colNum + 2, y + 3.5)
  doc.text('Pos', x + colNum + colName + 2, y + 3.5)
  for (let i = 1; i <= numInnings; i++) {
    doc.text(String(i), x + colNum + colName + colPos + (i - 0.5) * colInning, y + 3.5, { align: 'center' })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)

  const cellMap = renderCells(atBats, stealings)
  const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)

  for (let row = 0; row < 10; row++) {
    const slot = sorted[row] ?? null
    const yy = y + 5 + row * rowH

    // Row border
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    doc.line(x, yy, x + tableW, yy)

    // Zebra background
    if (row % 2 === 1) {
      doc.setFillColor(250, 247, 240)
      doc.rect(x, yy, tableW, rowH, 'F')
    }

    if (slot) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(String(slot.battingOrder), x + 2, yy + 4)
      doc.text(slot.name.slice(0, 18), x + colNum + 2, yy + 4)
      doc.text(slot.position ?? '—', x + colNum + colName + 2, yy + 4)
    }

    // Inning cells with diamond outline + notation
    for (let inn = 1; inn <= numInnings; inn++) {
      const cellX = x + colNum + colName + colPos + (inn - 1) * colInning
      const cellW = colInning - 0.5
      const cellH = rowH - 1.5
      const cx = cellX + cellW / 2
      const cy = yy + 1 + cellH / 2
      const r = Math.min(cellW, cellH) / 2 - 1

      // Diamond outline using 4 lines
      doc.setDrawColor(30, 42, 143)
      doc.setLineWidth(0.3)
      doc.line(cx, cy - r, cx + r, cy)
      doc.line(cx + r, cy, cx, cy + r)
      doc.line(cx, cy + r, cx - r, cy)
      doc.line(cx - r, cy, cx, cy - r)

      if (slot) {
        const cell = cellMap.get(cellKey(side, slot.id, inn))
        if (cell?.label) {
          if (cell.runScored) {
            // Fill diamond with light red when run scored (approximated with rotated rect)
            doc.setFillColor(254, 226, 226)
            doc.rect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4, 'F')
          }
          doc.setFontSize(6)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 42, 143)
          doc.text(cell.label.slice(0, 4), cx, cy + 0.5, { align: 'center' })
          doc.setTextColor(0, 0, 0)
        }
      }
    }
  }

  // Bottom border for last row
  const lastRowY = y + 5 + 10 * rowH
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.2)
  doc.line(x, lastRowY, x + tableW, lastRowY)

  // Footer: erzielte Runs per inning
  doc.setFillColor(245, 235, 215)
  doc.rect(x, lastRowY, tableW, 6, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 27, 107)
  doc.text('erzielte Runs', x + 2, lastRowY + 4)
  for (let inn = 1; inn <= numInnings; inn++) {
    const runs = inningRuns[inn]
    const value = runs ? runs[sideKey] : 0
    doc.text(String(value), x + colNum + colName + colPos + (inn - 0.5) * colInning, lastRowY + 4, { align: 'center' })
  }
  doc.setTextColor(0, 0, 0)
}
