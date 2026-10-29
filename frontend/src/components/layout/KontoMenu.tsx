import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRolle } from '@/hooks/useRolle'
import { spielermodusSetzen } from '@/hooks/useSpielermodus'
import { useTheme } from '@/hooks/useTheme'
import { portalOverlayAttrs, portalOverlayClickable } from '@/components/shared/portalOverlay'

function initialen(name: string): string {
  const woerter = name.trim().split(/\s+/).filter(Boolean)
  if (woerter.length === 0) return '?'
  const buchstaben = woerter.length === 1 ? woerter[0].slice(0, 2) : woerter[0][0] + woerter[woerter.length - 1][0]
  return buchstaben.toUpperCase()
}

const EINTRAG = 'flex items-center w-full min-h-11 px-4 text-left text-sm font-semibold text-navy-900 hover:bg-navy-800 hover:text-white active:scale-[0.97] transition-colors duration-200'

/**
 * Hell oder dunkel, direkt im Menü. Die Wahl liegt auch unter Konto — dort gehört sie
 * hin, mit dem Satz „gilt nur auf diesem Gerät" daneben. Nur: dorthin führen drei
 * Klicks hinter einem Eintrag namens „Konto & Passwort", und der sagt nichts über
 * Darstellung. Etwas, das man je nach Tageszeit umlegt, darf nicht so weit weg liegen.
 */
function AnsichtWahl() {
  const { theme, setTheme } = useTheme()
  const knopf = (wert: 'light' | 'dark', text: string) => (
    <button
      type="button"
      onClick={() => setTheme(wert)}
      aria-pressed={theme === wert}
      className={`min-h-11 flex-1 rounded-md font-display text-[11px] font-bold uppercase tracking-widest transition-colors ${
        theme === wert ? 'bg-accent text-accent-ink' : 'text-navy-700 hover:bg-cream-300'
      }`}
    >
      {text}
    </button>
  )
  return (
    <div className="px-3 py-2">
      <div role="group" aria-label="Ansicht" className="flex gap-0.5 rounded-lg bg-cream-200 p-0.5">
        {knopf('light', 'Hell')}
        {knopf('dark', 'Dunkel')}
      </div>
    </div>
  )
}

/**
 * Konto-Menü oben rechts: Kreis mit den Initialen, dahinter die Einträge, die der
 * Angemeldete hat: Konto für jeden, Accounts ab Admin, Historie nur für den Superadmin.
 * Ohne Auskunft (me === null) bleibt es bei Abmelden — verwaltet wird nur, wer bekannt ist.
 *
 * Abmelden steht immer da, auch wenn /api/me nicht beantwortet wurde (me === null): es ist der
 * Notausgang aus einer Sitzung, die sonst nicht heilt.
 *
 * Das Menü portalt nach body: ein Menü im Kopf läge hinter einem offenen ResponsiveSheet.
 */
export function KontoMenu() {
  const { me, logout } = useAuth()
  const { istAdmin, istSuperadmin, spielermodus, darfSichtWechseln } = useRolle()
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
        {me ? initialen(me.playerName ?? me.username) : '?'}
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
              {me && <p className="px-4 py-2 text-xs text-navy-900/60 truncate">{me.username}</p>}
              {me && me.playerId !== null && (
                <Link role="menuitem" to={`/players/${me.playerId}`} onClick={schliessen} className={EINTRAG}>
                  Mein Profil
                </Link>
              )}
              {me && (
                <Link role="menuitem" to="/konto" onClick={schliessen} className={EINTRAG}>
                  Konto &amp; Passwort
                </Link>
              )}
              {me && istAdmin && (
                <Link role="menuitem" to="/orga/accounts" onClick={schliessen} className={EINTRAG}>
                  Accounts
                </Link>
              )}
              {me && istSuperadmin && (
                <Link role="menuitem" to="/orga/historie" onClick={schliessen} className={EINTRAG}>
                  Historie
                </Link>
              )}
              {darfSichtWechseln && (
                <button
                  role="menuitem"
                  type="button"
                  className={EINTRAG}
                  onClick={() => { schliessen(); void spielermodusSetzen(!spielermodus) }}
                >
                  {spielermodus ? 'Zurück zu Superadmin' : 'Als Spieler ansehen'}
                </button>
              )}
              <div className="border-t border-cream-300 mt-1 pt-1">
                <AnsichtWahl />
              </div>
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
