import { Outlet, Link, useLocation } from 'react-router-dom'
import { ChevronLeft } from '@/icons'
import { Home, Dumbbell, Users, BarChart3, ClipboardList, Mail, type LucideIcon } from 'lucide-react'
import { Toast } from './Toast'
import { WhatsappStatusBanner } from './WhatsappStatusBanner'
import { useToast } from '@/hooks/useToast'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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

/**
 * Top-Level-Ziele. `extraPaths` markiert Routen, die zu diesem Tab gehören, aber
 * nicht unter seinem Pfad liegen — z.B. /kalender, das als Orga-Kind verlinkt ist,
 * seine Route aber aus Bookmark-/PWA-Gründen behält.
 */
const TABS: { path: string; label: string; shortLabel: string; Icon: LucideIcon; extraPaths?: string[] }[] = [
  { path: '/', label: 'Spielbetrieb', shortLabel: 'Spiele', Icon: Home },
  { path: '/training', label: 'Training', shortLabel: 'Training', Icon: Dumbbell },
  { path: '/players', label: 'Spieler', shortLabel: 'Spieler', Icon: Users },
  { path: '/stats', label: 'Statistik', shortLabel: 'Stats', Icon: BarChart3 },
  { path: '/spielbogen', label: 'Spielbogen', shortLabel: 'Bogen', Icon: ClipboardList },
  { path: '/orga', label: 'Orga', shortLabel: 'Orga', Icon: Mail, extraPaths: ['/kalender'] },
]

export function Layout() {
  const toast = useToast()
  const location = useLocation()

  const isSubPage = location.pathname.startsWith('/gameday/')
  // Läuft die Tab-Leiste über? Nur dann den Fade-Hinweis zeigen (siehe index.css).
  const navRef = useRef<HTMLElement>(null)
  const [navOverflows, setNavOverflows] = useState(false)
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => setNavOverflows(el.scrollWidth > el.clientWidth + 1)
    check()
    // ResizeObserver fehlt in jsdom — dort bleibt es beim einmaligen Check.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', check)
      return () => window.removeEventListener('resize', check)
    }
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const matches = (path: string) =>
    path === '/' ? location.pathname === '/' : (location.pathname === path || location.pathname.startsWith(path + '/'))
  const activeTab = TABS.find(t => matches(t.path) || t.extraPaths?.some(matches))?.path

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
            {/* Auf Unterseiten zeigt der Chevron schon nach "/" — mobil wäre das Logo
                ein zweiter Link aufs selbe Ziel und kostet 40px Nav-Breite.
                Ab sm ist Platz, da bleibt die Marke stehen. */}
            <Link to="/" className={`items-center gap-2 shrink-0 ${isSubPage ? 'hidden sm:flex' : 'flex'}`}>
              <img src="/deadsox.jpeg" alt="Dead Sox" className="w-8 h-8 rounded-lg" />
              <span className="font-display font-extrabold text-base tracking-wider hidden sm:block">DEAD SOX</span>
            </Link>
            {/*
              Die nav ist nur Scroll-Container; die Tabs liegen in einem Wrapper.
              Grund: justify-center/-end schiebt überlaufenden Inhalt nach LINKS aus
              dem Sichtfeld, und dorthin kann man nicht scrollen (scrollWidth zählt
              ihn nicht). Mit ml-auto auf dem Wrapper bleibt die Rechtsausrichtung,
              solange Platz ist — reicht er nicht, läuft es nach rechts über und ist
              scrollbar. Nur so greift auch der Fade-Hinweis.
            */}
            <nav
              ref={navRef}
              data-scroll-hint={navOverflows}
              className="flex overflow-x-auto scrollbar-none flex-1 min-w-0"
            >
              <div className="flex items-stretch gap-1 sm:gap-1.5 sm:ml-auto">
                {TABS.map(tab => {
                  const active = activeTab === tab.path
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      className={`font-display shrink-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-11 min-h-11 sm:min-w-0 px-2 sm:px-3 py-1 sm:py-1.5 text-nav sm:text-xs font-bold tracking-wide sm:tracking-widest rounded-lg sm:rounded-full transition-colors duration-200 whitespace-nowrap ${
                        active ? 'bg-white text-navy-900' : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <tab.Icon size={24} strokeWidth={2.2} className="shrink-0" />
                      <span className="uppercase leading-none sm:hidden">{tab.shortLabel}</span>
                      <span className="uppercase hidden sm:inline">{tab.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        </header>

        <WhatsappStatusBanner />

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6 pt-2 sm:pt-4">
          <Outlet />
        </main>

        <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
      </div>
    </ToastCtx.Provider>
  )
}
