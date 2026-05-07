import { useEffect, useState } from 'react'
import { XMark } from '@/icons'
import type { SpielbogenResponse, CreateSpielbogenRequest } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  meta: SpielbogenResponse
  onSubmit: (req: Partial<CreateSpielbogenRequest>) => Promise<void>
}

export function BogenMetaEditModal({ open, onClose, meta, onSubmit }: Props) {
  const [homeTeamName, setHomeTeamName] = useState(meta.homeTeamName)
  const [awayTeamName, setAwayTeamName] = useState(meta.awayTeamName)
  const [date, setDate] = useState(meta.date)
  const [location, setLocation] = useState(meta.location ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const trimmedHome = homeTeamName.trim()
  const trimmedAway = awayTeamName.trim()
  const canSubmit = !!trimmedHome && !!trimmedAway && !!date && !submitting
  const ligaWarning = meta.leagueResultId != null

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        homeTeamName: trimmedHome,
        awayTeamName: trimmedAway,
        date,
        location: location.trim() || null,
        seasonId: meta.season?.id ?? null,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meta-edit-title"
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300">
          <h2 id="meta-edit-title" className="text-lg font-bold text-gray-900">Spielbogen bearbeiten</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {ligaWarning && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-body">
              Liga-Tabelle ist bereits aktualisiert — Änderungen werden nicht zurückgespielt.
            </div>
          )}

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Heim</span>
            <input
              type="text"
              value={homeTeamName}
              onChange={e => setHomeTeamName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Gast</span>
            <input
              type="text"
              value={awayTeamName}
              onChange={e => setAwayTeamName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Datum</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Ort</span>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          {error && (
            <div className="text-softball-red-700 font-body text-sm">{error}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-cream-300 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
