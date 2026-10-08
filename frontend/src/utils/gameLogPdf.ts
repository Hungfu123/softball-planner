import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  AtBatResult,
  BattingSlotStats,
  InningLog,
  LineupEntryResponse,
  TeamGameLogResponse,
} from '@/types'
import {
  applyFootersToAllPages,
  COLOR_CREAM_TINT,
  COLOR_GRAY_LINE,
  COLOR_GRAY_MUTED,
  COLOR_GRAY_TEXT,
  COLOR_NAVY,
  COLOR_RED,
  drawPageHeader,
  formatDec,
  safeFilename,
} from './statsPdf'

const MARGIN = 14
const CONTENT_WIDTH = 210 - 2 * MARGIN

/** Kurz-Notation je Ergebnis — dieselben Kürzel wie in der Schlagfolge auf der Seite. */
export const RESULT_SHORT: Record<AtBatResult, string> = {
  SINGLE: '1B',
  DOUBLE: '2B',
  TRIPLE: '3B',
  HOMERUN: 'HR',
  INSIDE_PARK_HR: 'HR',
  WALK: 'BB',
  HIT_BY_PITCH: 'HBP',
  STRIKEOUT: 'K',
  OUT: 'Out',
  REACHED_ON_ERROR: 'ROE',
  AUTOMATIC_OUT: 'AO',
}

/** Schlagfolge eines Innings als eine Zeile: "Khang BB > Anne 1B+1 > Hung Out".
 *  ASCII-Pfeil statt →, weil die Standard-PDF-Fonts (WinAnsi) keinen Pfeil können. */
export function inningChainText(inning: InningLog): string {
  return (inning.atBats ?? [])
    .map(ab => `${ab.batter} ${RESULT_SHORT[ab.result]}${ab.runsScored > 0 ? `+${ab.runsScored}` : ''}`)
    .join(' > ')
}

/** S/N/U aus dem Spielstand, '–' wenn kein Ergebnis eingetragen ist. */
export function resultLetter(log: TeamGameLogResponse): string {
  if (log.scoreUs == null || log.scoreThem == null) return '–'
  return log.scoreUs > log.scoreThem ? 'S' : log.scoreUs < log.scoreThem ? 'N' : 'U'
}

/* Spaltenbreiten in mm — einzige Quelle pro Tabelle. Jede Summe muss in die Inhaltsbreite
   (PAGE_CONTENT_WIDTH = 182 mm) passen und sie weitgehend ausnutzen, siehe gameLogPdf.test.ts. */
export const KPI_COL_WIDTHS = [70, 112] as const
export const KPI_TABLE_WIDTH = KPI_COL_WIDTHS.reduce((s, w) => s + w, 0)

export const OVERVIEW_COL_WIDTHS = [20, 50, 36, 20, 12, 12, 12, 12] as const
export const OVERVIEW_TABLE_WIDTH = OVERVIEW_COL_WIDTHS.reduce((s, w) => s + w, 0)

export const SLOT_COL_WIDTHS = [10, 10, 10, 8, 8, 8, 8, 9, 9, 9, 12, 12, 69] as const
export const SLOT_TABLE_WIDTH = SLOT_COL_WIDTHS.reduce((s, w) => s + w, 0)

export const INNING_COL_WIDTHS = [10, 10, 10, 10, 10, 12, 30, 90] as const
export const INNING_TABLE_WIDTH = INNING_COL_WIDTHS.reduce((s, w) => s + w, 0)

export const AGG_COL_WIDTHS = [120, 62] as const
export const AGG_TABLE_WIDTH = AGG_COL_WIDTHS.reduce((s, w) => s + w, 0)

function fmtDate(d: string | null): string {
  if (!d) return '–'
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function lastAutoTableY(doc: jsPDF, fallback: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback
}

/** Seitenumbruch, wenn weniger als `needed` mm bis zum Footer (16 mm) übrig sind. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 16) {
    doc.addPage()
    return 20
  }
  return y
}

/** Abschnitts-Titel mit kurzem roten Akzent darunter. */
function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLOR_NAVY)
  doc.text(text, MARGIN, y)
  doc.setDrawColor(...COLOR_RED)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y + 1.5, MARGIN + 18, y + 1.5)
  return y + 7
}

/** Rechtsbündige Zahlenspalte in Courier — wie in statsPdf. */
function numericCol(width: number, bold = false) {
  return {
    cellWidth: width,
    halign: 'right' as const,
    font: 'courier' as const,
    ...(bold ? { fontStyle: 'bold' as const } : {}),
  }
}

