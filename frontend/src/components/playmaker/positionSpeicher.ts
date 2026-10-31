import { POSITIONS } from './board/geometry'
import type { PositionCode } from './board/types'

const SPEICHER = 'playmaker-position'

/**
 * Die eigene Position, gemerkt auf diesem Geraet.
 *
 * Ein Shortstop bleibt einer; ihn bei jedem Besuch wieder zu fragen waere eine Frage
 * ohne neue Antwort. Im localStorage, weil es eine Bequemlichkeit je Geraet ist und
 * keine Auskunft, die jemand anderes braucht — und deshalb steht sie auch nicht in der
 * Adresse: ein geteilter Link zeigt allen dasselbe.
 */
export function lesePosition(): PositionCode | null {
  try {
    const wert = localStorage.getItem(SPEICHER)
    return wert && (POSITIONS as readonly string[]).includes(wert) ? (wert as PositionCode) : null
  } catch {
    return null
  }
}

export function schreibePosition(pos: PositionCode | null) {
  try {
    if (pos) localStorage.setItem(SPEICHER, pos)
    else localStorage.removeItem(SPEICHER)
  } catch {
    /* Privates Fenster: dann merkt es sich eben nichts. */
  }
}
