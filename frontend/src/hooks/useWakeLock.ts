import { useEffect } from 'react'

/**
 * Hält den Bildschirm wach, solange die Seite sichtbar ist.
 *
 * Gedacht für den Zähler am Feld: zwischen zwei Würfen vergehen leicht ein paar Minuten,
 * und ein gesperrtes Display bedeutet, dass man erst aufwecken muss, bevor man zählen kann.
 *
 * Die Screen Wake Lock API ist nicht überall da (ältere Browser, unsicherer Kontext) und
 * kann jederzeit verweigert werden, etwa bei niedrigem Akkustand. Beides ist kein Fehler,
 * den der Nutzer sehen müsste — der Zähler funktioniert auch ohne, der Bildschirm geht dann
 * eben aus. Deshalb gibt es hier bewusst keine Fehlermeldung und keinen Rückgabewert.
 *
 * Beim Wechsel in den Hintergrund gibt das System den Lock von sich aus frei. Ohne erneutes
 * Anfordern bliebe er für den Rest des Spiels weg — genau dann, wenn man ihn braucht.
 */
export function useWakeLock(aktiv = true) {
  useEffect(() => {
    if (!aktiv) return
    if (!('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let abgeraeumt = false

    async function anfordern() {
      // `released` mitprüfen, nicht nur auf das release-Event vertrauen: bleibt das Event
      // aus, hinge der Zähler sonst dauerhaft an einem toten Sentinel fest.
      if (abgeraeumt || (sentinel && !sentinel.released)) return
      try {
        const neu = await navigator.wakeLock.request('screen')
        // Zwischen await und hier kann die Komponente längst weg sein.
        if (abgeraeumt) {
          void neu.release()
          return
        }
        sentinel = neu
        neu.addEventListener('release', () => {
          sentinel = null
        })
      } catch {
        // Verweigert oder nicht verfügbar — ohne Wake Lock geht der Zähler trotzdem.
      }
    }

    function beiSichtbarkeitswechsel() {
      if (document.visibilityState === 'visible') void anfordern()
    }

    void anfordern()
    document.addEventListener('visibilitychange', beiSichtbarkeitswechsel)

    return () => {
      abgeraeumt = true
      document.removeEventListener('visibilitychange', beiSichtbarkeitswechsel)
      void sentinel?.release().catch(() => {})
    }
  }, [aktiv])
}
