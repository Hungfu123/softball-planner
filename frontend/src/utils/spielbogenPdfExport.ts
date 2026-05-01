import { jsPDF } from 'jspdf'
import { renderCells, cellKey } from './bogenSheetRenderer'
import type {
  BogenSheetResponse,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  BogenSide,
} from '@/types'

const COLOR_BORDER: [number, number, number] = [55, 65, 81]
const COLOR_BORDER_DARK: [number, number, number] = [17, 24, 39]
const COLOR_NAVY: [number, number, number] = [30, 58, 138]
const COLOR_RED: [number, number, number] = [220, 38, 38]
const COLOR_CREAM: [number, number, number] = [245, 235, 215]
const COLOR_CREAM_LIGHT: [number, number, number] = [250, 247, 240]

export function generateSpielbogenPdf(sheet: BogenSheetResponse): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RFL — Ruhr-Fun-Liga Mixed Fastpitch Softball', 30, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ort: ${sheet.meta.location ?? '—'}`, 220, 10)
  const date = new Date(sheet.meta.date + 'T00:00:00').toLocaleDateString('de-DE')
  doc.text(`Datum: ${date}`, 220, 16)

  drawLogo(doc, 10, 8, 16, 16)

  drawTeamBanner(doc, 8, 28, 'Gast', sheet.meta.awayTeamName, sheet.meta.awayRuns, 130)
  drawTeamBanner(doc, 152, 28, 'Heim', sheet.meta.homeTeamName, sheet.meta.homeRuns, 130)

  const maxInning = Math.max(
    7,
    ...sheet.homeAtBats.map(a => a.inning),
    ...sheet.awayAtBats.map(a => a.inning),
  )

  drawSheet(doc, 8, 42, 'AWAY', sheet.awayLineup, sheet.awayAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning)
  drawSheet(doc, 152, 42, 'HOME', sheet.homeLineup, sheet.homeAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning)

  doc.save(`spielbogen-${sheet.meta.date}-${sheet.meta.homeTeamName}-vs-${sheet.meta.awayTeamName}.pdf`)
}

