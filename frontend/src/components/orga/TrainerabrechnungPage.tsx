import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '@/api/client'
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/shared'
import { useCoachBilling } from '@/hooks/useCoachBilling'
import type { TrainingResponse } from '@/types'
import { CoachProfileSheet } from './CoachProfileSheet'
import {
  amount, billedRows, endTime, fillToMax, isWinterMonth, MAX_FORM_ROWS, monthLabel,
  primaryHours, suggestRows, totalHours, weekdayName, withHours, type BillingRow,
} from './coachBilling'
import {
  abrechnungFileName, buildTrainerabrechnungPdf, mailBody, mailSubject, pdfBlob,
} from './trainerabrechnungPdf'

/** Die letzten zwoelf Monate, der gerade vergangene zuerst — danach wird abgerechnet. */
function monthOptions(today = new Date()): string[] {
  const monate: string[] = []
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1)
    monate.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return monate
}

function heute(): string {
  return new Date().toISOString().slice(0, 10)
}

function deDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function TrainerabrechnungPage() {
  const { profile, loading: profilLaedt, save } = useCoachBilling()
  const [trainings, setTrainings] = useState<TrainingResponse[] | null>(null)
  const [month, setMonth] = useState(monthOptions()[0])
  const [rows, setRows] = useState<BillingRow[]>([])
  const [stammdatenOffen, setStammdatenOffen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    api.getTrainings().then(setTrainings).catch((e: Error) => setFehler(e.message))
  }, [])

  const maxHours = profile?.maxHours ?? 12

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

  const setzeStunden = (trainingId: number, hours: number) =>
    setRows(r => withHours(r, trainingId, hours))

  async function baueUndTeile() {
    if (!profile) return
    setBusy(true)
    setFehler(null)
    setHinweis(null)
    try {
      const bytes = await buildTrainerabrechnungPdf({ profile, yearMonth: month, rows, signedOn: heute() })
      const name = abrechnungFileName(profile, month)
      const blob = pdfBlob(bytes)
      const text = mailBody(profile, month)
      const datei = new File([blob], name, { type: 'application/pdf' })

      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: mailSubject(month), text })
        setHinweis('Geteilt. In Gmail steht der Text schon drin.')
        return
      }

      // Kein Teilen-Menue (Desktop): herunterladen, Text in die Zwischenablage,
      // Mailentwurf mit Empfaengerin oeffnen — anhaengen bleibt dann Handarbeit.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      await navigator.clipboard?.writeText(text).catch(() => {})
      setHinweis('PDF heruntergeladen, der Mailtext liegt in der Zwischenablage.')
    } catch (e: unknown) {
      const message = (e as Error).message
      if ((e as Error).name !== 'AbortError') setFehler(message)
    } finally {
      setBusy(false)
    }
  }

  async function vorschau() {
    if (!profile) return
    setBusy(true)
    try {
      const bytes = await buildTrainerabrechnungPdf({ profile, yearMonth: month, rows, signedOn: heute() })
      window.open(URL.createObjectURL(pdfBlob(bytes)), '_blank', 'noopener')
    } catch (e: unknown) {
      setFehler((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (profilLaedt || !trainings) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Link to="/orga" className="text-xs text-gray-500 hover:text-navy-900">‹ Orga</Link>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">
            Trainerabrechnung
          </h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setStammdatenOffen(true)}>
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
            <label className="block space-y-1">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Monat
              </span>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-900"
              >
                {monthOptions().map(m => (
                  <option key={m} value={m}>{monthLabel(m)} {m.slice(0, 4)}</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gray-500">
              {isWinterMonth(month) ? 'Winter' : 'Sommer'}: Donnerstag {primaryHours(month)} Stunden,
              der Rest verteilt sich auf Montag und Samstag.
            </p>
          </Card>

          <Card padding="lg" className="space-y-1">
            {rows.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">
                In diesem Monat stehen keine Trainings in der Planung.
              </p>
            )}
            {rows.map(row => (
              <div
                key={row.trainingId}
                className={`flex items-center gap-3 py-2 border-b border-cream-200 last:border-0 ${
                  row.hours === 0 ? 'opacity-45' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-navy-900 truncate">
                    {weekdayName(row.date)}, {deDate(row.date)}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {row.hours > 0 && row.from
                      ? `${row.from} – ${endTime(row.from, row.hours)}`
                      : row.from ?? 'ohne Zeit'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setzeStunden(row.trainingId, row.hours - 1)}
                    disabled={row.hours === 0}
                    aria-label={`Eine Stunde weniger am ${deDate(row.date)}`}
                    className="w-9 h-9 rounded-lg border border-cream-300 text-navy-900 disabled:opacity-30 cursor-pointer"
                  >
                    –
                  </button>
                  <span className="w-10 text-center font-display text-sm font-bold text-navy-900 tabular-nums">
                    {row.hours}
                  </span>
                  <button
                    onClick={() => setzeStunden(row.trainingId, row.hours + 1)}
                    aria-label={`Eine Stunde mehr am ${deDate(row.date)}`}
                    className="w-9 h-9 rounded-lg border border-cream-300 text-navy-900 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </Card>

          <Card padding="lg" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Gesamtstunden
              </span>
              <span className={`font-headline text-3xl font-black tabular-nums ${
                stunden > maxHours ? 'text-softball-red-700' : 'text-navy-900'
              }`}>
                {stunden}<span className="text-gray-400 text-lg"> / {maxHours}</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm text-gray-600">
              <span>{stunden} × {satz.toFixed(2).replace('.', ',')} EUR</span>
              <span className="font-semibold text-navy-900 tabular-nums">
                {amount(stunden, satz).toFixed(2).replace('.', ',')} EUR
              </span>
            </div>

            {stunden > maxHours && (
              <p className="text-xs text-softball-red-700">
                Über dem Monatsdeckel — so geht der Bogen nicht durch.
              </p>
            )}
            {zuViele && (
              <p className="text-xs text-softball-red-700">
                {gebucht.length} Zeilen, der Bogen hat {MAX_FORM_ROWS}. Die überzähligen fallen weg.
              </p>
            )}

            {stunden < maxHours && (
              <Button variant="secondary" className="w-full"
                onClick={() => setRows(r => fillToMax(r, maxHours))}>
                Auf {maxHours} Stunden auffüllen
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={vorschau} disabled={busy || stunden === 0}>
                Vorschau
              </Button>
              <Button variant="primary" className="flex-1" onClick={baueUndTeile} disabled={busy || stunden === 0}>
                {busy ? 'Baut …' : 'PDF und Mail'}
              </Button>
            </div>

            <p className="text-[11px] text-gray-500">
              Geht an {profile.recipientEmail}. Unten auf dem Bogen steht der {deDate(heute())}.
            </p>
            {hinweis && <p className="text-xs text-navy-700">{hinweis}</p>}
            {fehler && <p className="text-xs text-softball-red-700">{fehler}</p>}
          </Card>
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
