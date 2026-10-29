import { useEffect } from 'react'
import { schreibtGeradeMit } from '@/pwa/appUpdate'

/**
 * Hält das Ziehen-zum-Neuladen auf den Scoring-Seiten zurück — und nur dort.
 *
 * <p>Die installierte App hat keine Adressleiste und keinen Neu-laden-Knopf. Das Ziehen ist
 * damit der einzige Handgriff, der ihr bleibt, wenn etwas klemmt; eine App, die sich gar
 * nicht mehr anfassen lässt, ist schlimmer als eine, die beim Wischen wackelt. Deshalb steht
 * es überall offen.
 *
 * <p>Auf den Scoring-Seiten nicht: dort steckt der Stand der laufenden Begegnung in der
 * Seite. Gefragt wird deshalb `schreibtGeradeMit` — dieselbe Liste, die auch das selbsttätige
 * Update zurückhält. Zwei Regeln, ein Grund: niemandem das Spiel unter den Händen wegziehen.
 *
 * <p>Die Sperre sitzt am `<html>`, weil nur dort das Ziehen des ganzen Fensters hängt; was
 * sie bewirkt, steht in `styles/index.css`.
 */
export const ZIEHEN_ATTRIBUT = 'data-kein-ziehen'

/**
 * Nur der Ausschnitt des Routers, den die Sperre braucht. So lässt sie sich prüfen, ohne
 * einen ganzen Router zu bauen.
 */
type Beobachtbar = {
  subscribe(hoerer: (zustand: { location: { pathname: string } }) => void): () => void
}

/**
 * Gelauscht wird am Router statt an `useLocation`, weil die Sperre über dem `RouterProvider`
 * sitzen muss: die Scoring-Seiten laufen außerhalb des Layouts, ein Haken irgendwo im
 * Seitenbaum erwischte sie nicht.
 */
export function useZiehenSperre(router: Beobachtbar): void {
  useEffect(() => {
    const setzen = (pfad: string) => {
      const wurzel = document.documentElement
      if (schreibtGeradeMit(pfad)) wurzel.setAttribute(ZIEHEN_ATTRIBUT, '')
      else wurzel.removeAttribute(ZIEHEN_ATTRIBUT)
    }
    // Der erste Aufruf kommt nicht vom Router: wer die App auf einer Scoring-Seite startet,
    // navigiert nie und bekäme sonst nie eine Sperre.
    setzen(window.location.pathname)
    return router.subscribe(zustand => setzen(zustand.location.pathname))
  }, [router])
}
