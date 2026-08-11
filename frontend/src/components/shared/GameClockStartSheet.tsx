import { useEffect, useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

interface GameClockStartSheetProps {
  open: boolean
  onClose: () => void
  onStart: (limitMinutes: number | null) => void
  /** Setzt nur die gelaufene Zeit zurück, lässt das Limit stehen — Spielzustand unberührt. */
  onReset: () => void
  /** Uhr läuft bereits oder ist pausiert — zeigt die Zurücksetzen-Ansicht statt der Start-Optionen.
   *  Erreichbar über eine eigene Öffnungsstelle des Aufrufers (die Uhr selbst togglet Pause/Fortsetzen). */
  hasStarted: boolean
  /** Restzeit-Schätzung + ihre Basis — nur ohne Limit vorhanden (siehe GameClock/GameDurationEstimator).
   *  `null`/`undefined` zeigt nichts, statt eine Lücke zu lassen. */
  durationEstimate?: { remainingMinutes: number; completedHalfInnings: number } | null
}

/**
 * Start-Dialog der Spielzeit-Uhr — geteilt zwischen Legacy-ScoringPage und Spielbogen, damit es
 * nur eine Kopie der Bedienung gibt (50/90 min, freie Eingabe, „ohne Limit"). Rein präsentational:
 * beide Aufrufer verdrahten ihre eigenen API-Calls über `onStart`/`onReset`.
 *
 * Zeigt zwei verschiedene Inhalte je nach `hasStarted` — Start-Optionen für eine nie gestartete
 * Uhr, sonst nur die Zurücksetzen-Aktion (kein Sinn, ein Limit zu wählen, während die Uhr schon
 * läuft; der dokumentierte Wiederherstellungsweg bei Fehlstart ist „zurücksetzen und neu starten").
 */
export function GameClockStartSheet({ open, onClose, onStart, onReset, hasStarted, durationEstimate }: GameClockStartSheetProps) {
  const [limitInput, setLimitInput] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Frische Eingabe bei jedem erneuten Öffnen — kein Rest von der letzten Sitzung.
  useEffect(() => {
    if (open) setLimitInput('')
  }, [open])

  const parsed = Number(limitInput)
  const limitValid = limitInput.trim() !== '' && !Number.isNaN(parsed) && parsed >= 1

  return (
    <>
      <ResponsiveSheet
        open={open}
        onClose={onClose}
        title={hasStarted ? 'Uhr zurücksetzen' : 'Uhr starten'}
        maxWidth="sm"
      >
        {hasStarted ? (
          <div className="px-4 pt-4 pb-4 space-y-3">
            {durationEstimate != null && (
              // Auditierbar statt magisch: die Basis (wie viele Halbinnings) steht direkt dabei.
              <p className="text-sm text-gray-500 text-center">
                ≈ {durationEstimate.remainingMinutes} min noch
                <span className="block text-xs text-gray-400 mt-0.5">
                  Schätzung aus {durationEstimate.completedHalfInnings} abgeschlossenen Halbinnings
                </span>
              </p>
            )}
            <p className="text-sm text-gray-600 text-center">
              Setzt die gelaufene Zeit auf 0 zurück, das Limit bleibt erhalten. Das Spiel selbst
              (Score, Innings, At-Bats) ist davon nicht betroffen.
            </p>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full h-11 rounded-xl border border-softball-red-300 text-softball-red-600 font-bold cursor-pointer hover:bg-softball-red-50"
            >
              Uhr zurücksetzen
            </button>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-4 space-y-3">
            <p className="text-xs text-gray-500 text-center">Zeitlimit festlegen — optional</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onStart(50)}
                className="font-display h-14 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-extrabold text-base tracking-wide cursor-pointer"
              >
                50 min
              </button>
              <button
                onClick={() => onStart(90)}
                className="font-display h-14 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-extrabold text-base tracking-wide cursor-pointer"
              >
                90 min
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                placeholder="eigenes Limit (min)"
                className="flex-1 px-3 py-2 border border-cream-300 rounded-lg text-center font-bold text-base text-gray-900 bg-white outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
              />
              <button
                onClick={() => { if (limitValid) onStart(parsed) }}
                disabled={!limitValid}
                className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Start
              </button>
            </div>
            <button
              onClick={() => onStart(null)}
              className="w-full h-11 rounded-xl border border-cream-300 text-gray-600 font-medium cursor-pointer hover:bg-cream-50"
            >
              Ohne Limit
            </button>
          </div>
        )}
      </ResponsiveSheet>

      {showResetConfirm && (
        <ConfirmModal
          title="Uhr zurücksetzen?"
          message="Die gelaufene Zeit wird auf 0 gesetzt, das Limit bleibt erhalten. Nur die Uhr ist betroffen — Score, Innings und At-Bats bleiben unverändert."
          confirmLabel="Zurücksetzen"
          cancelLabel="Abbrechen"
          onConfirm={() => { setShowResetConfirm(false); onReset() }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  )
}
