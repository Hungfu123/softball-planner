import { createPortal } from 'react-dom'
import type { Trajectory } from './board/types'

/**
 * Bogen oder flach — die einzige Eigenschaft des Balls, die man sehen muss.
 *
 * Im Entwurf steht sie als Grammatik des Boards (gestrichelter Bogen = Fly, gerade Linie
 * = Grounder), aber im Editor war sie nicht zu erreichen: jeder selbst gebaute Ball lief
 * im Bogen, auch ein Grounder zum Shortstop. Dieselbe Geste wie beim Runner — antippen
 * statt ziehen.
 */
export function BallSheet({
  trajectory,
  onChange,
  onClose,
}: {
  trajectory: Trajectory
  onChange: (wert: Trajectory) => void
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
        <h2 className="font-headline text-xl font-extrabold uppercase tracking-wide text-navy-900">Ball</h2>
        <p className="mt-1 text-xs text-gray-500">
          Wie der Weg zu diesem Stand gezeichnet wird — als Bogen oder als gerade Linie.
        </p>
        <div className="mt-4 space-y-2">
          <Knopf aktiv={trajectory === 'AIR'} onClick={() => onChange('AIR')}>
            Bogen — Wurf oder Fly
          </Knopf>
          <Knopf aktiv={trajectory === 'GROUND'} onClick={() => onChange('GROUND')}>
            Flach — Grounder oder Liner
          </Knopf>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-11 w-full rounded-xl border border-cream-300 bg-white font-display text-sm font-bold text-navy-900 hover:bg-navy-800 hover:text-white"
        >
          Fertig
        </button>
      </div>
    </div>,
    document.body,
  )
}

function Knopf({
  children,
  onClick,
  aktiv,
}: {
  children: React.ReactNode
  onClick: () => void
  aktiv: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`h-12 w-full rounded-xl px-4 text-left font-display text-sm font-bold ${
        aktiv ? 'bg-navy-800 text-cream-50' : 'border border-cream-300 bg-white text-navy-900'
      }`}
    >
      {children}
    </button>
  )
}
