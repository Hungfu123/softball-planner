import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InvitationResponse } from '@/types'

let cachedLogo: string | null = null
async function loadLogo(): Promise<string | null> {
  if (cachedLogo) return cachedLogo
  try {
    const res = await fetch('/deadsox.png')
    const blob = await res.blob()
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
    return cachedLogo
  } catch { return null }
}

function deDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function deDateLong(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}
function joinTeams(teams: string[]): string {
  const t = teams.filter(Boolean)
  if (t.length <= 1) return t.join('')
  return `${t.slice(0, -1).join(', ')} und ${t[t.length - 1]}`
}

export async function buildInvitationPdf(inv: InvitationResponse): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Briefkopf
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text('Düsseldorf Dead Sox', left, y); y += 5
  doc.text('Heinrich-Heine-Universität Düsseldorf', left, y); y += 5
  doc.text(`Düsseldorf, ${deDate(inv.letterDate)}`, left, y)

  const logo = await loadLogo()
  if (logo) doc.addImage(logo, 'PNG', pageWidth - 20 - 22, 16, 22, 22)
  y += 14

  // Titel
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text('Einladung', left, y); y += 8
  doc.setFontSize(11)
  doc.text(`Zum ${inv.title} in Düsseldorf am Samstag, den ${deDate(inv.eventDate)}`, left, y); y += 9

  // Begrüßung + Intro
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text(`Hallo ${joinTeams(inv.guestTeams)},`, left, y); y += 7
  const intro = `wir laden euch herzlich zum ${inv.title} am ${deDateLong(inv.eventDate)} in Düsseldorf ein.`
  for (const line of doc.splitTextToSize(intro, pageWidth - 2 * left)) { doc.text(line, left, y); y += 6 }
  y += 3

  // Spielplan
  doc.setFont('helvetica', 'bold'); doc.text('Spielplan:', left, y); y += 2
  const colA = inv.pairingMode === 'TEAM_1_2' ? 'Team 1' : 'Heim'
  const colB = inv.pairingMode === 'TEAM_1_2' ? 'Team 2' : 'Gast'
  autoTable(doc, {
    startY: y + 2,
    margin: { left, right: left },
    head: [['', colA, colB, 'Ump']],
    body: inv.games.map(g => [g.time ?? '', g.teamA ?? '', g.teamB ?? '', g.ump ?? '']),
    theme: 'striped',
    headStyles: { fillColor: [19, 40, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 2.4, textColor: [25, 35, 55], lineColor: [222, 216, 198], lineWidth: 0.1 },
    alternateRowStyles: { fillColor: [244, 238, 222] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 } },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // Body-Text (Anfahrt + leibliches Wohl) — frei umbrochen
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  for (const para of (inv.bodyText ?? '').split('\n')) {
    if (para.trim() === '') { y += 3; continue }
    for (const line of doc.splitTextToSize(para, pageWidth - 2 * left)) { doc.text(line, left, y); y += 6 }
  }
  y += 4

  // Fixer Schluss
  doc.text('Wir freuen uns auf euch', left, y); y += 6
  doc.text('Eure Düsseldorf Dead Sox', left, y); y += 10

  // Kontakt
  doc.setFont('helvetica', 'bold'); doc.text('Kontakt', left, y); y += 6
  doc.setFont('helvetica', 'normal')
  for (const c of inv.contacts) {
    const parts = [c.name, c.email, c.phone].filter(Boolean).join(', ')
    doc.text(`${c.role ? c.role + ': ' : ''}${parts}`, left, y); y += 5
  }

  return doc
}

export async function generateInvitationPdf(inv: InvitationResponse): Promise<void> {
  const doc = await buildInvitationPdf(inv)
  const year = inv.eventDate ? inv.eventDate.slice(0, 4) : ''
  const safeTitle = (inv.title || 'Einladung').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_')
  doc.save(`Einladung_${safeTitle}${year ? '_' + year : ''}.pdf`)
}
