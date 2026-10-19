import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CoachBillingProfile } from '@/types'
import type { BillingRow } from './coachBilling'
import { amount, billedRows, clockLabel, endTime, monthLabel, totalHours, weekdayName } from './coachBilling'

/**
 * Der Abrechnungsbogen des Hochschulsports, ausgefuellt.
 *
 * Nachgebaut wird hier nichts: `trainerabrechnung-vorlage.pdf` **ist** das
 * Originalformular. Es steckte in der von Hand beschrifteten PDF — deren blaue
 * Werte waren Notiz-Rechtecke obendrauf, nicht Teil der Seite. Abgezogen bleibt
 * der leere Bogen, und die App schreibt nur noch hinein.
 *
 * Die Koordinaten unten sind an den Beschriftungen der Vorlage gemessen (PDF-Punkte,
 * Nullpunkt unten links). Sie gehoeren zu **dieser** Vorlage — wird sie je durch eine
 * neue Fassung des Hochschulsports ersetzt, muessen sie neu gemessen werden.
 */

/** Dieselbe Schrift, in der der Bogen gesetzt ist. */
const SIZE = 11
const SIZE_DATE = 8.5

/** Blau wie die bisherigen Eintraege von Hand — hebt das Ausgefuellte vom Formular ab. */
const INK = rgb(0.06, 0.22, 0.6)

const HEADER = {
  lastName: { x: 112, y: 776.4 },
  firstName: { x: 347, y: 776.4 },
  street: { x: 116, y: 741.8 },
  zip: { x: 315, y: 741.8 },
  city: { x: 392, y: 741.8 },
  sportCourse: { x: 120, y: 572.7 },
  month: { x: 384, y: 572.7 },
} as const

/**
 * Grundlinien der elf Zeilen, oben beginnend.
 *
 * Schon umgerechnet: die Vorlage misst von oben, pdf-lib zeichnet von unten
 * (A4 = 841,92 pt hoch).
 */
const ROW_BASELINES = [525.2, 502.1, 479.2, 456.2, 433.1, 410.2, 387.1, 364.1, 341.2, 318.1, 295.2]

const COLUMN = { weekday: 103, date: 220, from: 287, to: 341, hours: 414 } as const

const FOOTER = {
  totalHours: { x: 300, y: 231.6 },
  hourlyRate: { x: 196, y: 198.3 },
  amount: { x: 440, y: 198.3 },
  signedOn: { x: 76, y: 165 },
  signature: { x: 145, y: 157, width: 95, height: 32 },
} as const

function deDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Betrag deutsch: 180 wird `180,00`. */
function deAmount(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

/** Stunden ohne unnoetige Null: 3, aber 2,5 wenn es halbe sind. */
function deHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
}

export type AbrechnungInput = {
  profile: CoachBillingProfile
  /** `YYYY-MM` */
  yearMonth: string
  rows: BillingRow[]
  /** Datum unter der Unterschrift, `YYYY-MM-DD`. */
  signedOn: string
}

export async function buildTrainerabrechnungPdf(input: AbrechnungInput): Promise<Uint8Array> {
  const { profile, yearMonth, rows, signedOn } = input

  const vorlage = await fetch('/trainerabrechnung-vorlage.pdf')
  if (!vorlage.ok) throw new Error('Die Vorlage des Abrechnungsbogens ist nicht erreichbar.')
  const pdf = await PDFDocument.load(await vorlage.arrayBuffer())
  const page = pdf.getPages()[0]
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  const write = (text: string, x: number, y: number, size = SIZE) => {
    if (!text) return
    page.drawText(text, { x, y, size, font, color: INK })
  }

  write(profile.lastName, HEADER.lastName.x, HEADER.lastName.y)
  write(profile.firstName, HEADER.firstName.x, HEADER.firstName.y)
  write(profile.street, HEADER.street.x, HEADER.street.y)
  write(profile.zip, HEADER.zip.x, HEADER.zip.y)
  write(profile.city, HEADER.city.x, HEADER.city.y)
  write(profile.sportCourse, HEADER.sportCourse.x, HEADER.sportCourse.y)
  write(monthLabel(yearMonth), HEADER.month.x, HEADER.month.y)

  const gebucht = billedRows(rows)
  gebucht.slice(0, ROW_BASELINES.length).forEach((row, index) => {
    const y = ROW_BASELINES[index]
    write(weekdayName(row.date), COLUMN.weekday, y)
    write(deDate(row.date), COLUMN.date, y, SIZE_DATE)
    write(clockLabel(row.from), COLUMN.from, y)
    write(clockLabel(endTime(row.from, row.hours)), COLUMN.to, y)
    write(deHours(row.hours), COLUMN.hours, y)
  })

  const stunden = totalHours(gebucht)
  const satz = Number(profile.hourlyRate)
  write(deHours(stunden), FOOTER.totalHours.x, FOOTER.totalHours.y)
  write(deAmount(satz), FOOTER.hourlyRate.x, FOOTER.hourlyRate.y)
  write(deAmount(amount(stunden, satz)), FOOTER.amount.x, FOOTER.amount.y)
  write(deDate(signedOn), FOOTER.signedOn.x, FOOTER.signedOn.y, SIZE_DATE)

  if (profile.signaturePng) {
    const bild = await pdf.embedPng(profile.signaturePng)
    // In die Flaeche einpassen, Seitenverhaeltnis behalten — eine gestauchte
    // Unterschrift sieht gefaelscht aus.
    const faktor = Math.min(FOOTER.signature.width / bild.width, FOOTER.signature.height / bild.height)
    page.drawImage(bild, {
      x: FOOTER.signature.x,
      y: FOOTER.signature.y,
      width: bild.width * faktor,
      height: bild.height * faktor,
    })
  }

  return pdf.save()
}

/** Dateiname in der Schreibweise, in der die Bogen bisher abgelegt wurden. */
export function abrechnungFileName(profile: CoachBillingProfile, yearMonth: string): string {
  return `Trainerabrechnung-Verein_Softball_${profile.lastName}_${monthLabel(yearMonth)}-${yearMonth.slice(0, 4)}.pdf`
}

export function mailSubject(yearMonth: string): string {
  return `Trainerabrechnung ${monthLabel(yearMonth)} ${yearMonth.slice(0, 4)}`
}

export function mailBody(profile: CoachBillingProfile, yearMonth: string): string {
  const anrede = profile.recipientName?.trim()
  return `${anrede ? `Hallo ${anrede},` : 'Hallo,'}\n\n`
    + `anbei schicke ich die Trainerabrechnung vom ${monthLabel(yearMonth)}.\n\n`
    + `Viele Grüße\n${profile.firstName}`
}

/** Fuer die Vorschau und zum Herunterladen. */
export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
