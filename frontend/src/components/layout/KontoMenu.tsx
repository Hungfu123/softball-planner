import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/auth/AuthProvider'
import { portalOverlayAttrs, portalOverlayClickable } from '@/components/shared/portalOverlay'

function initialen(name: string): string {
  const woerter = name.trim().split(/\s+/).filter(Boolean)
  if (woerter.length === 0) return '?'
  const buchstaben = woerter.length === 1 ? woerter[0].slice(0, 2) : woerter[0][0] + woerter[woerter.length - 1][0]
  return buchstaben.toUpperCase()
}

const EINTRAG = 'flex items-center w-full min-h-11 px-4 text-left text-sm font-semibold text-navy-900 hover:bg-navy-800 hover:text-white active:scale-[0.97] transition-colors duration-200'

/**
 * Konto-Menü oben rechts: Kreis mit den Initialen, dahinter die Einträge, die der
 * Angemeldete hat. Konto, Accounts und Historie kommen mit ihren Routen (Task 12) — ein Eintrag
 * ohne Ziel gäbe es hier nur als Sackgasse.
 *
 * Das Menü portalt nach body: ein Menü im Kopf läge hinter einem offenen ResponsiveSheet.
 */
export function KontoMenu() {
  const { me, logout } = useAuth()
  const [offen, setOffen] = useState(false)
  const knopf = useRef<HTMLButtonElement>(null)
  const [rechts, setRechts] = useState(12)

  useEffect(() => {
    if (!offen) return
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOffen(false)
        knopf.current?.focus()
      }
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [offen])

  if (!me) return null

  const oeffnen = () => {
    const box = knopf.current?.getBoundingClientRect()
    if (box) setRechts(Math.max(8, window.innerWidth - box.right))
    setOffen(o => !o)
  }
  const schliessen = () => setOffen(false)

  return (
    <>
      <button
        ref={knopf}
        type="button"
        aria-label="Konto"
        aria-haspopup="menu"
        aria-expanded={offen}
        onClick={oeffnen}
        className="shrink-0 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white font-display font-bold text-sm tracking-wide flex items-center justify-center active:scale-[0.97] transition-colors duration-200"
      >
        {initialen(me.playerName ?? me.username)}
      </button>
      {offen &&
        createPortal(
          <div {...portalOverlayAttrs} className={`${portalOverlayClickable} fixed inset-0 z-[60]`} onClick={schliessen}>
            <div
              role="menu"
              aria-label="Konto"
              style={{ right: rechts }}
              className="absolute top-14 w-56 py-1 rounded-xl bg-white shadow-xl border border-cream-300 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <p className="px-4 py-2 text-xs text-navy-900/60 truncate">{me.username}</p>
              {me.playerId !== null && (
                <Link role="menuitem" to={`/players/${me.playerId}`} onClick={schliessen} className={EINTRAG}>
                  Mein Profil
                </Link>
              )}
              <button
                role="menuitem"
                type="button"
                className={EINTRAG}
                onClick={() => {
                  schliessen()
                  logout()
                }}
              >
                Abmelden
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
