import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '@/api/client'
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'
import { useCoachBilling } from '@/hooks/useCoachBilling'
import type { TrainingResponse } from '@/types'
import { CoachProfileSheet } from './CoachProfileSheet'
import {
  amount, billedRows, defaultMonth, endTime, fillToMax, isWinterMonth, MAX_FORM_ROWS,
  monthLabel, monthOptions, primaryHours, suggestRows, totalHours, weekdayName, withFrom,
  withHours, type BillingRow,
} from './coachBilling'
import {
  abrechnungFileName, buildTrainerabrechnungPdf, mailBody, mailSubject, pdfBlob,
} from './trainerabrechnungPdf'

function heute(): string {
  return new Date().toISOString().slice(0, 10)
}

function deDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const PFEIL = 'w-11 h-11 shrink-0 rounded-xl border border-cream-300 text-navy-900 text-xl leading-none '
  + 'disabled:opacity-25 cursor-pointer hover:bg-navy-800 hover:text-white hover:border-navy-800'

function euro(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} EUR`
}

/** Spalte mit den Stunden einer Zeile: minus, Zahl, plus. */
function HourStepper({ row, onChange }: { row: BillingRow; onChange: (hours: number) => void }) {
  const knopf = 'w-11 h-11 rounded-xl border border-cream-300 text-navy-900 text-lg leading-none '
    + 'disabled:opacity-25 cursor-pointer hover:bg-navy-800 hover:text-white hover:border-navy-800'
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => onChange(row.hours - 1)}
        disabled={row.hours === 0}
        aria-label={`Eine Stunde weniger am ${deDate(row.date)}`}
        className={knopf}
      >
        –
      </button>
      <span
        key={row.hours}
        className="count-pop w-9 text-center font-display text-base font-bold text-navy-900 tabular-nums"
      >
        {row.hours}
      </span>
      <button
        onClick={() => onChange(row.hours + 1)}
        aria-label={`Eine Stunde mehr am ${deDate(row.date)}`}
        className={knopf}
      >
        +
      </button>
    </div>
  )
}

export function TrainerabrechnungPage() {
  const { profile, loading: profilLaedt, save } = useCoachBilling()
  const toast = useToastContext()
  const [trainings, setTrainings] = useState<TrainingResponse[] | null>(null)
  const [month, setMonth] = useState(defaultMonth())
  const [rows, setRows] = useState<BillingRow[]>([])
  const [stammdatenOffen, setStammdatenOffen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getTrainings().then(setTrainings).catch((e: Error) => toast.show(e.message, 'error'))
  }, [toast])

  const maxHours = profile?.maxHours ?? 12
  const monate = useMemo(() => monthOptions(), [])
  const monatIndex = monate.indexOf(month)

  // Monatswechsel wirft den Vorschlag neu — die Stunden des alten Monats sagen
  // ueber den neuen nichts aus.
  useEffect(() => {
    if (!trainings) return
    setRows(suggestRows(trainings, month, maxHours))
  }, [trainings, month, maxHours])

  const gebucht = useMemo(() => billedRows(rows), [rows])
  const stunden = totalHours(rows)
  const satz = Number(profile?.hourlyRate ?? 0)
  const zuViele = gebucht.length > MAX_FORM_ROWS
  const ohneZeit = gebucht.filter(row => !row.from).length
  const kuenftig = gebucht.filter(row => row.date > heute()).length
  const ueberDeckel = stunden > maxHours

  async function baueBogen() {
    if (!profile) throw new Error('Stammdaten fehlen')
    return buildTrainerabrechnungPdf({ profile, yearMonth: month, rows, signedOn: heute() })
  }

  async function teilen() {
    if (!profile) return
    setBusy(true)
    try {
      const bytes = await baueBogen()
      const name = abrechnungFileName(profile, month)
      const blob = pdfBlob(bytes)
      const text = mailBody(profile, month)
      const datei = new File([blob], name, { type: 'application/pdf' })

      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: mailSubject(month), text })
        toast.show('Geteilt — der Mailtext steht schon drin')
        return
      }

      // Kein Teilen-Menue (Desktop): herunterladen, Text in die Zwischenablage.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      await navigator.clipboard?.writeText(text).catch(() => {})
      toast.show('PDF geladen, Mailtext in der Zwischenablage')
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') toast.show((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function vorschau() {
    if (!profile) return
    // Der Tab muss im Klick aufgehen. Erst bauen und dann oeffnen, laesst ihn vom
    // Popup-Blocker schlucken — das Fenster gilt dann nicht mehr als Nutzerwunsch.
    // Ohne `noopener`, weil window.open damit laut Standard **null** liefert: die
    // PDF landete dann im aktuellen Tab und die Seite war weg. Stattdessen wird
    // `opener` gleich danach gekappt.
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    setBusy(true)
    try {
      const bytes = await baueBogen()
      const url = URL.createObjectURL(pdfBlob(bytes))
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (e: unknown) {
      tab?.close()
      toast.show((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (profilLaedt || !trainings) return <LoadingSkeleton />

  return (
    // Platz unten fuer die Leiste, die ueber dem Inhalt liegt.
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-28">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/orga" className="text-xs text-gray-500 hover:text-navy-900">‹ Orga</Link>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">
            Trainerabrechnung
          </h1>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0 mt-4" onClick={() => setStammdatenOffen(true)}>
          Stammdaten
        </Button>
      </div>

      {!profile ? (
        <Card padding="lg">
          <EmptyState
            title="Noch keine Stammdaten"
            description="Anschrift, Sportkurs, Stundensatz und Unterschrift fehlen — danach baut die App den Bogen allein."
          />
          <Button variant="navy" className="w-full mt-3" onClick={() => setStammdatenOffen(true)}>
            Jetzt eintragen
          </Button>
        </Card>
      ) : (
        <>
          <Card padding="lg" className="space-y-3">
            <div>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Monat
              </span>
              {/* Schrittschalter statt Auswahlliste: abgerechnet wird der Monat davor,
                  hoechstens ein, zwei Schritte daneben. Sechzehn Eintraege in einer
                  nativen Liste sind am Handy ein Katalog fuer einen Griff. */}
              <div className="mt-1 flex max-w-[15rem] items-center justify-between gap-2">
                <button
                  onClick={() => setMonth(monate[monatIndex + 1])}
                  disabled={monatIndex >= monate.length - 1}
                  aria-label="Einen Monat zurück"
                  className={PFEIL}
                >
                  ‹
                </button>
                <span aria-live="polite" className="font-display text-base font-bold text-navy-900 tabular-nums">
                  {monthLabel(month)} {month.slice(0, 4)}
                </span>
                <button
                  onClick={() => setMonth(monate[monatIndex - 1])}
                  disabled={monatIndex <= 0}
                  aria-label="Einen Monat weiter"
                  className={PFEIL}
                >
                  ›
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {isWinterMonth(month) ? 'Winter' : 'Sommer'}: Donnerstag {primaryHours(month)} Stunden,
              der Rest verteilt sich auf Montag und Samstag.
            </p>
            {kuenftig > 0 && (
              <p className="text-xs text-softball-red-700">
                {kuenftig === 1 ? 'Ein Termin liegt' : `${kuenftig} Termine liegen`} noch vor dir —
                die Stunden sind geplant, nicht gewesen.
              </p>
            )}
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Termine im {monthLabel(month)}
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Stunden
              </span>
            </div>
            {rows.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">
                In diesem Monat stehen keine Trainings in der Planung.
              </p>
            )}
            {rows.map(row => (
              <div
                key={row.trainingId}
                className={`flex items-center gap-3 py-1.5 border-b border-cream-200 last:border-0 ${
                  row.hours === 0 ? 'opacity-45' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-navy-900 truncate">
                    {weekdayName(row.date)}, {deDate(row.date)}
                  </div>
                  {row.hours > 0 && !row.from ? (
                    // Aeltere Termine stehen ohne Uhrzeit in der Planung. Auf dem Bogen
                    // muss aber eine stehen, also hier nachtragen.
                    <label className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-softball-red-700">Startzeit fehlt</span>
                      <input
                        type="time"
                        aria-label={`Startzeit am ${deDate(row.date)}`}
                        onChange={e => setRows(r => withFrom(r, row.trainingId, e.target.value))}
                        className="rounded-md border border-softball-red-300 bg-white px-1.5 py-0.5 text-[11px] text-navy-900"
                      />
                    </label>
                  ) : (
                    <div className="text-[11px] text-gray-500">
                      {row.hours > 0 && row.from
                        ? `${row.from} – ${endTime(row.from, row.hours)}`
                        : row.from ?? 'ohne Zeit'}
                    </div>
                  )}
                </div>
                <HourStepper row={row} onChange={h => setRows(r => withHours(r, row.trainingId, h))} />
              </div>
            ))}
          </Card>

          <Card padding="lg" className="space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray-600">
                {stunden} Stunden × {euro(satz)}
              </span>
              <span className="font-semibold text-navy-900 tabular-nums">{euro(amount(stunden, satz))}</span>
            </div>

            {ueberDeckel && (
              <p className="text-xs text-softball-red-700">
                Über dem Monatsdeckel von {maxHours} Stunden — so geht der Bogen nicht durch.
              </p>
            )}
            {!profile.signaturePng && (
              <p className="text-xs text-softball-red-700">
                Keine Unterschrift hinterlegt — der Bogen kommt ohne.{' '}
                <button onClick={() => setStammdatenOffen(true)} className="underline cursor-pointer">
                  Jetzt zeichnen
                </button>
              </p>
            )}
            {ohneZeit > 0 && (
              <p className="text-xs text-softball-red-700">
                {ohneZeit === 1 ? 'Ein Termin hat' : `${ohneZeit} Termine haben`} keine Startzeit —
                auf dem Bogen bleiben „von" und „bis" dort leer.
              </p>
            )}
            {zuViele && (
              <p className="text-xs text-softball-red-700">
                {gebucht.length} Zeilen, der Bogen hat {MAX_FORM_ROWS}. Die überzähligen fallen weg.
              </p>
            )}

            {stunden < maxHours && rows.length > 0 && (
              <Button variant="secondary" className="w-full"
                onClick={() => setRows(r => fillToMax(r, maxHours, primaryHours(month)))}>
                Auf {maxHours} Stunden auffüllen
              </Button>
            )}

            <Button variant="secondary" className="w-full" onClick={vorschau} disabled={busy || stunden === 0}>
              Vorschau
            </Button>

            <p className="text-[11px] text-gray-500">
              Geht an {profile.recipientEmail}. Unten auf dem Bogen steht der {deDate(heute())}.
            </p>
          </Card>

          {/* Die Zahl, nach der man steuert, und der Knopf, der schliesst — beide
              immer sichtbar, egal wie weit die Terminliste gescrollt ist. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-300 bg-cream-100/95 backdrop-blur safe-bottom no-print">
            <div className="mx-auto w-full max-w-2xl px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Gesamtstunden
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span key={stunden} className={`count-pop font-headline text-2xl font-black tabular-nums ${
                    ueberDeckel ? 'text-softball-red-700' : 'text-navy-900'
                  }`}>
                    {stunden}
                  </span>
                  <span className="text-gray-400 text-sm">/ {maxHours}</span>
                </div>
              </div>
              {/* Am Handy fuellt der Knopf die Breite, am Rechner reicht Knopfgroesse. */}
              <Button variant="primary" className="flex-1 sm:flex-none sm:px-10" onClick={teilen} disabled={busy || stunden === 0}>
                {busy ? 'Baut …' : 'PDF und Mail'}
              </Button>
            </div>
          </div>
        </>
      )}

      <CoachProfileSheet
        open={stammdatenOffen}
        onClose={() => setStammdatenOffen(false)}
        profile={profile}
        onSave={save}
      />
    </div>
  )
}

export default TrainerabrechnungPage
