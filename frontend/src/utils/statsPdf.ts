import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PlayerBattingStatsResponse } from '@/types'

export const COLOR_NAVY: [number, number, number] = [30, 41, 59]
export const COLOR_NAVY_SOFT: [number, number, number] = [71, 85, 105]
export const COLOR_RED: [number, number, number] = [200, 46, 46]
export const COLOR_CREAM_TINT: [number, number, number] = [250, 246, 235]
export const COLOR_GRAY_LINE: [number, number, number] = [220, 215, 200]
export const COLOR_GRAY_TEXT: [number, number, number] = [120, 120, 120]
export const COLOR_GRAY_MUTED: [number, number, number] = [160, 160, 160]

export function formatDec(val: number): string {
  return val.toFixed(3).replace(/^0\./, '.')
}

function formatTimestamp(): string {
  return new Date().toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function safeFilename(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p))
    .map(s => s.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter(Boolean)
    .join('_')
}

export function drawPageHeader(
  doc: jsPDF,
  title: string,
  contextLabel: string,
  eyebrow = 'DEAD SOX · STATISTIK',
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  // Eyebrow: tiny uppercase brand tag above title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_RED)
  doc.setCharSpace(0.8)
  doc.text(eyebrow, margin, 14)
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

export function applyFootersToAllPages(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooter(doc, i, total)
  }
}

/**
 * Eigene, hoehere Schwelle fuer die AVG-Fuehrung im Kopfblock. Die Tabelle qualifiziert ab
 * 5 At-Bats — fuer eine Rangliste reicht das, fuer eine herausgestellte "Bester Schlaeger"-Zahl
 * nicht: 1.000 aus 5 AB ist Rauschen und stand vorher gross und rot ueber der Seite, waehrend
 * der tatsaechlich beste Schlaeger (.846 aus 13 AB) darunter in der Tabelle verschwand.
 */
const LEADER_MIN_AB = 10

interface Leader {
  label: string
  name: string
  value: string
  /** Zusatz unter dem Namen, z.B. die Stichprobe — macht die Zahl pruefbar. */
  note?: string
}

/** Fuehrender je Kategorie. Gleichstand: mehr At-Bats gewinnt, dann alphabetisch. */
function pickLeaders(stats: PlayerBattingStatsResponse[]): Leader[] {
  const best = (
    candidates: PlayerBattingStatsResponse[],
    metric: (s: PlayerBattingStatsResponse) => number,
  ): PlayerBattingStatsResponse | undefined =>
    [...candidates].sort((a, b) =>
      metric(b) - metric(a) || b.atBats - a.atBats || a.playerName.localeCompare(b.playerName),
    )[0]

  const leaders: Leader[] = []

  // AVG nur aus Spielern mit belastbarer Stichprobe. Gibt es keinen, faellt die Schwelle weg —
  // dann macht die mitgedruckte AB-Zahl die Schwaeche sichtbar, statt sie zu verstecken.
  const avgPool = stats.filter(s => s.atBats >= LEADER_MIN_AB)
  const avgLeader = best(avgPool.length > 0 ? avgPool : stats.filter(s => s.atBats > 0),
                         s => Number(s.battingAverage))
  if (avgLeader) {
    leaders.push({
      label: 'AVG',
      name: avgLeader.playerName,
      value: formatDec(Number(avgLeader.battingAverage)),
      note: `${avgLeader.atBats} AB`,
    })
  }

  const counting: [string, (s: PlayerBattingStatsResponse) => number][] = [
    ['HR', s => s.homeRuns],
    ['RBI', s => s.runsBattedIn],
    ['SB', s => s.stolenBases],
  ]
  for (const [label, metric] of counting) {
    const leader = best(stats, metric)
    if (leader && metric(leader) > 0) {
      leaders.push({ label, name: leader.playerName, value: String(metric(leader)) })
    }
  }

  return leaders
}

/**
 * Kopfblock mit den Fuehrenden je Kategorie. Ersetzt den frueheren Einzel-Hero, der die volle
 * Seitenbreite fuer zwei Datenpunkte belegte und dabei Zeile 1 der Tabelle wiederholte.
 */
