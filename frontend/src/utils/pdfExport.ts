import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { GameDayResponse, LineupEntryResponse, GameStaffResponse, SubstitutionResponse, Season, CoachRotationPair } from '@/types'
import { FIELD_POSITIONS } from '@/types'
import { getPairLabel, resolveRotation } from './coachRotation'

/**
 * Returns a short display name suitable for the field diagram.
 * - Single-word name: returned as-is, truncated with `…` if longer than 14 chars
 * - Multi-word, last name ≤ 12 chars: last name only
 * - Multi-word, last name > 12 chars: `Initial. LastName`, truncated with `…` to fit
 */
export function getDisplayName(fullName: string): string {
  const MAX = 14
  const trimmed = fullName.trim()
  if (trimmed === '') return ''
  const parts = trimmed.split(/\s+/)
  const last = parts[parts.length - 1]

  // single word
  if (parts.length === 1) {
    return last.length > MAX ? last.slice(0, MAX) + '…' : last
  }

  // multi-word with short last name — last name fits, return as-is
  if (last.length <= 12) {
    return last
  }

  // long last name — use initial + last, truncate last
  const prefix = parts[0][0] + '. '
  const remaining = MAX - prefix.length // = 11
  return prefix + last.slice(0, remaining) + '…'
}

/** Position-Koordinaten in viewBox 100×95 (übernommen aus FieldView.tsx). */
const FIELD_COORDS: Record<string, { x: number; y: number }> = {
  CF: { x: 50, y: 8 },
  LF: { x: 14, y: 18 },
  RF: { x: 86, y: 18 },
  SS: { x: 33, y: 28 },
  '2B': { x: 67, y: 28 },
  '3B': { x: 16, y: 58 },
  '1B': { x: 84, y: 58 },
  P:  { x: 50, y: 52 },
  C:  { x: 50, y: 82 },
}

function drawFieldDiagram(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  lineup: LineupEntryResponse[],
  substitutions: SubstitutionResponse[],
): void {
  // Diamond in quadratische Sub-Box zeichnen, damit nicht verzerrt.
  // viewBox wird als 100×100 behandelt (FieldView's 100×95 viewBox enthält den
  // Diamond komfortabel auch in 100×100 — keine Verzerrung sichtbar).
  const s = Math.min(width, height)
  const subX = x + (width - s) / 2
  const subY = y

  const px = (vbX: number) => subX + (vbX / 100) * s
  const py = (vbY: number) => subY + (vbY / 100) * s

  // --- Baselines (Polygon Home → 1B → 2B → 3B → Home) ---
  doc.setDrawColor(30, 41, 59) // navy-900
  doc.setLineWidth(0.5)
  const home = [px(50), py(70)]
  const first = [px(72), py(50)]
  const second = [px(50), py(30)]
  const third = [px(28), py(50)]
  doc.line(home[0], home[1], first[0], first[1])
  doc.line(first[0], first[1], second[0], second[1])
  doc.line(second[0], second[1], third[0], third[1])
  doc.line(third[0], third[1], home[0], home[1])

  // --- Bases (4 kleine Diamonds, mittels doc.lines) ---
  doc.setFillColor(200, 46, 46)
  doc.setDrawColor(160, 30, 30) // softball-red-700
  doc.setLineWidth(0.2)
  const baseSize = (3 / 100) * s
  const drawRotatedBase = (cx: number, cy: number) => {
    const half = baseSize / 2
    // 4-Punkt Diamond via doc.lines (relative Deltas, geschlossen, fill+stroke).
    // Start: west (cx-half, cy). Pfad: west → north → east → south → close.
    doc.lines(
      [
        [half, -half],  // west → north
        [half,  half],  // north → east
        [-half, half],  // east → south
        [-half, -half], // south → west (close)
      ],
      cx - half, cy,
      [1, 1],
      'FD',
      true,
    )
  }
  drawRotatedBase(home[0], home[1])
  drawRotatedBase(first[0], first[1])
  drawRotatedBase(second[0], second[1])
  drawRotatedBase(third[0], third[1])

  // --- Player-Slots ---
  // Build maps from lineup
  const fielderByPos = new Map<string, LineupEntryResponse>()
  for (const e of lineup) {
    if (e.position && (FIELD_POSITIONS as readonly string[]).includes(e.position)) {
      fielderByPos.set(e.position, e)
    }
  }
  // Subs grouped by playerOut.id, sorted by inning ascending
  const subsByPlayerOut = new Map<number, SubstitutionResponse[]>()
  for (const sub of substitutions) {
    const arr = subsByPlayerOut.get(sub.playerOut.id) ?? []
    arr.push(sub)
    subsByPlayerOut.set(sub.playerOut.id, arr)
  }
  for (const arr of subsByPlayerOut.values()) arr.sort((a, b) => a.inning - b.inning)

  // Font-Sizes: skaliert auf s (78 mm Standard → 100% Skala)
  // pos-label 5pt, player 6.5pt, sub 4.5pt
  for (const pos of FIELD_POSITIONS) {
    const coord = FIELD_COORDS[pos]
    const cx = px(coord.x)
    const cy = py(coord.y)
    const entry = fielderByPos.get(pos)

    // Position-Label (rot, klein, oberhalb des Players)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5)
    doc.setTextColor(200, 46, 46)
    const posLabelY = entry ? cy - (s * 0.035) : cy - (s * 0.01)
    doc.text(pos, cx, posLabelY, { align: 'center' })

    if (entry) {
      // Player-Name (navy bold, unter Position)
      const displayName = getDisplayName(entry.player.name)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(30, 41, 59)
      doc.text(displayName, cx, cy + (s * 0.014), { align: 'center' })

      // Sub-Annotation (erste Sub für diesen Player), italic mini
      const subs = subsByPlayerOut.get(entry.player.id)
      if (subs && subs.length > 0) {
        const sub = subs[0]
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(4.5)
        doc.setTextColor(100, 116, 139) // navy-500-ish
        doc.text(
          `> ${getDisplayName(sub.playerIn.name)} (${sub.inning + 1}.)`,
          cx,
          cy + (s * 0.045),
          { align: 'center' },
        )
      }
    } else {
      // Leerer Slot — grauer Punkt
      doc.setFillColor(209, 213, 219) // gray-300
      doc.circle(cx, cy + (s * 0.02), s * 0.012, 'F')
    }
  }

  // Reset text color für nachfolgende Renders
  doc.setTextColor(0, 0, 0)
}

