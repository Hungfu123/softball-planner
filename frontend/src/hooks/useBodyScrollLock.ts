import { useEffect } from 'react'

/**
 * Sperrt das Scrollen des Hintergrunds (body) solange `locked` true ist —
 * verhindert, dass die App hinter einem offenen Modal/Sheet weiterscrollt.
 * Stellt den vorherigen overflow-Wert beim Schließen/Unmount wieder her.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [locked])
}
