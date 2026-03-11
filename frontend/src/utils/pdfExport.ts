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

    doc.text(gameTitle, 15, y)
    doc.setDrawColor(30, 41, 59) // navy
    doc.setLineWidth(0.5)
    doc.line(15, y + 1, pageWidth - 15, y + 1)
    y += 4

    // Staff
    if (staff.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      const staffText = staff.map(s => `${s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach'}: ${s.player.name}`).join('  ·  ')
      doc.text(staffText, 15, y)
      doc.setTextColor(0, 0, 0)
      y += 3
    }

    if (lineup.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text('Kein Lineup', 15, y)
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
      margin: { left: 15, right: 15 },
      head: [],
      body: rows,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'right', textColor: [150, 150, 150], font: 'courier' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 12, halign: 'right', font: 'courier', fontStyle: 'bold' },
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
      doc.text(`Bank: ${bench.map(p => p.name).join(', ')}`, 15, y)
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
