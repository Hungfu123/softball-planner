import { useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Nach einem kurzen Text fragen — mit dunklem Backdrop, wie alles andere im Planner.
 *
 * Ersetzt window.prompt: der Browser-Dialog laesst sich nicht gestalten, wird in
 * installierten PWAs teils gar nicht angezeigt, und die Hausregel sagt ausdruecklich
 * Modals statt Browser-Dialogen.
 */
export function TextPromptModal({
  title,
  placeholder,
  confirmLabel = 'Anlegen',
  fehler = null,
  onConfirm,
  onCancel,
}: {
  title: string
  placeholder?: string
  confirmLabel?: string
  /** Grund, warum das Anlegen scheiterte — steht IM Dialog, nicht dahinter. */
  fehler?: string | null
  onConfirm: (wert: string) => void
  onCancel: () => void
}) {
  const [wert, setWert] = useState('')

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 sm:items-center sm:p-6"
      onClick={onCancel}
    >
      <form
        className="w-full max-w-md rounded-t-2xl bg-cream-50 p-5 sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
        onSubmit={e => {
          e.preventDefault()
          if (wert.trim()) onConfirm(wert.trim())
        }}
      >
        <h2 className="font-headline text-xl font-extrabold uppercase tracking-wide text-navy-900">{title}</h2>
        <input
          autoFocus
          value={wert}
          onChange={e => setWert(e.target.value)}
          placeholder={placeholder}
          aria-label={title}
          className="mt-4 w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm text-navy-900"
        />
        {fehler && (
          <p role="alert" className="mt-2 text-xs font-bold text-softball-red-600">
            {fehler}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-cream-300 bg-white font-display text-sm font-bold text-navy-900 hover:bg-navy-800 hover:text-white"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!wert.trim()}
            className="h-11 flex-1 rounded-xl bg-navy-800 font-display text-sm font-bold text-cream-50 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
