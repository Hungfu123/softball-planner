import { jsPDF } from 'jspdf'
import type { TrainingPlanResponse, DrillResponse } from '@/types'

const NAVY = [17, 27, 107] as const    // navy-800
const GRAY = [100, 100, 100] as const
const LIGHT_GRAY = [160, 160, 160] as const
const BG_LIGHT = [245, 246, 250] as const
const WHITE = [255, 255, 255] as const

export function generateTrainingPlanPdf(
  plan: TrainingPlanResponse,
  drills: DrillResponse[],
  trainingDate: string,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const ml = 18 // margin left
  const mr = 18
  const cw = pw - ml - mr // content width
  let y = 0

  const rgb = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2])
  const fillRgb = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2])
  const drawRgb = (c: readonly number[]) => doc.setDrawColor(c[0], c[1], c[2])

  const needsPage = (h: number) => {
    if (y + h > ph - 20) { doc.addPage(); y = 18; return true }
    return false
  }

  const wrap = (text: string, maxW: number): string[] =>
    doc.splitTextToSize(text, maxW) as string[]

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

  // ===================== TITLE BAR =====================
  fillRgb(NAVY)
  doc.rect(0, 0, pw, 32, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  rgb(WHITE)
  doc.text('Trainingsplan', ml, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(formatDate(trainingDate), ml, 23)

  // Right side: meta
  doc.setFontSize(9)
  const meta = `${plan.playerCount} Spieler  ·  ${plan.focus}  ·  ${plan.durationMinutes} min`
  doc.text(meta, pw - mr, 23, { align: 'right' })

  y = 40

  // ===================== OVERALL NOTES =====================
  if (plan.content?.overallNotes) {
    fillRgb(BG_LIGHT)
    const noteLines = wrap(plan.content.overallNotes, cw - 12)
    const nh = noteLines.length * 4.2 + 8
    doc.roundedRect(ml, y, cw, nh, 2, 2, 'F')
    doc.setFontSize(8.5)
    rgb(NAVY)
    let ny = y + 5
    for (const line of noteLines) {
      doc.text(line, ml + 6, ny)
      ny += 4.2
    }
    rgb([0, 0, 0])
    y += nh + 6
  }

  // ===================== GROUP HINT =====================
  if (plan.content?.groupDistributionHint) {
    doc.setFontSize(8)
    rgb(LIGHT_GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text('Gruppenaufteilung: ', ml, y)
    const labelW = doc.getTextWidth('Gruppenaufteilung: ')
    doc.setFont('helvetica', 'normal')
    const hintLines = wrap(plan.content.groupDistributionHint, cw - labelW)
    doc.text(hintLines[0], ml + labelW, y)
    for (let i = 1; i < hintLines.length; i++) {
      y += 3.8
      doc.text(hintLines[i], ml, y)
    }
    rgb([0, 0, 0])
    y += 7
  }

  // ===================== SECTIONS =====================
  const sections = plan.content?.sections ?? []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null

    // Estimate height needed
    needsPage(40)

    // ---------- Separator line ----------
    if (i > 0) {
      drawRgb([220, 220, 220])
      doc.line(ml, y, ml + cw, y)
      y += 6
    }

    // ---------- Section number circle ----------
    fillRgb(NAVY)
    doc.circle(ml + 3.5, y + 0.5, 3.5, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    rgb(WHITE)
    doc.text(`${i + 1}`, ml + 3.5, y + 1.3, { align: 'center' })

    // ---------- Type badge ----------
    const typeLabel = section.sectionType === 'WARMUP' ? 'Aufwärmen'
      : section.sectionType === 'BATTING' ? 'Batting'
      : section.sectionType === 'GAME' ? 'Spiel'
      : section.sectionType === 'KI_VORSCHLAG' ? 'KI-Vorschlag'
      : 'Drill'

    const badgeColor = section.sectionType === 'WARMUP' ? [255, 237, 213]
      : section.sectionType === 'BATTING' ? [220, 252, 231]
      : section.sectionType === 'GAME' ? [237, 233, 254]
      : section.sectionType === 'KI_VORSCHLAG' ? [254, 243, 199]
      : [224, 231, 255]

    const badgeText = section.sectionType === 'WARMUP' ? [180, 83, 9]
      : section.sectionType === 'BATTING' ? [22, 101, 52]
      : section.sectionType === 'GAME' ? [107, 33, 168]
      : section.sectionType === 'KI_VORSCHLAG' ? [161, 98, 7]
      : [45, 59, 160]

    doc.setFontSize(7)
    const badgeW = doc.getTextWidth(typeLabel) + 5
    fillRgb(badgeColor as unknown as readonly number[])
    doc.roundedRect(ml + 10, y - 2.5, badgeW, 5.5, 1.5, 1.5, 'F')
    rgb(badgeText as unknown as readonly number[])
    doc.setFont('helvetica', 'bold')
    doc.text(typeLabel, ml + 12.5, y + 0.8)

    // ---------- Duration ----------
    doc.setFontSize(8)
    rgb(LIGHT_GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(`${section.durationMinutes ?? '?'} min`, ml + 10 + badgeW + 3, y + 0.8)

    // ---------- Handbuch ref ----------
    if (drill?.pdfPage) {
      doc.setFontSize(7.5)
      rgb(LIGHT_GRAY)
      doc.text(`Handbuch S. ${drill.pdfPage}`, pw - mr, y + 0.8, { align: 'right' })
    }

    y += 7

    // ---------- Title ----------
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    rgb([0, 0, 0])
    doc.text(section.title ?? '', ml + 10, y)
    y += 6

    // ---------- Description ----------
    if (drill?.description) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      const descLines = drill.description.split('\n')
      for (const line of descLines) {
        const trimmed = line.trim()
        if (!trimmed) { y += 2; continue }

        needsPage(6)

        // Headers: Phase, Teil, Station, Variante, Wichtig, Ablauf...
        const isHeader = /^(Phase \d+|Teil \d+|Variante \d+|Station \d+|Wichtig|Ablauf|Grundposition|Fokus|Regel|Grundtechnik)\s*[—–:\s]/.test(trimmed)

        if (isHeader) {
          y += 1.5
          // Split: Label fett, Rest normal
          const colonIdx = trimmed.indexOf(':')
          if (colonIdx > 0) {
            const label = trimmed.substring(0, colonIdx + 1)
            const rest = trimmed.substring(colonIdx + 1).trim()
            doc.setFont('helvetica', 'bold')
            rgb([0, 0, 0])
            doc.text(label, ml + 10, y)
            y += 4
            if (rest) {
              doc.setFont('helvetica', 'normal')
              rgb(GRAY)
              const rLines = wrap(rest, cw - 12)
              for (const rl of rLines) { doc.text(rl, ml + 10, y); y += 4 }
            }
          } else {
            doc.setFont('helvetica', 'bold')
            rgb([0, 0, 0])
            doc.text(trimmed, ml + 10, y)
            y += 4
          }
          doc.setFont('helvetica', 'normal')
        } else if (/^[\d]+\.\s/.test(trimmed) || trimmed.startsWith('- ')) {
          rgb(GRAY)
          const iLines = wrap(trimmed, cw - 18)
          for (const il of iLines) { doc.text(il, ml + 14, y); y += 4 }
        } else {
          rgb(GRAY)
          const tLines = wrap(trimmed, cw - 12)
          for (const tl of tLines) { doc.text(tl, ml + 10, y); y += 4 }
        }
      }
      y += 1
    }

    // ---------- Equipment / Rotation (subtle) ----------
    if (drill && (drill.equipment.length > 0 || drill.rotation)) {
      doc.setFontSize(7.5)
      rgb(LIGHT_GRAY)
      if (drill.equipment.length > 0) {
        needsPage(5)
        doc.text(`Equipment: ${drill.equipment.join(', ')}`, ml + 10, y)
        y += 3.5
      }
      if (drill.rotation) {
        needsPage(5)
        const rLines = wrap(`Rotation: ${drill.rotation}`, cw - 12)
        for (const rl of rLines) { doc.text(rl, ml + 10, y); y += 3.5 }
      }
      y += 1
    }

    // ---------- KI Coaching (compact, only key fields) ----------
    const hasCoaching = section.rotationPlan || section.adaptationNotes || section.groupSetup
    if (hasCoaching) {
      needsPage(12)
      fillRgb(BG_LIGHT)
      const coachFields: string[] = []
      if (section.rotationPlan) coachFields.push(`Rotation: ${section.rotationPlan}`)
      if (section.adaptationNotes) coachFields.push(`Anpassung: ${section.adaptationNotes}`)
      if (section.groupSetup) coachFields.push(`Gruppen: ${section.groupSetup}`)

      const coachText = coachFields.join('\n')
      const coachLines = wrap(coachText, cw - 22)
      const ch = coachLines.length * 3.8 + 6

      doc.roundedRect(ml + 10, y, cw - 10, ch, 1.5, 1.5, 'F')
      doc.setFontSize(7.5)
      rgb(GRAY)
      let cy = y + 4
      for (const cl of coachLines) {
        doc.text(cl, ml + 14, cy)
        cy += 3.8
      }
      y += ch + 3
    }

    y += 3
  }

  // ===================== FOOTER =====================
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    rgb(LIGHT_GRAY)
    doc.text('Dead Sox — Trainingsplan', ml, ph - 8)
    doc.text(`Seite ${p} / ${pageCount}`, pw - mr, ph - 8, { align: 'right' })
  }

  // Save
  const dateStr = trainingDate.replace(/-/g, '')
  doc.save(`trainingsplan-${dateStr}.pdf`)
}
