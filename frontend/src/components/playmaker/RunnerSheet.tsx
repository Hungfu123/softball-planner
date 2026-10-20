import { createPortal } from 'react-dom'
import type { RunnerStatus } from './board/types'

/**
 * Was mit einem Runner passiert, wenn man ihn antippt statt zieht.
 *
 * Ohne diese drei Knoepfe liess sich kein Play zu Ende bauen, das mit einem Out endet —
 * also Rundown, Bunt-Defense, First-and-Third und die halbe Base-Coverage. Antippen statt
 * Ziehen ist die Geste, die sonst nichts tut; sie kostet keine eigene Werkzeugleiste.
 */
export function RunnerSheet({
  status,
  onActive,
  onOut,
  onScored,
  onRemove,
  onClose,
}: {
  status: RunnerStatus
  onActive: () => void
  onOut: () => void
  onScored: () => void
  onRemove: () => void
  onClose: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-cream-50 p-5 sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-headline text-xl font-extrabold uppercase tracking-wide text-navy-900">Runner</h2>
        <p className="mt-1 text-xs text-gray-500">
          {status === 'ACTIVE'
            ? 'Out und Run bleiben in diesem Stand stehen und fehlen ab dem nächsten.'
            : status === 'OUT'
              ? 'Dieser Runner ist in diesem Stand out. Ab dem nächsten fehlt er.'
              : 'Dieser Runner hat in diesem Stand gepunktet. Ab dem nächsten fehlt er.'}
        </p>
        <div className="mt-4 space-y-2">
          {status !== 'ACTIVE' && <Knopf onClick={onActive}>Läuft weiter — zurücknehmen</Knopf>}
          {status !== 'OUT' && <Knopf onClick={onOut}>Out — durchgestrichen, dann weg</Knopf>}
          {status !== 'SCORED' && <Knopf onClick={onScored}>Run — läuft über Home hinaus</Knopf>}
          <Knopf onClick={onRemove} warnend>
            Entfernen — war ein Versehen
          </Knopf>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-11 w-full rounded-xl border border-cream-300 bg-white font-display text-sm font-bold text-navy-900 hover:bg-navy-800 hover:text-white"
        >
          Abbrechen
        </button>
      </div>
    </div>,
    document.body,
  )
}

function Knopf({
  children,
  onClick,
  warnend,
}: {
  children: React.ReactNode
  onClick: () => void
  warnend?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 w-full rounded-xl px-4 text-left font-display text-sm font-bold ${
        warnend
          ? 'border border-softball-red-200 bg-white text-softball-red-600'
          : 'bg-navy-800 text-cream-50'
      }`}
    >
      {children}
    </button>
  )
}
