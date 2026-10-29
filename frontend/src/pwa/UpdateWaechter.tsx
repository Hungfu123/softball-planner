import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { darfNeuLaden, NACHSEHEN_ALLE_MS } from './appUpdate'

/**
 * Holt neue Fassungen der App von selbst herein.
 *
 * <p>Vorher stand der Plugin-Typ auf `autoUpdate`. Das klingt nach genau dem hier, tut aber
 * etwas anderes: der neue Service Worker übernimmt sofort, die **offene Seite** läuft jedoch
 * weiter mit dem alten JavaScript. Im Browser fällt das kaum auf, weil man die Seite
 * irgendwann neu aufruft. Die installierte App wird nie neu aufgerufen, sondern fortgesetzt —
 * dort blieb die alte Fassung stehen, bis jemand hart neu lud.
 *
 * <p>Jetzt wartet der neue Service Worker (`registerType: 'prompt'`), und diese Komponente
 * entscheidet, wann er drankommt: beim nächsten Wechsel in den Vordergrund, außer es wird
 * gerade ein Spiel mitgeschrieben. Die Begründung steht an `appUpdate.ts`.
 *
 * <p>Gefragt wird `window.location.pathname` und nicht der Router: die Entscheidung fällt in
 * einem Ereignis-Handler, dort ist das Gelesene ohnehin der aktuelle Stand — und so hängt der
 * Wächter an keiner Route und kann über dem Router sitzen, wo auch die Scoring-Seiten
 * darunterliegen (die laufen außerhalb des Layouts).
 */
export function UpdateWaechter() {
  const { needRefresh: [neueFassungDa], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registrierung) {
      if (!registrierung) return
      // Eine stehende App navigiert nicht und fragt deshalb von sich aus nie nach.
      setInterval(() => { void registrierung.update() }, NACHSEHEN_ALLE_MS)
    },
  })

  useEffect(() => {
    if (!neueFassungDa) return
    const pruefen = () => {
      if (!darfNeuLaden(window.location.pathname, document.visibilityState === 'visible')) return
      // true: Service Worker übernimmt und die Seite lädt neu.
      void updateServiceWorker(true)
    }
    document.addEventListener('visibilitychange', pruefen)
    return () => document.removeEventListener('visibilitychange', pruefen)
  }, [neueFassungDa, updateServiceWorker])

  return null
}