function drawLogo(doc: jsPDF, x: number, y: number, w: number, h: number) {
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
  doc.setFillColor(...COLOR_CREAM)
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
  const rowH = 15
  const numRows = 10
  const sideKey = side === 'HOME' ? 'home' : 'away'
  const headerH = 5
  const footerH = 6
  const tableH = headerH + numRows * rowH

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(...COLOR_CREAM)
  doc.rect(x, y, tableW, headerH, 'F')
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

  for (let row = 0; row < numRows; row++) {
    const slot = sorted[row] ?? null
    const yy = y + headerH + row * rowH

    if (row % 2 === 1) {
      doc.setFillColor(...COLOR_CREAM_LIGHT)
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

    for (let inn = 1; inn <= numInnings; inn++) {
      const cellX = x + colNum + colName + colPos + (inn - 1) * colInning
      const cell = slot ? cellMap.get(cellKey(side, slot.id, inn)) : undefined
      drawDiamondCell(doc, cellX, yy, colInning, rowH, cell)
    }
  }

  drawTableGrid(doc, x, y, tableW, tableH, headerH, rowH, numRows, colNum, colName, colPos, colInning, numInnings)

  const lastRowY = y + headerH + numRows * rowH
  doc.setFillColor(...COLOR_CREAM)
  doc.rect(x, lastRowY, tableW, footerH, 'F')
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

  // Footer outer border + vertical separators on inning footer cells
  doc.setDrawColor(...COLOR_BORDER_DARK)
  doc.setLineWidth(0.4)
  doc.rect(x, lastRowY, tableW, footerH)
  for (let i = 0; i <= numInnings; i++) {
    const xv = x + colNum + colName + colPos + i * colInning
    doc.line(xv, lastRowY, xv, lastRowY + footerH)
  }
}

function drawTableGrid(
  doc: jsPDF,
  x: number,
  y: number,
  tableW: number,
  tableH: number,
  headerH: number,
  rowH: number,
  numRows: number,
  colNum: number,
  colName: number,
  colPos: number,
  colInning: number,
  numInnings: number
) {
  doc.setDrawColor(...COLOR_BORDER_DARK)
  doc.setLineWidth(0.4)

  // Outer rectangle
  doc.rect(x, y, tableW, tableH)

  // Bottom of header
  doc.line(x, y + headerH, x + tableW, y + headerH)

  // Horizontal row separators
  doc.setDrawColor(...COLOR_BORDER)
  doc.setLineWidth(0.3)
  for (let r = 1; r < numRows; r++) {
    const yy = y + headerH + r * rowH
    doc.line(x, yy, x + tableW, yy)
  }

  // Vertical separators (Nr / Name / Pos)
  doc.setDrawColor(...COLOR_BORDER_DARK)
  doc.setLineWidth(0.4)
  doc.line(x + colNum, y, x + colNum, y + tableH)
  doc.line(x + colNum + colName, y, x + colNum + colName, y + tableH)
  doc.line(x + colNum + colName + colPos, y, x + colNum + colName + colPos, y + tableH)

  // Vertical separators between every inning column
  doc.setDrawColor(...COLOR_BORDER)
  doc.setLineWidth(0.3)
  for (let i = 1; i < numInnings; i++) {
    const xv = x + colNum + colName + colPos + i * colInning
    doc.line(xv, y, xv, y + tableH)
  }
}

interface CellRenderInput {
  primaryLabel: string
  labels: string[]
  runScored: boolean
  outIndex: string | null
  rbi: number
  reachedBase: number
  abCount: number
  stealingArrow: { fromBase: number; toBase: number; type: string } | null
}

function drawDiamondCell(
  doc: jsPDF,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  cell: CellRenderInput | undefined
) {
  const padX = 0.5
  const padY = 1
  const innerW = cellW - 2 * padX
  const innerH = cellH - 2 * padY
  const cx = cellX + cellW / 2
  // Diamond sits in the upper portion, label/notation in the lower portion
  const r = Math.min(innerW * 0.42, innerH * 0.36)
  const cy = cellY + padY + r + 0.5

  const home = { x: cx, y: cy + r }
  const first = { x: cx + r, y: cy }
  const sec = { x: cx, y: cy - r }
  const third = { x: cx - r, y: cy }

  const reach = cell?.reachedBase ?? 0
  const filled = cell?.runScored ?? false

  if (filled) {
    doc.setFillColor(...COLOR_NAVY)
    doc.triangle(home.x, home.y, first.x, first.y, cx, cy, 'F')
    doc.triangle(first.x, first.y, sec.x, sec.y, cx, cy, 'F')
    doc.triangle(sec.x, sec.y, third.x, third.y, cx, cy, 'F')
    doc.triangle(third.x, third.y, home.x, home.y, cx, cy, 'F')
  }

  // Outline
  doc.setDrawColor(31, 41, 55)
  doc.setLineWidth(0.25)
  doc.line(home.x, home.y, first.x, first.y)
  doc.line(first.x, first.y, sec.x, sec.y)
  doc.line(sec.x, sec.y, third.x, third.y)
  doc.line(third.x, third.y, home.x, home.y)

  // Advancement segments — thick navy
  if (reach > 0 && !filled) {
    const segs: Array<[typeof home, typeof home]> = [
      [home, first],
      [first, sec],
      [sec, third],
      [third, home],
    ]
    doc.setDrawColor(...COLOR_NAVY)
    doc.setLineWidth(0.7)
    for (let s = 0; s < reach; s++) {
      const [a, b] = segs[s]
      doc.line(a.x, a.y, b.x, b.y)
    }
  }

  if (cell?.primaryLabel) {
    doc.setFont('helvetica', 'bold')
    if (filled) {
      doc.setFontSize(6)
      doc.setTextColor(254, 243, 199)
      doc.text(cell.primaryLabel.slice(0, 5), cx, cy + 1, { align: 'center' })
    } else {
      const labels = cell.labels.length > 1 ? cell.labels.slice(-2) : [cell.primaryLabel]
      doc.setTextColor(...COLOR_NAVY)
      const fontSize = labels.length > 1 ? 4.5 : 5.5
      doc.setFontSize(fontSize)
      const baseY = home.y + 2.5
      labels.forEach((lbl, i) => {
        doc.text(lbl.slice(0, 6), cx, baseY + i * (fontSize - 1), { align: 'center' })
      })
    }
    doc.setTextColor(0, 0, 0)
  }

  // Out# top-left (Roman, gray)
  if (cell?.outIndex) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.5)
    doc.setTextColor(120, 120, 120)
    doc.text(cell.outIndex, cellX + 1, cellY + 3)
    doc.setTextColor(0, 0, 0)
  }

  // RBI dots top-right (red)
  if (cell?.rbi && cell.rbi > 0) {
    doc.setFillColor(...COLOR_RED)
    const dots = Math.min(cell.rbi, 3)
    for (let i = 0; i < dots; i++) {
      doc.circle(cellX + cellW - 1.2 - i * 1.4, cellY + 1.6, 0.5, 'F')
    }
  }

  // Stealing arrow (dashed red line between bases)
  if (cell?.stealingArrow) {
    const from = baseCenter(cell.stealingArrow.fromBase, home, first, sec, third)
    const to = baseCenter(cell.stealingArrow.toBase, home, first, sec, third)
    doc.setDrawColor(...COLOR_RED)
    doc.setLineWidth(0.4)
    // jsPDF doesn't support dashed natively without setLineDashPattern; use short segments
    const steps = 6
    for (let s = 0; s < steps; s += 2) {
      const t1 = s / steps
      const t2 = (s + 1) / steps
      doc.line(
        from.x + (to.x - from.x) * t1,
        from.y + (to.y - from.y) * t1,
        from.x + (to.x - from.x) * t2,
        from.y + (to.y - from.y) * t2,
      )
    }
  }
}

function baseCenter(
  base: number,
  home: { x: number; y: number },
  first: { x: number; y: number },
  sec: { x: number; y: number },
  third: { x: number; y: number },
) {
  if (base === 1) return first
  if (base === 2) return sec
  if (base === 3) return third
  return home
}
