import { useState, useEffect } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface Props {
  open: boolean
  title: string
  initialName?: string
  onCancel: () => void
  onConfirm: (name: string) => void
}

export function SaveSetModal({ open, title, initialName = '', onCancel, onConfirm }: Props) {
  const [name, setName] = useState(initialName)
  useBodyScrollLock(open)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display text-sm font-extrabold tracking-widest uppercase text-navy-900 mb-3">
          {title}
        </h2>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="z.B. Variante A"
          className="w-full text-sm border border-cream-300 rounded-lg px-3 py-2 outline-none focus:border-navy-600 focus:ring-2 focus:ring-cream-200 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="font-display px-3 py-2 text-xs font-bold tracking-widest uppercase rounded-lg text-gray-600 hover:bg-navy-800 hover:text-white transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="font-display px-3 py-2 text-xs font-extrabold tracking-widest uppercase rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
