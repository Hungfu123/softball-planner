import { createPortal } from 'react-dom'
import { portalOverlayAttrs, portalOverlayClickable } from '@/components/shared'
import { CheckCircle, AlertCircle, XMark } from '@/icons'
import type { Toast as ToastType } from '@/hooks/useToast'

export function Toast({ toasts, onDismiss }: { toasts: ToastType[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  // Portal an document.body + höherer z-Index als die ResponsiveSheet-Bottom-Sheets (vaul
  // Drawer/CenterModal, beide z-50): Toast rendert sonst im Layout-Baum und liegt hinter jedem
  // offenen Sheet — Fehlermeldungen während eines Sheets (z.B. Apply-Fehler im Sync-Sheet)
  // wirkten dann wie ein Klick ohne Reaktion.
  return createPortal(
    // Mobile: oben mittig (zentriert, unter Header) — Bottom-ActionBars (Scoring)
    // verdeckten Toasts sonst. Desktop: rechts unten.
    // Container pointer-events-none (frisst sonst die Fläche über den Toasts), die
    // Boxen portalOverlayClickable (Details in PortalOverlay).
    <div {...portalOverlayAttrs} className="fixed z-[60] flex flex-col gap-2 top-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm sm:top-auto sm:bottom-4 sm:right-4 sm:left-auto sm:translate-x-0 sm:w-96 sm:max-w-none pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`relative overflow-hidden flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border border-cream-300 bg-white text-navy-900 text-sm animate-[slideUp_300ms_ease] ${portalOverlayClickable}`}
        >
          <span className={`shrink-0 ${t.type === 'success' ? 'text-navy-700' : 'text-softball-red-600'}`}>
            {t.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
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
    </div>,
    document.body,
  )
}
