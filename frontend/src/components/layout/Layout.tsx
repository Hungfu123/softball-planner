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
      <div className="min-h-screen bg-gray-100">
        <header className="bg-navy-900 text-white sticky top-0 z-50 shadow-md no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubPage && (
                <Link to="/" className="p-1 hover:bg-navy-700 rounded-lg">
                  <ChevronLeft size={24} />
                </Link>
              )}
              <Link to="/" className="flex items-center gap-2">
                <img src="/deadsox.jpeg" alt="Dead Sox" className="w-9 h-9 rounded-lg" />
                <span className="font-bold text-lg hidden sm:block">SOFTBALL PLANNER</span>
              </Link>
            </div>
            <nav className="flex items-center gap-0.5">
              {TABS.map(tab => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.path
                      ? 'bg-softball-red-600 text-white shadow-lg shadow-softball-red-600/25'
                      : 'text-white/60 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
      </div>
    </ToastCtx.Provider>
  )
}
