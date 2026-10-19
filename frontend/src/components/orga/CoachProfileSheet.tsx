import { useEffect, useState } from 'react'
import { Button, ResponsiveSheet } from '@/components/shared'
import type { CoachBillingProfile } from '@/types'
import { SignaturePad } from './SignaturePad'

/** Leeres Formular beim allerersten Mal — die Migration legt bewusst keine Daten an. */
const LEER: CoachBillingProfile = {
  firstName: '', lastName: '', street: '', zip: '', city: '',
  sportCourse: 'Softball/Baseball', hourlyRate: 15, maxHours: 12,
  recipientName: '', recipientEmail: '', signaturePng: null,
}

const LABEL = 'font-display text-[10px] font-bold uppercase tracking-widest text-gray-500'
const FELD = 'w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-navy-900 '
  + 'focus:border-navy-500 focus:outline-none'

/**
 * Die Angaben, die auf jedem Bogen gleich bleiben.
 *
 * Steht einmal, dann nie wieder: Anschrift, Kurs, Satz, Deckel, Empfaengerin und
 * die Unterschrift. Alles, was sich im Monatsrhythmus aendert, gehoert auf die
 * Seite dahinter, nicht hierher.
 */
export function CoachProfileSheet({ open, onClose, profile, onSave }: {
  open: boolean
  onClose: () => void
  profile: CoachBillingProfile | undefined
  onSave: (profile: CoachBillingProfile) => Promise<unknown>
}) {
  const [form, setForm] = useState<CoachBillingProfile>(profile ?? LEER)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (open) setForm(profile ?? LEER) }, [open, profile])

  const set = <K extends keyof CoachBillingProfile>(key: K, value: CoachBillingProfile[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const speichern = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Stammdaten" maxWidth="md">
      <div className="px-5 py-4 space-y-4">
        <p className="text-xs text-gray-500">
          Das sind die Felder, die auf jedem Bogen gleich bleiben. Einmal ausfüllen, danach
          trägt die App sie selbst ein.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={LABEL}>Vorname</span>
            <input className={FELD} value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className={LABEL}>Name</span>
            <input className={FELD} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className={LABEL}>Straße</span>
          <input className={FELD} value={form.street} onChange={e => set('street', e.target.value)} />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className={LABEL}>PLZ</span>
            <input className={FELD} inputMode="numeric" value={form.zip} onChange={e => set('zip', e.target.value)} />
          </label>
          <label className="space-y-1 col-span-2">
            <span className={LABEL}>Ort</span>
            <input className={FELD} value={form.city} onChange={e => set('city', e.target.value)} />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className={LABEL}>Sportkurs</span>
          <input className={FELD} value={form.sportCourse} onChange={e => set('sportCourse', e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={LABEL}>EUR pro Stunde</span>
            <input className={FELD} inputMode="decimal" value={form.hourlyRate}
              onChange={e => set('hourlyRate', Number(e.target.value.replace(',', '.')) || 0)} />
          </label>
          <label className="space-y-1">
            <span className={LABEL}>Stunden pro Monat</span>
            <input className={FELD} inputMode="numeric" value={form.maxHours}
              onChange={e => set('maxHours', Number(e.target.value) || 0)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={LABEL}>Anrede in der Mail</span>
            <input className={FELD} placeholder="Alice" value={form.recipientName ?? ''}
              onChange={e => set('recipientName', e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className={LABEL}>Empfängerin</span>
            <input className={FELD} type="email" inputMode="email" value={form.recipientEmail}
              onChange={e => set('recipientEmail', e.target.value)} />
          </label>
        </div>

        <SignaturePad value={form.signaturePng} onChange={png => set('signaturePng', png)} />

        {error && <p className="text-xs text-softball-red-700">{error}</p>}

        <Button variant="navy" className="w-full" onClick={speichern} disabled={busy}>
          {busy ? 'Speichert …' : 'Speichern'}
        </Button>
      </div>
    </ResponsiveSheet>
  )
}