/** Aufstellung eines Spiels als eine Zeile: "1. Khang (P) · 2. Anne (SS) · 3. Hung (C) [DH: Max]". */
export function lineupText(entries: LineupEntryResponse[] | undefined): string | null {
  if (!entries || entries.length === 0) return null
  return [...entries]
    .sort((a, b) => a.battingOrder - b.battingOrder)
    .map(e => {
      let s = `${e.battingOrder}. ${e.player?.name ?? '?'}`
      if (e.position) s += ` (${e.position})`
      if (e.dhBatterPlayer) s += ` [DH: ${e.dhBatterPlayer.name}]`
      return s
    })
    .join(' · ')
}

export interface GameLogPdfOptions {
  logs: TeamGameLogResponse[]
  lineups?: Map<number, LineupEntryResponse[]>
  slots?: BattingSlotStats[] | null
  contextLabel: string
  scopeLabel: string
}

export function generateGameLogPdf({ logs, lineups, slots, contextLabel, scopeLabel }: GameLogPdfOptions): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawPageHeader(doc, 'Spiel-Verlauf', contextLabel, 'DEAD SOX · SPIEL-VERLAUF')

  const baseStyles = {
    fontSize: 7.5,
    cellPadding: { top: 2.2, bottom: 2.2, left: 1.2, right: 1.2 },
    lineColor: COLOR_GRAY_LINE,
    lineWidth: 0,
    textColor: COLOR_NAVY,
    overflow: 'linebreak' as const,
  }
  const headStyles = {
    fillColor: COLOR_NAVY,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 7,
    halign: 'center' as const,
    cellPadding: { top: 2.2, bottom: 2.2, left: 1.2, right: 1.2 },
    lineWidth: 0,
  }

  // --- Kennzahlen (gleiche Aggregation wie die Kennzahlen-Leiste auf der Seite) ---
  const evaluated = logs.filter(l => l.hasAtBatData)
  const decided = logs.filter(l => l.scoreUs != null && l.scoreThem != null)
  const wins = decided.filter(l => (l.scoreUs ?? 0) > (l.scoreThem ?? 0)).length
  const losses = decided.filter(l => (l.scoreUs ?? 0) < (l.scoreThem ?? 0)).length
  const ties = decided.length - wins - losses
  const hits = evaluated.reduce((s, l) => s + l.hits, 0)
  const runs = logs.reduce((s, l) => s + (l.scoreUs ?? 0), 0)
  const onBase = evaluated.reduce((s, l) => s + l.onBase, 0)
  const pa = evaluated.reduce((s, l) => s + l.plateAppearances, 0)
  const lob = evaluated.reduce((s, l) => s + l.leftOnBase, 0)

  y = sectionTitle(doc, y, 'Kennzahlen')
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    head: [['Kennzahl', 'Wert']],
    body: [
      ['Spiele (davon ausgewertet)', `${logs.length} (${evaluated.length})`],
      ['Bilanz (S-N-U)', `${wins}-${losses}-${ties}`],
      ['Runs gesamt', String(runs)],
      ['Hits gesamt', String(hits)],
      ['Ø Hits pro ausgewertetem Spiel', evaluated.length ? (hits / evaluated.length).toFixed(1) : '–'],
      ['Auf Base gekommen', `${onBase} von ${pa} PA (${pa ? Math.round((onBase / pa) * 100) : 0} %)`],
      ['Hängengeblieben (LOB)', String(lob)],
      ['Ø LOB pro ausgewertetem Spiel', evaluated.length ? (lob / evaluated.length).toFixed(1) : '–'],
    ],
    theme: 'plain',
    styles: baseStyles,
    headStyles,
    alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
    columnStyles: {
      0: { cellWidth: KPI_COL_WIDTHS[0], fontStyle: 'bold' },
      1: { cellWidth: KPI_COL_WIDTHS[1], font: 'courier' },
    },
  })
  y = lastAutoTableY(doc, y) + 8

  // --- Spiele-Übersicht ---
  y = ensureSpace(doc, y, 30)
  y = sectionTitle(doc, y, 'Spiele-Übersicht')
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    head: [['Datum', 'Gegner', 'Liga', 'Ergebnis', 'H', 'BB', 'LOB', 'PA']],
    body: logs.map(l => [
      fmtDate(l.date),
      l.opponent ?? '?',
      l.league ?? '–',
      l.scoreUs != null && l.scoreThem != null ? `${l.scoreUs}:${l.scoreThem} (${resultLetter(l)})` : '–',
      l.hasAtBatData ? String(l.hits) : '–',
      l.hasAtBatData ? String(l.walks) : '–',
      l.hasAtBatData ? String(l.leftOnBase) : '–',
      l.hasAtBatData ? String(l.plateAppearances) : '–',
    ]),
    theme: 'plain',
    styles: baseStyles,
    headStyles,
    alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
    columnStyles: {
      0: { cellWidth: OVERVIEW_COL_WIDTHS[0], font: 'courier' },
      1: { cellWidth: OVERVIEW_COL_WIDTHS[1] },
      2: { cellWidth: OVERVIEW_COL_WIDTHS[2] },
      3: { cellWidth: OVERVIEW_COL_WIDTHS[3], font: 'courier', halign: 'right' },
      4: numericCol(OVERVIEW_COL_WIDTHS[4]),
      5: numericCol(OVERVIEW_COL_WIDTHS[5]),
      6: numericCol(OVERVIEW_COL_WIDTHS[6]),
      7: numericCol(OVERVIEW_COL_WIDTHS[7]),
    },
  })
  y = lastAutoTableY(doc, y) + 8

  // --- Lineup-Plätze ---
  if (slots && slots.length > 0) {
    y = ensureSpace(doc, y, 40)
    y = sectionTitle(doc, y, `Lineup-Plätze (${scopeLabel})`)
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      head: [['Platz', 'PA', 'AB', 'H', '2B', '3B', 'HR', 'BB', 'HBP', 'K', 'AVG', 'OBP', 'Besetzung']],
      body: [...slots].sort((a, b) => a.slot - b.slot).map(s => [
        `${s.slot}.`,
        String(s.plateAppearances),
        String(s.atBats),
        String(s.hits),
        String(s.doubles),
        String(s.triples),
        String(s.homeRuns),
        String(s.walks),
        String(s.hitByPitch),
        String(s.strikeouts),
        formatDec(Number(s.battingAverage)),
        formatDec(Number(s.onBasePct)),
        (s.players ?? []).slice(0, 4)
          .map(p => `${p.name} ${p.plateAppearances}× · ${p.plateAppearances > 0 ? Math.round((p.onBase / p.plateAppearances) * 100) : 0} %`)
          .join(', '),
      ]),
      theme: 'plain',
      styles: baseStyles,
      headStyles,
      alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
      columnStyles: {
        0: { cellWidth: SLOT_COL_WIDTHS[0], halign: 'right', font: 'courier', textColor: COLOR_GRAY_MUTED },
        1: numericCol(SLOT_COL_WIDTHS[1]),
        2: numericCol(SLOT_COL_WIDTHS[2]),
        3: numericCol(SLOT_COL_WIDTHS[3]),
        4: numericCol(SLOT_COL_WIDTHS[4]),
        5: numericCol(SLOT_COL_WIDTHS[5]),
        6: numericCol(SLOT_COL_WIDTHS[6]),
        7: numericCol(SLOT_COL_WIDTHS[7]),
        8: numericCol(SLOT_COL_WIDTHS[8]),
        9: numericCol(SLOT_COL_WIDTHS[9]),
        10: numericCol(SLOT_COL_WIDTHS[10], true),
        11: numericCol(SLOT_COL_WIDTHS[11], true),
        12: { cellWidth: SLOT_COL_WIDTHS[12] },
      },
    })
    y = lastAutoTableY(doc, y) + 8
  }

  // --- Gestrandete Runner & Out-Macher über die ganze Auswahl ---
  const strandedTotals = new Map<string, number>()
  const outMakerCounts = new Map<string, number>()
  for (const l of logs) {
    for (const s of l.stranded) {
      strandedTotals.set(s.playerName, (strandedTotals.get(s.playerName) ?? 0) + s.times)
    }
    for (const inn of l.innings) {
      if (inn.stranded.length > 0 && inn.outMaker) {
        outMakerCounts.set(inn.outMaker, (outMakerCounts.get(inn.outMaker) ?? 0) + 1)
      }
    }
  }
  if (strandedTotals.size > 0) {
    y = ensureSpace(doc, y, 30)
    y = sectionTitle(doc, y, 'Auf Base hängen geblieben (gesamt)')
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      head: [['Spieler', '× gestrandet']],
      body: [...strandedTotals.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name, times]) => [name, String(times)]),
      theme: 'plain',
      styles: baseStyles,
      headStyles,
      alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
      columnStyles: {
        0: { cellWidth: AGG_COL_WIDTHS[0] },
        1: numericCol(AGG_COL_WIDTHS[1]),
      },
    })
    y = lastAutoTableY(doc, y) + 8
  }
  if (outMakerCounts.size > 0) {
    y = ensureSpace(doc, y, 30)
    y = sectionTitle(doc, y, 'Letztes Aus bei Runnern auf Base')
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      head: [['Spieler', '× Out-Macher']],
      body: [...outMakerCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name, times]) => [name, String(times)]),
      theme: 'plain',
      styles: baseStyles,
      headStyles,
      alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
      columnStyles: {
        0: { cellWidth: AGG_COL_WIDTHS[0] },
        1: numericCol(AGG_COL_WIDTHS[1]),
      },
    })
    y = lastAutoTableY(doc, y) + 8
  }

  // --- Spiele im Detail: Innings, Schlagfolgen, Lineup ---
  y = ensureSpace(doc, y, 30)
  y = sectionTitle(doc, y, 'Spiele im Detail')
  for (const l of logs) {
    y = ensureSpace(doc, y, 55)

    // Spiel-Kopf
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...COLOR_NAVY)
    const headerLine = `${fmtDate(l.date)} · vs ${l.opponent ?? '?'}${l.league ? ` · ${l.league}` : ''} · ${
      l.scoreUs != null && l.scoreThem != null ? `${l.scoreUs}:${l.scoreThem} (${resultLetter(l)})` : 'kein Ergebnis'
    }`
    const headerLines = doc.splitTextToSize(headerLine, CONTENT_WIDTH) as string[]
    doc.text(headerLines, MARGIN, y)
    y += 4.4 * headerLines.length + 1

    if (!l.hasAtBatData) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...COLOR_GRAY_MUTED)
      doc.text('Nicht ausgewertet — keine Schlag-Daten.', MARGIN + 2, y)
      y += 5
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...COLOR_GRAY_TEXT)
      doc.text(
        `${l.hits} H (${l.doubles}×2B, ${l.triples}×3B, ${l.homeRuns}×HR) · ${l.walks} BB · ${l.hitByPitch} HBP · ${l.strikeouts} K · ${l.leftOnBase} LOB · ${l.plateAppearances} PA`,
        MARGIN, y)
      y += 5

      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN, bottom: 16 },
        head: [['Inn', 'R', 'H', 'OB', 'BB', 'Aus', 'Out durch', 'Hängengeblieben']],
        body: l.innings.map(inn => [
          String(inn.inning),
          String(inn.runs),
          String(inn.hits),
          String(inn.onBase),
          String(inn.walks),
          String(inn.outs),
          inn.outMaker ?? '–',
          inn.stranded.length > 0 ? inn.stranded.join(', ') : '–',
        ]),
        theme: 'plain',
        styles: baseStyles,
        headStyles,
        alternateRowStyles: { fillColor: COLOR_CREAM_TINT },
        columnStyles: {
          0: numericCol(INNING_COL_WIDTHS[0]),
          1: numericCol(INNING_COL_WIDTHS[1]),
          2: numericCol(INNING_COL_WIDTHS[2]),
          3: numericCol(INNING_COL_WIDTHS[3]),
          4: numericCol(INNING_COL_WIDTHS[4]),
          5: numericCol(INNING_COL_WIDTHS[5]),
          6: { cellWidth: INNING_COL_WIDTHS[6] },
          7: { cellWidth: INNING_COL_WIDTHS[7] },
        },
      })
      y = lastAutoTableY(doc, y) + 2

      // Schlagfolgen — die Zeile pro Inning beantwortet "wer stand wann am Schlag?"
      for (const inn of l.innings) {
        const chain = inningChainText(inn)
        if (!chain) continue
        const wrapped = doc.splitTextToSize(`I${inn.inning}: ${chain}`, CONTENT_WIDTH - 2) as string[]
        y = ensureSpace(doc, y, 3.4 * wrapped.length + 1)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...COLOR_GRAY_TEXT)
        doc.text(wrapped, MARGIN + 2, y)
        y += 3.4 * wrapped.length + 0.5
      }
    }

    // Lineup (falls geladen)
    const lineupStr = lineupText(lineups?.get(l.gameId))
    if (lineupStr) {
      const wrapped = doc.splitTextToSize(`Lineup: ${lineupStr}`, CONTENT_WIDTH - 2) as string[]
      y = ensureSpace(doc, y, 3.4 * wrapped.length + 1)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLOR_GRAY_MUTED)
      doc.text(wrapped, MARGIN + 2, y)
      y += 3.4 * wrapped.length + 0.5
    }
    y += 5
  }

  // --- Legende ---
  const legend = 'Kürzel: 1B Single · 2B Double · 3B Triple · HR Homerun · BB Walk · HBP Hit by Pitch · K Strikeout · ROE Reached on Error · AO Automatic Out · PA Plate Appearances · AB At Bats · OB On Base · LOB Left on Base · S Sieg · N Niederlage · U Unentschieden · DH Designated Hitter'
  const legendLines = doc.splitTextToSize(legend, CONTENT_WIDTH) as string[]
  y = ensureSpace(doc, y + 2, 3.2 * legendLines.length + 2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_GRAY_TEXT)
  doc.text(legendLines, MARGIN, y)

  applyFootersToAllPages(doc)
  const fname = safeFilename(['Spiel-Verlauf', scopeLabel, contextLabel])
  doc.setProperties({ title: fname })
  doc.save(fname + '.pdf')
}
