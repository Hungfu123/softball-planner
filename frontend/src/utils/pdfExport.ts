import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { GameDayResponse, LineupEntryResponse, GameStaffResponse, Season } from '@/types'

export interface GameData {
  game: { id: number; gameNumber: number; opponentTeam: { id: number; name: string } | null; scoreUs: number | null; scoreThem: number | null }
  lineup: LineupEntryResponse[]
  staff: GameStaffResponse[]
}

export function generatePdf(gameDay: GameDayResponse, games: GameData[], season: Season | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 15

  // Header
  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })

  const title = `${gameDay.label || 'Spieltag'} - ${formatDate(gameDay.date)}`
  const location = gameDay.location ? ` @ ${gameDay.location}` : ''

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title + location, pageWidth / 2, y, { align: 'center' })
  y += 10

  // Content area — centered, narrower than page
  const contentWidth = 100 // mm
  const contentLeft = (pageWidth - contentWidth) / 2
  const contentRight = contentLeft + contentWidth

  // Games
  for (const { game, lineup, staff } of games) {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage()
      y = 15
    }

    // Game header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    let gameTitle = `Spiel ${game.gameNumber}`
    if (game.opponentTeam) gameTitle += ` vs ${game.opponentTeam.name}`
    if (game.scoreUs != null) gameTitle += ` (${game.scoreUs}:${game.scoreThem})`

    doc.text(gameTitle, contentLeft, y)
    doc.setDrawColor(30, 41, 59) // navy
    doc.setLineWidth(0.5)
    doc.line(contentLeft, y + 1, contentRight, y + 1)
    y += 4

    // Staff
    if (staff.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      const staffText = staff.map(s => `${s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach'}: ${s.player.name}`).join('  ·  ')
      doc.text(staffText, contentLeft, y)
      doc.setTextColor(0, 0, 0)
      y += 3
    }

    if (lineup.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text('Kein Lineup', contentLeft, y)
      doc.setTextColor(0, 0, 0)
      y += 6
      continue
    }

    // Lineup table
    const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)
    const rows = sorted.map(entry => {
      let name = entry.player.name
      if (entry.dhBatterPlayer) name += ` (DH: ${entry.dhBatterPlayer.name})`
      return [String(entry.battingOrder), name, entry.position ?? '']
    })

    autoTable(doc, {
      startY: y,
      margin: { left: contentLeft, right: pageWidth - contentRight },
      head: [],
      body: rows,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'right', textColor: [150, 150, 150], font: 'courier' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 14, halign: 'right', font: 'courier', fontStyle: 'bold' },
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2

    // Bench
    const gameUsedIds = new Set<number>()
    for (const e of lineup) {
      gameUsedIds.add(e.player.id)
      if (e.dhBatterPlayer) gameUsedIds.add(e.dhBatterPlayer.id)
    }
    for (const s of staff) gameUsedIds.add(s.player.id)
    const bench = gameDay.availablePlayers.filter(p => !gameUsedIds.has(p.id))
    if (bench.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`Bank: ${bench.map(p => p.name).join(', ')}`, contentLeft, y)
      doc.setTextColor(0, 0, 0)
      y += 2
    }

    y += 5
  }

  // PDF title (shown when saving from browser viewer)
  const parts = ['Lineup']
  if (gameDay.location) parts.push(gameDay.location)
  if (season) parts.push(`${season.name}_${season.year}`)
  doc.setProperties({ title: parts.join('_') })

  // Download PDF with correct filename
  doc.save(parts.join('_') + '.pdf')
}

