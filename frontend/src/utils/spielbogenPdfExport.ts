import { jsPDF } from 'jspdf'
import { renderCells, cellKey, computePositionHistoryPerSlot, positionDisplay } from './bogenSheetRenderer'
import type { AdvanceLabel } from './bogenSheetRenderer'
import type {
  BogenSheetResponse,
  SpielbogenSlotResponse,
  SpielbogenAtBatResponse,
  SpielbogenStealingResponse,
  SpielbogenPositionChangeResponse,
  SpielbogenRunnerAdvanceResponse,
  BogenSide,
} from '@/types'

const COLOR_BORDER: [number, number, number] = [55, 65, 81]
const COLOR_BORDER_DARK: [number, number, number] = [17, 24, 39]
const COLOR_NAVY: [number, number, number] = [30, 58, 138]
const COLOR_RED: [number, number, number] = [220, 38, 38]
const COLOR_RED_DARK: [number, number, number] = [124, 45, 18]
const COLOR_ORANGE: [number, number, number] = [249, 115, 22]
const COLOR_CREAM: [number, number, number] = [240, 240, 240]
const COLOR_CREAM_LIGHT: [number, number, number] = [255, 255, 255]

export async function generateSpielbogenPdf(sheet: BogenSheetResponse): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RFL — Ruhr-Fun-Liga Mixed Fastpitch Softball', 30, 16)

  const date = new Date(sheet.meta.date + 'T00:00:00').toLocaleDateString('de-DE')
  // Boxen alle bei gleichem X starten (rechts vom breitesten Label "Datum:")
  drawHeaderField(doc, 'Ort:', sheet.meta.location ?? '', 232, 10, 244, 38)
  drawHeaderField(doc, 'Datum:', date, 232, 15, 244, 38)
  drawHeaderField(doc, 'Zeit:', '', 232, 20, 244, 38)

  await drawLogo(doc, 10, 6, 18, 18)

  drawTeamBanner(doc, 8, 28, 'Gast', sheet.meta.awayTeamName, sheet.meta.awayRuns, 130)
  drawTeamBanner(doc, 152, 28, 'Heim', sheet.meta.homeTeamName, sheet.meta.homeRuns, 130)

  const maxInning = Math.max(
    7,
    ...sheet.homeAtBats.map(a => a.inning),
    ...sheet.awayAtBats.map(a => a.inning),
  )

  drawSheet(doc, 8, 42, 'AWAY', sheet.awayLineup, sheet.awayAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning, sheet.positionChanges, sheet.runnerAdvances)
  drawSheet(doc, 152, 42, 'HOME', sheet.homeLineup, sheet.homeAtBats, sheet.stealingEvents, sheet.inningRuns, maxInning, sheet.positionChanges, sheet.runnerAdvances)

  doc.save(`spielbogen-${sheet.meta.date}-${sheet.meta.homeTeamName}-vs-${sheet.meta.awayTeamName}.pdf`)
}

let cachedLogoDataUrl: string | null = null

async function loadLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl
  const response = await fetch('/rfl-logo.png')
  const blob = await response.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  cachedLogoDataUrl = dataUrl
  return dataUrl
}

function drawHeaderField(doc: jsPDF, label: string, value: string, x: number, y: number, boxX: number, boxW: number) {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(label, x, y)
  const boxY = y - 3.2
  const boxH = 4
  doc.setFillColor(220, 220, 220)
  doc.rect(boxX, boxY, boxW, boxH, 'F')
  // Schwarzer Strich unter Box (Eintragsfeld-Look)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.line(boxX, boxY + boxH, boxX + boxW, boxY + boxH)
  if (value) {
    doc.setTextColor(0, 0, 0)
    doc.text(value, boxX + 1.5, y)
  }
}

async function drawLogo(doc: jsPDF, x: number, y: number, w: number, h: number) {
  try {
    const dataUrl = await loadLogoDataUrl()
    doc.addImage(dataUrl, 'PNG', x, y, w, h)
  } catch {
    // Fallback: Pentagon mit rot/grün-Split falls Logo-Asset nicht ladbar.
    doc.setFillColor(204, 41, 54)
    doc.rect(x, y, w, h, 'F')
    doc.setFillColor(40, 100, 70)
    doc.triangle(x, y, x + w * 0.5, y, x, y + h * 0.5, 'F')
  }
}

