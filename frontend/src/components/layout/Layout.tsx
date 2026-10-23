import { Outlet, Link, useLocation } from 'react-router-dom'
import { ChevronLeft } from '@/icons'
import { Home, Dumbbell, Users, BarChart3, Mail, type LucideIcon } from 'lucide-react'
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
  { path: '/stats', label: 'Analyse', shortLabel: 'Analyse', Icon: BarChart3, extraPaths: ['/teams'] },
  { path: '/orga', label: 'Orga', shortLabel: 'Orga', Icon: Mail, extraPaths: ['/kalender', '/spielbogen'] },
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

  // Der Spieltag-Planner ist das einzige echte Werkzeug-Layout der App: Bogen,
  // Feld und Spieler-Leiste nebeneinander. Auf max-w-7xl (1280px) blieben auf einem
  // 1920er-Monitor 640px Rand ungenutzt, während die Pool-Spalte auf 216px gequetscht
  // war. Nur diese Route bekommt deshalb die breite Bühne — alle Lese-Seiten behalten
  // 1280px, weil dort lange Zeilen die Lesbarkeit kosten würden.
  const wideShell = /^\/gameday\/\d+$/.test(location.pathname)
  const shell = wideShell
    ? 'max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-8'
    : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8'

  const matches = (path: string) =>
    path === '/' ? location.pathname === '/' : (location.pathname === path || location.pathname.startsWith(path + '/'))
  const activeTab = TABS.find(t => matches(t.path) || t.extraPaths?.some(matches))?.path

  return (
    <ToastCtx.Provider value={toast}>
      <div className="min-h-screen bg-cream-100">
        <header className="bg-navy-900 text-white sticky top-0 z-50 shadow-md no-print border-b-[3px] border-softball-red-600 safe-top">
          <div className={`${shell} h-14 flex items-center gap-3`}>
            {isSubPage && (
              <Link to="/" className="p-1 hover:bg-navy-700 rounded-lg shrink-0" aria-label="Zurück">
                <ChevronLeft size={22} />
              </Link>
            )}
            {/*
              Marke erst ab lg. Darunter kostet sie 44px (Logo + gap); verfügbar wären
              dann 322px von 366px Innenbreite (390px Viewport). Mit geladener Saira
              Condensed brauchen die fünf Tabs 264px (gemessen) — das Logo passte. Mit der
              Fallback-Schrift, also beim ersten Paint vor dem Webfont, wären es 331px
              (früherer Lauf, vermutlich Fallback — nicht verifiziert) und es passte nicht.
              Deshalb bleibt sie unten weg. Im PWA-Standalone-Modus trägt ohnehin das
              App-Icon die Marke.
              Auf Unterseiten zeigt links der Chevron nach "/" — das Logo wäre dort
              zusätzlich ein zweiter Link aufs selbe Ziel.
            */}
            <Link to="/" className="hidden lg:flex items-center gap-2 shrink-0">
              <img src="/deadsox.svg" alt="Dead Sox" className="w-8 h-8 rounded-lg" />
              <span className="font-display font-extrabold text-base tracking-wider">DEAD SOX</span>
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
              {/*
                Auto-Margins statt justify-*: bei negativem Freiraum lösen sie zu 0 auf,
                der Inhalt beginnt links und ist nach rechts scrollbar. justify-center/-end
                würde den Überlauf stattdessen nach links schieben, wo er unerreichbar ist.
                Kompakt beidseitig auto = zentriert, ab lg nur links = rechtsbündig.

                Der Layout-Wechsel liegt bei lg, nicht sm: die breite Variante (Zeile,
                volle Labels) braucht 597px (gemessen, fünf Tabs). Bei sm (640px) hat die
                Leiste nur 592px innen — 5px zu wenig, die Leiste wäre abgeschnitten;
                ab lg stehen 821px zur Verfügung (1024px, mit Logo). Bis 1023px
                bleibt die kompakte Variante: 264px gemessen gegen 366px Innenbreite bei
                390px, scrollWidth <= clientWidth, data-scroll-hint false. Die kompakte
                Variante hat die 44px-Targets, die auf dem Tablet ohnehin richtig sind.
              */}
              <div className="flex items-stretch gap-1 lg:gap-1.5 ml-auto mr-auto lg:mr-0">
                {TABS.map(tab => {
                  const active = activeTab === tab.path
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      className={`font-display shrink-0 flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-1.5 min-w-11 min-h-11 lg:min-w-0 px-2 lg:px-3 py-1 lg:py-1.5 text-nav lg:text-xs font-bold tracking-wide lg:tracking-widest rounded-lg lg:rounded-full transition-colors duration-200 whitespace-nowrap ${
                        active ? 'bg-white text-navy-900' : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <tab.Icon size={24} strokeWidth={2.2} className="shrink-0" />
                      <span className="uppercase leading-none lg:hidden">{tab.shortLabel}</span>
                      <span className="uppercase hidden lg:inline">{tab.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        </header>

        <WhatsappStatusBanner />

        <main className={`${shell} pb-6 xl:pb-2 pt-2 sm:pt-4 safe-bottom`}>
          <Outlet />
        </main>

        <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
      </div>
    </ToastCtx.Provider>
  )
}
