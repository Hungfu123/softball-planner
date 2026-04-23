import { CheckCircle, AlertTriangle, XMark } from '@/icons'
import type { Toast as ToastType } from '@/hooks/useToast'

export function Toast({ toasts, onDismiss }: { toasts: ToastType[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  return (
    // Mobile: top (unter Header), weil Bottom-ActionBars (Scoring) häufig
    // die Toasts überdeckten. Desktop: bottom-4 wie vorher.
    <div className="fixed top-20 sm:top-auto sm:bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-[slideUp_300ms_ease] ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-softball-red-600 text-white'
          }`}
        >
          {t.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={async () => { await t.action!.onClick(); onDismiss(t.id) }}
              className="min-h-[36px] px-3 py-1.5 text-sm font-bold bg-white/25 rounded-md hover:bg-white/40 transition-colors cursor-pointer whitespace-nowrap active:scale-95"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} className="p-1.5 hover:opacity-70" aria-label="Schließen">
            <XMark size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