export interface GameData {
  game: {
    id: number
    gameNumber: number
    opponentTeam: { id: number; name: string } | null
    scoreUs: number | null
    scoreThem: number | null
    firstBaseCoachRotation?: CoachRotationPair | null
    thirdBaseCoachRotation?: CoachRotationPair | null
  }
  lineup: LineupEntryResponse[]
  staff: GameStaffResponse[]
  substitutions: SubstitutionResponse[]
}

/**
 * Kompakt 1-zeilig im gleichen Style wie "1B Coach: Mike".
 * Keine eigene Eyebrow — einfach Prefix "3B Coach Rotation:" + Beschreibung.
 * ASCII-only.
 */
function drawCoachRotationCompact(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  pair: CoachRotationPair,
  lineup: LineupEntryResponse[],
  baseLabel: '1B' | '3B',
): number {
  const resolved = resolveRotation(pair, lineup.map(e => ({
    battingOrder: e.battingOrder,
    position: e.position,
    player: { name: e.player.name },
  })))
  void w

  const cy = y + 2.5
  let cx = x

  // Prefix: "3B Coach: " (gleiche Optik wie "1B Coach: Mike")
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`${baseLabel} Coach: `, cx, cy)
  cx += doc.getTextWidth(`${baseLabel} Coach: `)

  // Primary fett navy
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(resolved.primary.name, cx, cy)
  cx += doc.getTextWidth(resolved.primary.name)

  // Separator
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text('. ', cx, cy)
  cx += doc.getTextWidth('. ')

  // Backup name fett navy
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(resolved.backup.name, cx, cy)
  cx += doc.getTextWidth(resolved.backup.name)

  // " coacht bei Schlag "
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(' coacht bei Schlag ', cx, cy)
  cx += doc.getTextWidth(' coacht bei Schlag ')

  // Range fett navy
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(resolved.backupCoverRange, cx, cy)
  cx += doc.getTextWidth(resolved.backupCoverRange)

  // Closing: "bis Dat vom Schlag zurück ist"
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`, bis ${resolved.primary.name} vom Schlag zurück ist.`, cx, cy)

  doc.setTextColor(0, 0, 0)
  return y + 4
}

function drawCoachRotationBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  pair: CoachRotationPair,
  lineup: LineupEntryResponse[],
  baseLabel: '1B' | '3B',
): number {
  const resolved = resolveRotation(pair, lineup.map(e => ({
    battingOrder: e.battingOrder,
    position: e.position,
    player: { name: e.player.name },
  })))
  const half = w / 2
  const blockH = 16

  // Eyebrow + Trennlinie rechts
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(200, 46, 46)
  doc.setCharSpace(1.2)
  const eyebrowText = `${baseLabel}-COACH ROTATION · ${getPairLabel(pair).toUpperCase()}`
  doc.text(eyebrowText, x, y + 3)
  const eyebrowW = doc.getTextWidth(eyebrowText)
  doc.setCharSpace(0)
  // Sports-Scorebook Trennlinie rechts der Eyebrow
  doc.setDrawColor(200, 46, 46)
  doc.setLineWidth(0.3)
  doc.line(x + eyebrowW + 2, y + 2.5, x + w, y + 2.5)
  let cursorY = y + 6

  // Linker Block: Primary (navy-dominant — der "Anchor"-Coach)
  doc.setFillColor(30, 41, 59)  // navy-900
  doc.rect(x, cursorY, half, blockH, 'F')
  // Rechter Block: Backup (cream sekundär)
  doc.setFillColor(248, 244, 232)  // cream-100
  doc.rect(x + half, cursorY, half, blockH, 'F')
  doc.setDrawColor(200, 46, 46)  // rote Trennlinie
  doc.setLineWidth(0.4)
  doc.line(x + half, cursorY, x + half, cursorY + blockH)

  // Primary Text (auf navy → weiß/rot)
  doc.setFontSize(7)
  doc.setTextColor(252, 165, 165)  // softball-red-300 hellrot
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text('PRIMARY · STEHT STANDARD', x + 2, cursorY + 4)
  doc.setCharSpace(0)
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(resolved.primary.name, x + 2, cursorY + 10)
  doc.setFontSize(6.5)
  doc.setFont('courier', 'normal')
  doc.setTextColor(220, 215, 200)  // cream
  doc.text(`#${resolved.primary.pos}`, x + 2, cursorY + 14)

  // Backup Text (auf cream → navy)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text(`BACKUP · SCHLAG ${resolved.backupCoverRange}`, x + half + 2, cursorY + 4)
  doc.setCharSpace(0)
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(resolved.backup.name, x + half + 2, cursorY + 10)
  doc.setFontSize(6.5)
  doc.setFont('courier', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`#${resolved.backup.pos}`, x + half + 2, cursorY + 14)

  cursorY += blockH + 3

  // Erklärung
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(
    `${resolved.backup.name} coacht Schlag ${resolved.backupCoverRange} (${resolved.primary.name} wärmt auf + schlägt ${resolved.primaryAbSlot})`,
    x, cursorY,
  )
  cursorY += 3
  doc.text(
    `Falls ${resolved.primary.name} nach Schlag auf Base: ${resolved.backup.name} bleibt bis Rueckkehr zur Bank`,
    x, cursorY,
  )
  doc.setTextColor(0, 0, 0)
  return cursorY + 4
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
  for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
    const { game, lineup, staff } = games[gameIndex]
    // Page break after every 3 games or when running out of space
    if (gameIndex > 0 && gameIndex % 3 === 0) {
      doc.addPage()
      y = 15
      // Repeat header on new page
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(title + location, pageWidth / 2, y, { align: 'center' })
      y += 10
    } else if (y > 260) {
      doc.addPage()
      y = 15
    }

    // Game header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    let gameTitle = `Spiel ${game.gameNumber}`
    if (game.opponentTeam) gameTitle += ` vs ${game.opponentTeam.name}`

    doc.text(gameTitle, contentLeft, y)
    doc.setDrawColor(30, 41, 59) // navy
    doc.setLineWidth(0.5)
    doc.line(contentLeft, y + 1, contentRight, y + 1)
    y += 4

    // Staff (with substitution info if a coach gets subbed in)
    if (staff.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      const { substitutions: gameSubs } = games[gameIndex]
      const subInIds = new Map(gameSubs.map(s => [s.playerIn.id, s]))
      const staffText = staff.map(s => {
        const roleLabel = s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach'
        const sub = subInIds.get(s.player.id)
        if (sub) {
          return `${roleLabel}: ${s.player.name} (${sub.playerOut.name} ab ${sub.inning + 1}. Inning)`
        }
        return `${roleLabel}: ${s.player.name}`
      }).join('  ·  ')
      doc.text(staffText, contentLeft, y)
      doc.setTextColor(0, 0, 0)
      y += 3
    }

    // Coach-Rotation-Boxen (wenn Coach-Staff-Slot leer und Rotation gesetzt)
    const has1BCoach = staff.some(s => s.role === 'BASE_COACH_1ST')
    const has3BCoach = staff.some(s => s.role === 'BASE_COACH_3RD')
    if (!has1BCoach && game.firstBaseCoachRotation) {
      y = drawCoachRotationBox(doc, contentLeft, y, contentWidth, game.firstBaseCoachRotation, lineup, '1B') + 1
    }
    if (!has3BCoach && game.thirdBaseCoachRotation) {
      y = drawCoachRotationBox(doc, contentLeft, y, contentWidth, game.thirdBaseCoachRotation, lineup, '3B') + 1
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
    const { substitutions } = games[gameIndex]
    const subsByPlayerOut = new Map<number, SubstitutionResponse[]>()
    for (const sub of substitutions) {
      const arr = subsByPlayerOut.get(sub.playerOut.id) ?? []
      arr.push(sub)
      subsByPlayerOut.set(sub.playerOut.id, arr)
    }

    const rows = sorted.map(entry => {
      let name = entry.player.name
      if (entry.dhBatterPlayer) name += ` (DH: ${entry.dhBatterPlayer.name})`
      const subs = subsByPlayerOut.get(entry.player.id)
      if (subs) {
        for (const sub of subs.sort((a, b) => a.inning - b.inning)) {
          name += `  (${sub.playerIn.name} ab ${sub.inning + 1}. Inning)`
        }
      }
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
    for (const sub of substitutions) gameUsedIds.add(sub.playerIn.id)
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
  const offWidth = 8
  const defWidth = 13.4

  // --- Page header ---
  let y = 10
  const headerTitle = `${gameDay.label || 'Spieltag'} - ${formatDate(gameDay.date)}${gameDay.location ? ` @ ${gameDay.location}` : ''}`
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(headerTitle, pageWidth / 2, y, { align: 'center' })
  y += 6

  for (let gi = 0; gi < games.length; gi++) {
    const { game, lineup, staff, substitutions } = games[gi]
    const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)
    const subsByPlayerOut = new Map<number, SubstitutionResponse[]>()
    for (const sub of substitutions) {
      const arr = subsByPlayerOut.get(sub.playerOut.id) ?? []
      arr.push(sub)
      subsByPlayerOut.set(sub.playerOut.id, arr)
    }

    // Page break after every 3 games or when running out of space
    const subRowCount = substitutions.length
    const rowCount = (sorted.length || 1) + subRowCount
    const estimatedHeight = 10 + (rowCount + 2) * 6
    if (gi > 0 && gi % 3 === 0) {
      doc.addPage()
      y = 10
      // Repeat header on new page
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(headerTitle, pageWidth / 2, y, { align: 'center' })
      y += 6
    } else if (y + estimatedHeight > pageHeight - 8) {
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
      const scoringSubInIds = new Map(substitutions.map(s => [s.playerIn.id, s]))
      const staffText = staff.map(s => {
        const roleLabel = s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach'
        const sub = scoringSubInIds.get(s.player.id)
        if (sub) {
          return `${roleLabel}: ${s.player.name} (${sub.playerOut.name} ab ${sub.inning + 1}. Inning)`
        }
        return `${roleLabel}: ${s.player.name}`
      }).join('  ·  ')
      doc.text(staffText, margin, y)
      doc.setTextColor(0, 0, 0)
      y += 2
    }

    // Coach-Rotation-Boxen
    {
      const has1BCoach = staff.some(s => s.role === 'BASE_COACH_1ST')
      const has3BCoach = staff.some(s => s.role === 'BASE_COACH_3RD')
      const fullW = pageWidth - 2 * margin
      if (!has1BCoach && game.firstBaseCoachRotation) {
        y = drawCoachRotationBox(doc, margin, y, fullW, game.firstBaseCoachRotation, lineup, '1B') + 1
      }
      if (!has3BCoach && game.thirdBaseCoachRotation) {
        y = drawCoachRotationBox(doc, margin, y, fullW, game.thirdBaseCoachRotation, lineup, '3B') + 1
      }
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
    const rows: string[][] = []
    const subRowIndices = new Set<number>()
    for (const entry of sorted) {
      const name = entry.dhBatterPlayer
        ? `${entry.player.name} (DH: ${entry.dhBatterPlayer.name})`
        : entry.player.name
      rows.push([String(entry.battingOrder), name, ...Array(7).fill(''), entry.position ?? '', ...Array(7).fill('')])
      // Add substitution rows
      const subs = subsByPlayerOut.get(entry.player.id)
      if (subs) {
        for (const sub of subs.sort((a, b) => a.inning - b.inning)) {
          subRowIndices.add(rows.length)
          rows.push(['', `${sub.playerIn.name} (ab ${sub.inning + 1}. Inning)`, ...Array(7).fill(''), entry.position ?? '', ...Array(7).fill('')])
        }
      }
    }
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
        // Substitution rows — lighter style
        if (data.section === 'body' && subRowIndices.has(data.row.index)) {
          data.cell.styles.textColor = [100, 100, 100]
          data.cell.styles.fontSize = 6
          data.cell.styles.fillColor = [250, 250, 250]
        }
        // Position column with subtle background
        if (data.column.index === 9 && data.section !== 'head') {
          data.cell.styles.fillColor = [230, 230, 230]
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
    for (const sub of substitutions) gameUsedIds.add(sub.playerIn.id)
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

export function generateLineupWithFieldPdf(
  gameDay: GameDayResponse,
  games: GameData[],
  season: Season | null,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10
  const lineupWidth = 70
  const fieldWidth = 78
  const fieldHeight = 78
  const gap = 12
  // Block (Lineup + Gap + Feld) horizontal zentrieren
  const blockWidth = lineupWidth + gap + fieldWidth
  const lineupX = (pageWidth - blockWidth) / 2
  const fieldX = lineupX + lineupWidth + gap

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })

  const headerTitle =
    `${gameDay.label || 'Spieltag'} - ${formatDate(gameDay.date)}` +
    (gameDay.location ? ` @ ${gameDay.location}` : '')

  const drawPageHeader = (y: number) => {
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(headerTitle, pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }

  let y = 12
  drawPageHeader(y)
  y += 8

  for (let gi = 0; gi < games.length; gi++) {
    const { game, lineup, staff, substitutions } = games[gi]

    // Page-Break nach jeweils 3 Games
    if (gi > 0 && gi % 3 === 0) {
      doc.addPage()
      y = 12
      drawPageHeader(y)
      y += 8
    }

    // --- Game-Header ---
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    let gameTitle = `Spiel ${game.gameNumber}`
    if (game.opponentTeam) gameTitle += ` vs ${game.opponentTeam.name}`
    doc.text(gameTitle, lineupX, y)
    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1, pageWidth - margin, y + 1)
    doc.setTextColor(0, 0, 0)
    y += 4

    // --- Coach-Zeilen (3B zuerst weil wichtiger, 1B danach) ---
    // Jede Base bekommt eine Zeile: entweder Staff-Coach oder Rotation aus Lineup.
    const subInIds = new Map(substitutions.map(s => [s.playerIn.id, s]))
    const fullW = pageWidth - 2 * margin

    const drawStaffLine = (baseLabel: '1B' | '3B', staffMember: GameStaffResponse): void => {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      const sub = subInIds.get(staffMember.player.id)
      const text = sub
        ? `${baseLabel} Coach: ${staffMember.player.name} (${sub.playerOut.name} ab ${sub.inning + 1}. Inning)`
        : `${baseLabel} Coach: ${staffMember.player.name}`
      doc.text(text, lineupX, y + 2.5)
      doc.setTextColor(0, 0, 0)
    }

    const drawCoachRow = (baseLabel: '1B' | '3B'): void => {
      const role = baseLabel === '1B' ? 'BASE_COACH_1ST' : 'BASE_COACH_3RD'
      const staffMember = staff.find(s => s.role === role)
      const rotation = baseLabel === '1B' ? game.firstBaseCoachRotation : game.thirdBaseCoachRotation
      if (staffMember) {
        drawStaffLine(baseLabel, staffMember)
        y += 3.5
      } else if (rotation) {
        y = drawCoachRotationCompact(doc, lineupX, y, fullW, rotation, lineup, baseLabel)
      }
    }

    drawCoachRow('1B')
    drawCoachRow('3B')

    const contentTopY = y
    let lineupBottomY = contentTopY

    // --- Lineup-Tabelle links ---
    if (lineup.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text('Kein Lineup', lineupX, y + 4)
      doc.setTextColor(0, 0, 0)
      lineupBottomY = contentTopY + 6
    } else {
      const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)
      const subsByPlayerOut = new Map<number, SubstitutionResponse[]>()
      for (const sub of substitutions) {
        const arr = subsByPlayerOut.get(sub.playerOut.id) ?? []
        arr.push(sub)
        subsByPlayerOut.set(sub.playerOut.id, arr)
      }

      const rows = sorted.map(entry => {
        let name = entry.player.name
        if (entry.dhBatterPlayer) name += ` (DH: ${entry.dhBatterPlayer.name})`
        const subs = subsByPlayerOut.get(entry.player.id)
        if (subs) {
          for (const sub of subs.sort((a, b) => a.inning - b.inning)) {
            name += `  (${sub.playerIn.name} ab ${sub.inning + 1}. Inning)`
          }
        }
        return [String(entry.battingOrder), name, entry.position ?? '']
      })

      autoTable(doc, {
        startY: y,
        margin: { left: lineupX, right: pageWidth - (lineupX + lineupWidth) },
        head: [],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.2 },
        rowPageBreak: 'avoid',  // verhindert Split der Lineup-Rows über Seitenwechsel
        columnStyles: {
          0: { cellWidth: 8, halign: 'right', textColor: [150, 150, 150], font: 'courier' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 14, halign: 'right', font: 'courier', fontStyle: 'bold' },
        },
      })
      lineupBottomY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
    }

    // --- Feld-Diagram rechts ---
    drawFieldDiagram(doc, fieldX, contentTopY, fieldWidth, fieldHeight, lineup, substitutions)

    // --- Bench-Line (direkt unter Lineup-Tabelle, nicht erst unter Feld) ---
    const gameUsedIds = new Set<number>()
    for (const e of lineup) {
      gameUsedIds.add(e.player.id)
      if (e.dhBatterPlayer) gameUsedIds.add(e.dhBatterPlayer.id)
    }
    for (const s of staff) gameUsedIds.add(s.player.id)
    for (const sub of substitutions) gameUsedIds.add(sub.playerIn.id)
    const bench = gameDay.availablePlayers.filter(p => !gameUsedIds.has(p.id))
    let benchBottomY = lineupBottomY
    if (bench.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`Bank: ${bench.map(p => p.name).join(', ')}`, lineupX, lineupBottomY + 3)
      doc.setTextColor(0, 0, 0)
      benchBottomY = lineupBottomY + 6
    }

    // Nächster Block startet unter dem größeren Element (Feld vs Lineup+Bank) + Abstand
    y = Math.max(benchBottomY, contentTopY + fieldHeight) + 4
  }

  // --- Filename + PDF-Properties ---
  const parts = ['Aufstellung']
  if (gameDay.location) parts.push(gameDay.location)
  if (season) parts.push(`${season.name}_${season.year}`)
  doc.setProperties({ title: parts.join('_') })
  doc.save(parts.join('_') + '.pdf')
}

/**
 * Anwesenheits-/Unterschriften-Liste für einen Spieltag: alle Spieler nummeriert
 * untereinander mit leerem Unterschrift-Feld daneben. Header mit Spieltag (wann/wo).
 */
export function generateSignatureListPdf(
  gameDay: GameDayResponse,
  players: { id: number; name: string }[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 18

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(10, 15, 92) // navy-900
  doc.text('Anwesenheitsliste', pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(70, 70, 70)
  const sub = `${gameDay.label || 'Spieltag'} · ${formatDate(gameDay.date)}`
    + (gameDay.location ? ` · ${gameDay.location}` : '')
  doc.text(sub, pageWidth / 2, y, { align: 'center' })
  y += 8

  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const body: string[][] = sorted.map((p, i) => [String(i + 1), p.name, ''])
  // Leerzeilen für Gäste/Nachzügler
  for (let i = 0; i < 4; i++) body.push([String(sorted.length + i + 1), '', ''])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Name', 'Unterschrift']],
    body,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, minCellHeight: 11, valign: 'middle', lineColor: [210, 210, 210], lineWidth: 0.2, textColor: [20, 20, 20] },
    headStyles: { fillColor: [10, 15, 92], textColor: 255, fontStyle: 'bold', fontSize: 10, halign: 'left' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', textColor: [120, 120, 120] },
      1: { cellWidth: 72, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
    },
    margin: { left: 20, right: 20 },
  })

  const parts = ['Anwesenheit', gameDay.label || 'Spieltag', gameDay.date]
  if (gameDay.location) parts.push(gameDay.location)
  doc.setProperties({ title: parts.join('_') })
  doc.save(parts.join('_') + '.pdf')
}
