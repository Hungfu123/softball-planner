import { CheckCircle, AlertCircle, XMark } from '@/icons'
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
          className="relative overflow-hidden flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border border-cream-300 bg-cream-50 text-navy-900 text-sm animate-[slideUp_300ms_ease]"
        >
          <span className={t.type === 'success' ? 'text-navy-700' : 'text-softball-red-600'}>
            {t.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </span>
          <span className="flex-1 font-semibold">{t.message}</span>
          {t.action && (
            <button
              onClick={async () => { await t.action!.onClick(); onDismiss(t.id) }}
              className={`font-display min-h-[36px] px-3 py-1.5 text-xs font-extrabold tracking-widest uppercase rounded-md cursor-pointer whitespace-nowrap active:scale-95 ${
                t.type === 'success'
                  ? 'bg-navy-800 text-white hover:bg-navy-900'
                  : 'bg-softball-red-600 text-white hover:bg-softball-red-700'
              }`}
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-label="Schließen">
            <XMark size={16} />
          </button>
          <div
            className={`absolute bottom-0 left-0 h-1 w-full origin-left ${
              t.type === 'success' ? 'bg-navy-700' : 'bg-softball-red-500'
            }`}
            style={{ animation: `toastCountdown ${t.duration}ms linear forwards` }}
          />
        </div>
      ))}
    </div>
  )
}
