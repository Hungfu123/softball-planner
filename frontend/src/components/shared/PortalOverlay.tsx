import { createPortal } from 'react-dom'
import type { MouseEvent, ReactNode } from 'react'
import { portalOverlayAttrs, portalOverlayClickable } from './portalOverlay'

/**
 * Overlay-Container für Portale, die über einem offenen Radix-Layer liegen
 * (vaul-Drawer = ResponsiveSheet unter 640px).
 *
 * Warum es das gibt — zwei Falle für jedes `createPortal(document.body)`:
 *  1. Ein offener vaul-Drawer sperrt via Radix-DismissableLayer den ganzen body
 *     mit `pointer-events: none` und gibt nur die eigene Drawer-Layer wieder frei.
 *     Ein Portal erbt den Lock und wäre sichtbar, aber unantippbar („gar nicht tappen").
 *  2. vauls Outside-Dismiss wertet Klicks auf ein Portal als Klick *außerhalb* der
 *     Drawer-Layer und schließt das Sheet, bevor der Handler des Overlays läuft —
 *     der Klick trifft dann ein schon unmountendes Element.
 *
 * Gegen beides helfen zwei Dinge, die dieser Baustein bzw. die Konstanten unten liefern:
 *  - `pointer-events-auto` am klickbaren Element bricht den geerbten Body-Lock.
 *  - `data-portal-overlay` am Element markiert es für den `onPointerDownOutside`-Guard
 *    in `ResponsiveSheet` (Klicks in markierte Overlays dismisset das Sheet nicht).
 *
 * Nutzung: `PortalOverlay`, wenn das Overlay ein einfacher Backdrop + Inhalt ist.
 * Weicht die Struktur ab (Popover, Context-Menü, Toast-Liste), nutze direkt
 * `portalOverlayAttrs` + `portalOverlayClickable` am passenden Element.
 */

interface Props {
  /** Zusätzliche Klassen für den Backdrop-Container (z. B. Positionierung, z-Index). */
  className?: string
  /** Klick auf den Backdrop (außerhalb des Inhalts) — üblicherweise „schließen". */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}

export function PortalOverlay({ className, onClick, children }: Props) {
  return createPortal(
    <div {...portalOverlayAttrs} className={`${portalOverlayClickable} ${className ?? ''}`} onClick={onClick}>
      {children}
    </div>,
    document.body,
  )
}