function drawLeadersBand(doc: jsPDF, startY: number, leaders: Leader[]): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const boxX = margin
  const boxY = startY
  const boxW = pageWidth - 2 * margin
  const boxH = 19

  doc.setFillColor(...COLOR_NAVY)
  doc.rect(boxX, boxY, boxW, boxH, 'F')
  doc.setFillColor(...COLOR_RED)
  doc.rect(boxX, boxY, 2.4, boxH, 'F')

  const innerX = boxX + 8
  const innerW = boxW - 14
  const cellW = innerW / leaders.length

  leaders.forEach((leader, i) => {
    const x = innerX + i * cellW

    // Trennstrich zwischen den Zellen — nur zwischen, nicht aussen.
    if (i > 0) {
      doc.setDrawColor(80, 92, 120)
      doc.setLineWidth(0.2)
      doc.line(x - 4, boxY + 4, x - 4, boxY + boxH - 4)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(255, 190, 190)
    doc.setCharSpace(0.8)
    doc.text(leader.label, x, boxY + 5.5)
    doc.setCharSpace(0)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(255, 255, 255)
    doc.text(leader.value, x, boxY + 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(205, 210, 230)
    const nameLine = doc.splitTextToSize(leader.name, cellW - 6)[0] ?? leader.name
    doc.text(nameLine, x, boxY + 16.5)

    if (leader.note) {
      doc.setFontSize(6)
      doc.setTextColor(150, 160, 190)
      doc.text(leader.note, x + cellW - 6, boxY + 16.5, { align: 'right' })
    }
  })

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
  22,   // Spieler — Vornamen im Team sind kurz (<= 8 Zeichen); 30 mm liessen die Spalte halb
        //           leer stehen. Laengere Namen werden ellipsiert, nicht umgebrochen.
  7.5,  // PA
  7.5,  // AB
  7,    // H
  7.4,  // 1B
  7.4,  // 2B
  7.4,  // 3B
  7.4,  // HR
  7.4,  // R
  7.4,  // BB
  8,    // HBP
  7.4,  // K
  7.4,  // SB
  7.4,  // CS
  7.4,  // PO
  8,    // RBI
  9.5,  // AVG  ← ab hier die Quotenwerte, siehe RATE_COLUMN_START
  9.5,  // OBP
  9.5,  // SLG
  9.5,  // OPS
] as const

/**
 * Erste Quotenspalte (AVG). Die vier Quotenwerte AVG/OBP/SLG/OPS stehen zusammen rechts, weil
 * man sie miteinander vergleicht — vorher stand AVG an Position 6 und war von OBP/SLG/OPS durch
 * zwoelf Zaehlspalten getrennt, was die Tabelle unscanbar machte. Vor dieser Spalte laeuft eine
 * feine senkrechte Trennlinie.
 */
const RATE_COLUMN_START = 17

/** X-Position der Trennlinie: linker Rand plus alle Zaehlspalten davor. */
const RATE_DIVIDER_OFFSET = COL_WIDTHS
  .slice(0, RATE_COLUMN_START)
  .reduce((sum, w) => sum + w, 0)

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
    // Kopfzelle linksbuendig wie die Namen darunter — headStyles zentriert sonst alles, was
    // ueber einer linksbuendigen Spalte schief aussieht.
    1: { cellWidth: COL_WIDTHS[1], fontStyle: 'bold', overflow: 'ellipsize', halign: 'left' },
  }
  const boldColumns = new Set([RATE_COLUMN_START, 20]) // AVG, OPS
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

  const leaders = pickLeaders(sorted)
  if (leaders.length > 0) {
    y = drawLeadersBand(doc, y, leaders)
  }

  const head = [[
    '#', 'Spieler', 'PA', 'AB', 'H', '1B', '2B', '3B', 'HR', 'R',
    'BB', 'HBP', 'K', 'SB', 'CS', 'PO', 'RBI', 'AVG', 'OBP', 'SLG', 'OPS',
  ]]

  const rows = sorted.map((s, idx) => [
    String(idx + 1),
    s.playerName,
    String(s.plateAppearances),
    String(s.atBats),
    String(s.hits),
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
    formatDec(Number(s.battingAverage)),
    // OBP als Dezimalwert wie AVG/SLG/OPS. Vorher als Prozent ("87%") — dieselbe Art von Zahl
    // in zwei Notationen, und im Softball ist die Dezimalform die Konvention.
    formatDec(Number(s.onBasePct)),
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
      // Zeilenhoehe nutzt den freien Platz nach unten — die Seite war zu etwa 40 % leer,
      // waehrend die Zeilen eng standen. Reicht bis ~20 Spieler auf einer Seite.
      cellPadding: { top: 2.9, bottom: 2.9, left: 1.2, right: 1.2 },
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
      // Senkrechte Trennung zwischen Zaehl- und Quotenspalten. Zeile fuer Zeile gezeichnet,
      // damit sie ueber Seitenumbrueche hinweg genau so hoch ist wie die Tabelle.
      if (data.column.index === RATE_COLUMN_START) {
        const dividerColor: [number, number, number] =
          data.section === 'head' ? [90, 100, 130] : COLOR_GRAY_LINE
        doc.setDrawColor(...dividerColor)
        doc.setLineWidth(0.2)
        const x = margin + RATE_DIVIDER_OFFSET
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }
    },
    // Kein roter Hervorhebung von Zeile 1 mehr. Die Tabelle ist nach AVG sortiert, und ein
    // Spieler mit 5 At-Bats kann dort oben stehen — rot markiert las sich das als "bester
    // Schlaeger" und widersprach dem Kopfblock, der die Fuehrenden mit belastbarer Stichprobe
    // nennt. Zwei verschiedene Aussagen zum Besten auf einer Seite. Der Rang steht jetzt nur
    // noch in der #-Spalte, behauptet wird nichts.
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
