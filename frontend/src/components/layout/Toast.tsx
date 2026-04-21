import { CheckCircle, AlertTriangle, XMark } from '@/icons'
import type { Toast as ToastType } from '@/hooks/useToast'

export function Toast({ toasts, onDismiss }: { toasts: ToastType[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2">
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
              className="px-2 py-1 text-xs font-bold bg-white/20 rounded hover:bg-white/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} className="p-0.5 hover:opacity-70">
            <XMark size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
