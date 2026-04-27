import { Outlet, Link, useLocation } from 'react-router-dom'
import { ChevronLeft } from '@/icons'
import { Toast } from './Toast'
import { useToast } from '@/hooks/useToast'
import { createContext, useContext, type ReactNode } from 'react'
import type { ToastContext } from '@/hooks/useToast'

const ToastCtx = createContext<ToastContext | null>(null)
export const useToastContext = () => useContext(ToastCtx)!

/**
 * Standalone Toast-Provider für Routes außerhalb des Layouts (z.B. ScoringPage).
 * Ohne diesen Wrapper wäre useToastContext() null → .show() crasht.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
    </ToastCtx.Provider>
  )
}

const TABS = [
  { path: '/', label: 'Spielbetrieb', shortLabel: 'Spiele' },
  { path: '/training', label: 'Training', shortLabel: 'Training' },
  { path: '/training-plan', label: 'Trainingsplan', shortLabel: 'Plan' },
  { path: '/players', label: 'Spieler', shortLabel: 'Spieler' },
  { path: '/stats', label: 'Statistik', shortLabel: 'Stats' },
] as const

export function Layout() {
  const toast = useToast()
  const location = useLocation()

  const isSubPage = location.pathname.startsWith('/gameday/')
  const activeTab = TABS.find(t => t.path === location.pathname)?.path
    ?? (location.pathname === '/' ? '/' : undefined)

  return (
    <ToastCtx.Provider value={toast}>
      <div className="min-h-screen bg-cream-100">
        <header className="bg-navy-900 text-white sticky top-0 z-50 shadow-md no-print border-b-[3px] border-softball-red-600">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
            {isSubPage && (
              <Link to="/" className="p-1 hover:bg-navy-700 rounded-lg shrink-0" aria-label="Zurück">
                <ChevronLeft size={22} />
              </Link>
            )}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src="/deadsox.jpeg" alt="Dead Sox" className="w-8 h-8 rounded-lg" />
              <span className="font-display font-extrabold text-base tracking-wider hidden sm:block">DEAD SOX</span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 justify-end">
              {TABS.map(tab => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`font-display shrink-0 px-3 py-1.5 text-[11px] sm:text-xs font-bold tracking-widest rounded-full transition-colors duration-200 whitespace-nowrap ${
                    activeTab === tab.path
                      ? 'bg-white text-navy-900'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="sm:hidden uppercase">{tab.shortLabel}</span>
                  <span className="hidden sm:inline uppercase">{tab.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6 pt-2 sm:pt-4">
          <Outlet />
        </main>

        <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
      </div>
    </ToastCtx.Provider>
  )
}