export function generateScoringPdf(gameDay: GameDayResponse, games: GameData[], season: Season | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })

  const margin = 10
  const offWidth = 10
  const defWidth = 10

  // --- Page header ---
  let y = 10
  const headerTitle = `${gameDay.label || 'Spieltag'} - ${formatDate(gameDay.date)}${gameDay.location ? ` @ ${gameDay.location}` : ''}`
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(headerTitle, pageWidth / 2, y, { align: 'center' })
  y += 6

  for (let gi = 0; gi < games.length; gi++) {
    const { game, lineup, staff } = games[gi]
    const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)

    // Estimate height: header ~8 + table ~(rows+2)*6
    const rowCount = sorted.length || 1
    const estimatedHeight = 10 + (rowCount + 2) * 6
    if (y + estimatedHeight > pageHeight - 8) {
      doc.addPage()
      y = 10
    }

    // Game header
    let gameTitle = `Spiel ${game.gameNumber}`
    if (game.opponentTeam) gameTitle += ` vs ${game.opponentTeam.name}`

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(gameTitle, margin, y)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1, pageWidth - margin, y + 1)
    y += 3
    if (staff.length > 0) {
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      const staffText = staff.map(s => `${s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach'}: ${s.player.name}`).join('  ·  ')
      doc.text(staffText, margin, y)
      doc.setTextColor(0, 0, 0)
      y += 2
    }

    if (sorted.length === 0) { y += 3; continue }

    // Labels above table
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    // Calculate x positions for labels: offset by # (5) + Name (25) columns from left margin
    const offLabelX = margin + 5 + 25 + (7 * offWidth) / 2
    const defLabelX = margin + 5 + 25 + 7 * offWidth + 10 + (7 * defWidth) / 2
    doc.text('Offense', offLabelX, y, { align: 'center' })
    doc.text('Defense', defLabelX, y, { align: 'center' })
    y += 3

    // Combined table: #, Name, Offense 1-7, Pos, Defense 1-7
    const head = [['#', 'Name', '1', '2', '3', '4', '5', '6', '7', 'Pos', '1', '2', '3', '4', '5', '6', '7']]
    const rows = sorted.map(entry => {
      const name = entry.dhBatterPlayer
        ? `${entry.player.name} (DH: ${entry.dhBatterPlayer.name})`
        : entry.player.name
      return [String(entry.battingOrder), name, ...Array(7).fill(''), entry.position ?? '', ...Array(7).fill('')]
    })
    // Runs row at bottom
    rows.push(['', 'Runs', ...Array(7).fill(''), '', ...Array(7).fill('')])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 0.8, right: 0.8 }, lineColor: [180, 180, 180], lineWidth: 0.15, minCellHeight: 6, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 6, halign: 'center', cellPadding: 0.8, minCellHeight: 4 },
      columnStyles: {
        0: { cellWidth: 5, halign: 'center' },
        1: { cellWidth: 25, fontStyle: 'bold' },
        // Offense innings 1-7 (columns 2-8)
        2: { cellWidth: offWidth, halign: 'center' },
        3: { cellWidth: offWidth, halign: 'center' },
        4: { cellWidth: offWidth, halign: 'center' },
        5: { cellWidth: offWidth, halign: 'center' },
        6: { cellWidth: offWidth, halign: 'center' },
        7: { cellWidth: offWidth, halign: 'center' },
        8: { cellWidth: offWidth, halign: 'center' },
        // Position (column 9) — divider between offense and defense
        9: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        // Defense innings 1-7 (columns 10-16)
        10: { cellWidth: defWidth, halign: 'center' },
        11: { cellWidth: defWidth, halign: 'center' },
        12: { cellWidth: defWidth, halign: 'center' },
        13: { cellWidth: defWidth, halign: 'center' },
        14: { cellWidth: defWidth, halign: 'center' },
        15: { cellWidth: defWidth, halign: 'center' },
        16: { cellWidth: defWidth, halign: 'center' },
      },
      didDrawCell: (data) => {
        // Thicker borders around Position column to visually separate offense/defense
        if (data.column.index === 9 && data.cell.x != null) {
          doc.setDrawColor(0, 0, 0)
          doc.setLineWidth(0.5)
          doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height)
          doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
      },
      didParseCell: (data) => {
        // Runs summary row
        if (data.section === 'body' && data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [245, 245, 245]
        }
        // Position column with subtle background
        if (data.column.index === 9 && data.section !== 'head') {
          data.cell.styles.fillColor = [230, 230, 230]
        }
        // Lighter background for defense columns to visually separate
        if (data.section === 'body' && data.column.index >= 10 && data.column.index <= 16 && data.row.index < rows.length - 1) {
          data.cell.styles.fillColor = [245, 245, 245]
        }
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2

    // Bench
    const gameUsedIds = new Set<number>()
    for (const e of lineup) {
      gameUsedIds.add(e.player.id)
      if (e.dhBatterPlayer) gameUsedIds.add(e.dhBatterPlayer.id)
    }
    for (const s of staff) gameUsedIds.add(s.player.id)
    const bench = gameDay.availablePlayers.filter(p => !gameUsedIds.has(p.id))
    if (bench.length > 0) {
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Bank: ${bench.map(p => p.name).join(', ')}`, margin, y)
      doc.setTextColor(0, 0, 0)
      y += 2
    }

    y += 3
  }

  // Legend — split into offense (left) and defense (right)
  doc.setFontSize(6)
  const legendY = Math.min(y + 2, pageHeight - 30)

  const offLegend = ['S = Single', 'W = Walk', 'SO = Strikeout', 'ST = Steal', 'D = Double', 'T = Triple', 'HR = Home Run', 'HBP = Hit by Pitch', 'SAC = Sacrifice', 'BH = Bunt Hit']
  const defLegend = ['X = Out', 'E = Error', 'DP = Double Play', 'A = Assist (Wurf zum Out,', '     z.B. SS wirft zur 1B)']

  // Right-align legends at the right edge of their respective column groups
  const offRightX = margin + 5 + 25 + 7 * offWidth
  const defRightX = margin + 5 + 25 + 7 * offWidth + 10 + 7 * defWidth

  const drawLegendItem = (item: string, x: number, itemY: number) => {
    const eqIdx = item.indexOf(' = ')
    if (eqIdx > 0) {
      const abbr = item.substring(0, eqIdx)
      const rest = item.substring(eqIdx)
      doc.setFont('helvetica', 'bold')
      const abbrW = doc.getTextWidth(abbr)
      doc.setFont('helvetica', 'normal')
      const restW = doc.getTextWidth(rest)
      const startX = x - abbrW - restW
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(abbr, startX, itemY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(rest, startX + abbrW, itemY)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(item, x, itemY, { align: 'right' })
    }
  }

  // Offense legend
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Offense', offRightX, legendY, { align: 'right' })
  for (let i = 0; i < offLegend.length; i++) {
    drawLegendItem(offLegend[i], offRightX, legendY + (i + 1) * 3)
  }

  // Defense legend
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Defense', defRightX, legendY, { align: 'right' })
  for (let i = 0; i < defLegend.length; i++) {
    drawLegendItem(defLegend[i], defRightX, legendY + (i + 1) * 3)
  }
  doc.setTextColor(0, 0, 0)

  const parts = ['Scoring']
  if (gameDay.location) parts.push(gameDay.location)
  if (season) parts.push(`${season.name}_${season.year}`)
  doc.setProperties({ title: parts.join('_') })
  doc.save(parts.join('_') + '.pdf')
}