function drawTeamBanner(doc: jsPDF, x: number, y: number, label: string, team: string, runs: number, width: number) {
  const bannerH = 8
  const summeAreaW = 28 // Gap + Summe-Runs-Bereich rechts
  const creamW = width - summeAreaW

  // Cream-Hintergrund nur für Gast/Heim-Bereich, dann Lücke vor Summe-Box.
  doc.setFillColor(...COLOR_CREAM)
  doc.rect(x, y, creamW, bannerH, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  // Label "Gast:" / "Heim:" schwarz, Team-Name danach navy.
  const labelText = `${label}:`
  doc.setTextColor(0, 0, 0)
  doc.text(labelText, x + 2, y + 5)
  const labelW = doc.getTextWidth(labelText)
  doc.setTextColor(17, 27, 107)
  doc.text(team, x + 2 + labelW + 1.5, y + 5)

  // "Summe Runs:" Label rechts + kleiner Box mit schwarzem Rahmen für Wert.
  const boxW = 12
  const boxH = 6
  const boxX = x + width - boxW - 1
  const boxY = y + (bannerH - boxH) / 2
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Summe', boxX - 2, y + 3.4, { align: 'right' })
  doc.text('Runs:', boxX - 2, y + 6, { align: 'right' })
  // Box mit Cream-Fill + dickem schwarzem Border
  doc.setFillColor(...COLOR_CREAM)
  doc.rect(boxX, boxY, boxW, boxH, 'F')
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.6)
  doc.rect(boxX, boxY, boxW, boxH)
  // Wert mittig in Box
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(String(runs), boxX + boxW / 2, boxY + 4.2, { align: 'center' })
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
  numInnings: number,
  positionChanges: SpielbogenPositionChangeResponse[],
  runnerAdvances: SpielbogenRunnerAdvanceResponse[],
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

  const cellMap = renderCells(atBats, stealings, runnerAdvances ?? [])
  const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)
  const sideChanges = positionChanges.filter(pc => pc.side === side)
  const historyPerSlot = computePositionHistoryPerSlot(
    sorted.map(s => ({ id: s.id, position: s.position })),
    sideChanges,
  )

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
      const history = historyPerSlot.get(slot.id) ?? [slot.position ?? '']
      const yPositions = [yy + 4, yy + rowH * 0.45 + 3, yy + rowH * 0.75 + 3]
      for (let i = 0; i < Math.min(history.length, 3); i++) {
        doc.text(positionDisplay(history[i]), x + colNum + colName + 2, yPositions[i])
      }
    }

    // Substitution-Linien in Name- und Pos-Zelle: 2 dünne graue Linien zum Eintragen.
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.15)
    const subLineX1 = x + colNum + 1.5
    const subLineX2 = x + colNum + colName + colPos - 1.5
    doc.line(subLineX1, yy + rowH * 0.45, subLineX2, yy + rowH * 0.45)
    doc.line(subLineX1, yy + rowH * 0.75, subLineX2, yy + rowH * 0.75)

    for (let inn = 1; inn <= numInnings; inn++) {
      const cellX = x + colNum + colName + colPos + (inn - 1) * colInning
      const cell = slot ? cellMap.get(cellKey(side, slot.id, inn)) : undefined
      drawDiamondCell(doc, cellX, yy, colInning, rowH, cell)
    }
  }

  drawTableGrid(doc, x, y, tableW, tableH, headerH, rowH, numRows, colNum, colName, colPos, colInning, numInnings)

  const lastRowY = y + headerH + numRows * rowH
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('erzielte Runs', x + 2, lastRowY + 4)
  for (let inn = 1; inn <= numInnings; inn++) {
    const runs = inningRuns[inn]
    const value = runs ? runs[sideKey] : 0
    doc.setTextColor(...COLOR_NAVY)
    doc.text(String(value), x + colNum + colName + colPos + (inn - 0.5) * colInning, lastRowY + 4, { align: 'center' })
  }
  doc.setTextColor(0, 0, 0)

  // Footer outer border + vertical separators on inning footer cells
  doc.setDrawColor(...COLOR_BORDER_DARK)
  doc.setLineWidth(0.2)
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
  doc.setLineWidth(0.2)

  // Outer rectangle
  doc.rect(x, y, tableW, tableH)

  // Bottom of header
  doc.line(x, y + headerH, x + tableW, y + headerH)

  // Horizontal row separators
  doc.setDrawColor(...COLOR_BORDER)
  doc.setLineWidth(0.15)
  for (let r = 1; r < numRows; r++) {
    const yy = y + headerH + r * rowH
    doc.line(x, yy, x + tableW, yy)
  }

  // Vertical separators (Nr / Name / Pos)
  doc.setDrawColor(...COLOR_BORDER_DARK)
  doc.setLineWidth(0.2)
  doc.line(x + colNum, y, x + colNum, y + tableH)
  doc.line(x + colNum + colName, y, x + colNum + colName, y + tableH)
  doc.line(x + colNum + colName + colPos, y, x + colNum + colName + colPos, y + tableH)

  // Vertical separators between every inning column
  doc.setDrawColor(...COLOR_BORDER)
  doc.setLineWidth(0.15)
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
  stealingArrows: { fromBase: number; toBase: number; type: string }[]
  inningEnd: boolean
  advanceLabels?: AdvanceLabel[]
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

  const isMulti = (cell?.abCount ?? 0) >= 2

  // Multi-AB diagonal divider (Wrap-Around: gleicher Slot 2+ Bats im selben Inning)
  // Nur bei nicht-filled — Slash auf gefülltem Diamond sieht aus wie Strikethrough.
  if (isMulti && !filled) {
    doc.setDrawColor(156, 163, 175)
    doc.setLineWidth(0.15)
    doc.line(cellX + cellW, cellY, cellX, cellY + cellH)
  }

  if (cell?.primaryLabel) {
    doc.setFont('helvetica', 'bold')
    if (filled) {
      // Below-always: AB-Label unten unter Diamond statt cream-on-blue inside.
      doc.setTextColor(...COLOR_NAVY)
      const baseY = home.y + 2.5
      if (isMulti && cell.labels.length >= 2) {
        doc.setFontSize(cell.labels.length >= 3 ? 4 : 5)
        doc.text(cell.labels.join(' ').slice(0, 12), cx, baseY, { align: 'center' })
      } else {
        doc.setFontSize(5.5)
        doc.text(cell.primaryLabel.slice(0, 5), cx, baseY, { align: 'center' })
      }
    } else if (isMulti && cell.labels.length >= 2) {
      // 1. AB oben-links Triangle, neueste AB unten-rechts Triangle — größere Schrift für Lesbarkeit
      doc.setTextColor(...COLOR_NAVY)
      doc.setFontSize(5.5)
      const firstLbl = cell.labels[cell.labels.length - 2] ?? ''
      const lastLbl = cell.labels[cell.labels.length - 1] ?? ''
      doc.text(firstLbl.slice(0, 5), cellX + 2, cellY + 6.5)
      doc.text(lastLbl.slice(0, 5), cellX + cellW - 2, cellY + cellH - 2, { align: 'right' })
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

  // ×N Badge — nur bei 3+ ABs in NICHT-filled (Slash zeigt nur 2 Labels,
  // Badge gibt Total-Count). Bei filled+multi sind alle Labels inline → Badge redundant.
  if ((cell?.abCount ?? 0) >= 3 && !filled) {
    doc.setFillColor(...COLOR_RED)
    doc.circle(cellX + 2.5, cellY + cellH - 2.2, 1.6, 'F')
    doc.setFontSize(3.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`x${cell?.abCount}`, cellX + 2.5, cellY + cellH - 1.6, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }

  // Out# unten-links (Roman, navy + bold, klein) — kein Konflikt mit AB-Label
  if (cell?.outIndex) {
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_NAVY)
    doc.text(cell.outIndex, cellX + 0.5, cellY + cellH - 0.7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
  }

  // Inning-End-Marker — RFL-Konvention: kleine Diagonale am rechten Cell-Border
  if (cell?.inningEnd) {
    doc.setDrawColor(31, 41, 55)
    doc.setLineWidth(0.4)
    const x1 = cellX + cellW - 2
    const y1 = cellY + cellH * 0.78
    const x2 = cellX + cellW
    const y2 = cellY + cellH - 0.5
    doc.line(x1, y1, x2, y2)
  }

  // RBI dots top-right (red)
  if (cell?.rbi && cell.rbi > 0) {
    doc.setFillColor(...COLOR_RED)
    const dots = Math.min(cell.rbi, 3)
    for (let i = 0; i < dots; i++) {
      doc.circle(cellX + cellW - 1.2 - i * 1.4, cellY + 1.6, 0.5, 'F')
    }
  }

  if (cell?.advanceLabels?.length) {
    doc.setFontSize(4)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    for (const adv of cell.advanceLabels) {
      const cellMid = { x: cellX + cellW * 0.5, y: cellY + cellH * 0.5 }
      const pos = pdfSidePosition(adv.side, cellMid, cellW, cellH)
      doc.text(adv.label, pos.x, pos.y, { align: 'center' })
    }
  }

  // Stealing arrows (dashed lines between bases) — Multi-Stealing pro Cell unterstützt.
  // Farbe + Label per Type: SB rot, CS/OUT_ON_PLAY dunkelrot, WP/PB orange.
  const arrows = cell?.stealingArrows ?? (cell?.stealingArrow ? [cell.stealingArrow] : [])
  let labelIdx = 0
  for (const arrow of arrows) {
    const from = baseCenter(arrow.fromBase, home, first, sec, third)
    const to = baseCenter(arrow.toBase, home, first, sec, third)
    const arrowColor: [number, number, number] =
      arrow.type === 'WILD_PITCH' || arrow.type === 'PASSED_BALL' ? COLOR_ORANGE
      : arrow.type === 'CAUGHT_STEALING' || arrow.type === 'OUT_ON_PLAY' ? COLOR_RED_DARK
      : COLOR_RED
    doc.setDrawColor(...arrowColor)
    doc.setLineWidth(0.4)
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
    const label =
      arrow.type === 'WILD_PITCH' ? 'WP'
      : arrow.type === 'PASSED_BALL' ? 'PB'
      : arrow.type === 'CAUGHT_STEALING' ? 'CS'
      : arrow.type === 'OUT_ON_PLAY' ? 'OUT'
      : arrow.type === 'STOLEN_BASE' ? 'SB'
      : null
    if (label) {
      const labelColor: [number, number, number] =
        arrow.type === 'WILD_PITCH' || arrow.type === 'PASSED_BALL' ? COLOR_ORANGE : [0, 0, 0]
      doc.setFontSize(3)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...labelColor)
      // Position per Steal-Direction (analog Advance-Labels).
      const side = pdfStealSide(arrow.fromBase, arrow.toBase)
      let labelX: number, labelY: number
      if (side) {
        const cellMid = { x: cellX + cellW * 0.5, y: cellY + cellH * 0.5 }
        const pos = pdfSidePosition(side, cellMid, cellW, cellH)
        labelX = pos.x
        labelY = pos.y
      } else {
        labelX = cellX + cellW * 0.5
        labelY = cellY + 1.4 + labelIdx * 1.4
      }
      doc.text(label, labelX, labelY, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      labelIdx++
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

function pdfStealSide(fromBase: number, toBase: number): 'home-1b' | '1b-2b' | '2b-3b' | '3b-home' | null {
  if (fromBase === 0 && toBase === 1) return 'home-1b'
  if (fromBase === 1 && toBase === 2) return '1b-2b'
  if (fromBase === 2 && toBase === 3) return '2b-3b'
  if (fromBase === 3 && toBase === 4) return '3b-home'
  if (toBase >= 4) return '3b-home'
  if (toBase === 3) return '2b-3b'
  if (toBase === 2) return '1b-2b'
  return null
}

function pdfSidePosition(
  side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home',
  mid: { x: number; y: number },
  cellW: number,
  cellH: number,
) {
  // Außerhalb Diamond-Stroke. Top-Sides ganz oben in Cell.
  const dx = cellW * 0.38
  const dyTop = cellH * 0.32
  const dyBot = cellH * 0.28
  if (side === 'home-1b') return { x: mid.x + dx, y: mid.y + dyBot }
  if (side === '1b-2b') return { x: mid.x + dx, y: mid.y - dyTop }
  if (side === '2b-3b') return { x: mid.x - dx, y: mid.y - dyTop }
  if (side === '3b-home') return { x: mid.x - dx, y: mid.y + dyBot }
  return { x: mid.x, y: mid.y }
}
