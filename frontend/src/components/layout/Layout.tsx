import { Outlet, Link, useLocation } from 'react-router-dom'
import { ChevronLeft, UsersIcon } from '@/icons'
import { Toast } from './Toast'
import { useToast } from '@/hooks/useToast'
import { createContext, useContext } from 'react'
import type { ToastContext } from '@/hooks/useToast'

const ToastCtx = createContext<ToastContext | null>(null)
export const useToastContext = () => useContext(ToastCtx)!

export function Layout() {
  const toast = useToast()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <ToastCtx.Provider value={toast}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-navy-900 text-white sticky top-0 z-50 shadow-md no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isHome && (
                <Link to="/" className="p-1 hover:bg-navy-700 rounded-lg">
                  <ChevronLeft size={24} />
                </Link>
              )}
              <Link to="/" className="flex items-center gap-2">
                <img src="/deadsox.jpeg" alt="Dead Sox" className="w-9 h-9 rounded-lg" />
                <span className="font-bold text-lg hidden sm:block">SOFTBALL LINEUP</span>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              {isHome && (
                <Link
                  to="/players"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-softball-red-600 hover:bg-softball-red-500 transition-colors"
                >
                  <UsersIcon size={16} />
                  <span className="hidden sm:inline">Spieler</span>
                </Link>
              )}
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
