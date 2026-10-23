import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getWhatsappStatus } from '@/api/client'
import { XMark } from '@/icons'
import type { WhatsappAccountStatus } from '@/types'

const POLL_PAGE = '/orga/whatsapp-umfrage'
const DISMISS_KEY = 'whatsapp-banner-dismissed'
/** 5 Minuten: die Kopplung bricht selten, häufigeres Pollen wäre auf jeder Seite reine Last. */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * Warnt auf allen Layout-Seiten, wenn die WhatsApp-Kopplung weg ist.
 *
 * Ohne das erfährt man den Verlust erst, wenn man die Umfragen-Seite öffnet oder
 * merkt dass eine Umfrage nicht kam — beim Vorfall am 04.08.2026 waren das 28 Stunden.
 * Der Sidecar heilt sich selbst, aber das QR-Scannen kann nur ein Mensch.
 */
function warningFor(status: WhatsappAccountStatus): { text: string; action: string } | null {
  if (status.connected) return null
  switch (status.state) {
    case 'WAITING_QR':
    case 'LOGGED_OUT':
      return { text: 'WhatsApp ist nicht verknüpft — Umfragen werden nicht verschickt.', action: 'QR-Code scannen' }
    case 'UNREACHABLE':
    case 'INIT_FAILED':
      return { text: 'Der WhatsApp-Dienst ist nicht erreichbar — Umfragen werden nicht verschickt.', action: 'Details' }
    // CONNECTING ist ein Übergangszustand von Sekunden — dafür kein Alarm.
    default:
      return null
  }
}

export function WhatsappStatusBanner() {
  const location = useLocation()
  const [status, setStatus] = useState<WhatsappAccountStatus | null>(null)
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  )

  useEffect(() => {
    let cancelled = false
    // Fehler bewusst still: ist das Backend selbst unerreichbar, scheitert die ganze Seite
    // ohnehin sichtbar — ein zweites Banner dafür hilft nicht.
    const load = () => {
      getWhatsappStatus()
        .then(s => {
          if (cancelled) return
          setStatus(s)
          // Nach Wiederverbinden das Dismiss zurücksetzen, sonst bliebe ein späterer
          // Ausfall in derselben Session unsichtbar.
          if (s.connected) {
            sessionStorage.removeItem(DISMISS_KEY)
            setDismissed(false)
          }
        })
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (!status || dismissed) return null
  // Auf der Umfragen-Seite steht die Ursache samt QR bereits in der Konto-Karte.
  if (location.pathname === POLL_PAGE) return null

  const warning = warningFor(status)
  if (!warning) return null

  return (
    <div className="bg-softball-red-600 text-white no-print" role="status">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center gap-3">
        <p className="font-body text-xs sm:text-sm flex-1 min-w-0">
          {warning.text}{' '}
          <Link
            to={POLL_PAGE}
            className="font-semibold underline decoration-2 underline-offset-2 hover:text-white/80 py-1"
          >
            {warning.action}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, '1')
            setDismissed(true)
          }}
          className="shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center -my-2 rounded-md hover:bg-white/15 cursor-pointer"
          aria-label="Hinweis ausblenden"
        >
          <XMark size={20} />
        </button>
      </div>
    </div>
  )
}
