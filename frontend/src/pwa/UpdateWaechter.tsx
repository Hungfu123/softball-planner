import { useEffect, useState, type CSSProperties } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  darfNeuLaden,
  HINWEIS_MS,
  loeseAufbauBremse,
  merkeAufbauGeladen,
  NACHSEHEN_ALLE_MS,
  nochFrischAufgebaut,
  schonBeimAufbauGeladen,
  TAFEL_GEDULD_MS,
} from './appUpdate'

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
 * entscheidet, wann er drankommt: beim Aufbau der Seite und beim nächsten Wechsel in den
 * Vordergrund, außer es wird gerade ein Spiel mitgeschrieben. Die Begründung steht an
 * `appUpdate.ts`.
 *
 * <p>Der Zweig beim Aufbau ist der Ersatz für etwas, das vorher von selbst geschah: unter
 * `autoUpdate` übernahm der neue Service Worker ungefragt, und das zweite Neuladen zeigte
 * die neue Fassung. Mit `prompt` wartet er — ein Neuladen von Hand bekäme sonst für immer
 * dieselbe alte Seite aus dem Vorrat. Das wäre in der installierten App besonders bitter:
 * dort ist das Ziehen der einzige Handgriff, den es überhaupt gibt.
 *
 * <p>Gefragt wird `window.location.pathname` und nicht der Router: die Entscheidung fällt in
 * einem Ereignis-Handler, dort ist das Gelesene ohnehin der aktuelle Stand — und so hängt der
 * Wächter an keiner Route und kann über dem Router sitzen, wo auch die Scoring-Seiten
 * darunterliegen (die laufen außerhalb des Layouts).
 */
export function UpdateWaechter() {
  const [wechselt, setWechselt] = useState(false)
  const { needRefresh: [neueFassungDa], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registrierung) {
      if (!registrierung) return
      // Eine stehende App navigiert nicht und fragt deshalb von sich aus nie nach.
      setInterval(() => { void registrierung.update() }, NACHSEHEN_ALLE_MS)
    },
  })

  useEffect(() => {
    // Steht nichts mehr an, hat der letzte Wechsel geklappt — dann darf die Bremse weg,
    // sonst hielte sie die ganze Tab-Sitzung über und der zweite Deploy des Tages käme nicht.
    if (!neueFassungDa) loeseAufbauBremse()
  }, [neueFassungDa])

  useEffect(() => {
    if (!neueFassungDa) return
    let gestartet = false
    const pruefen = (beimAufbau: boolean) => {
      if (gestartet) return
      // Nur der Aufbau braucht die Bremse: er wiederholte sich sonst im Kreis. Und er gilt
      // nur kurz — `performance.now()` ist genau die Zeit seit dem Aufbau der Seite.
      if (beimAufbau && (schonBeimAufbauGeladen() || !nochFrischAufgebaut(performance.now()))) return
      if (!darfNeuLaden(window.location.pathname, document.visibilityState === 'visible')) return
      gestartet = true
      if (beimAufbau) merkeAufbauGeladen()
      // Erst die Tafel zeigen, dann wechseln: sonst springt die Seite unerklärt.
      setWechselt(true)
      // true: Service Worker übernimmt und die Seite lädt neu.
      setTimeout(() => { void updateServiceWorker(true) }, HINWEIS_MS)
      // Übernimmt er nicht, bleibt die Seite stehen — dann die Tafel wieder wegnehmen,
      // statt einen Vorhang ohne Ausweg stehen zu lassen.
      setTimeout(() => setWechselt(false), HINWEIS_MS + TAFEL_GEDULD_MS)
    }
    // Beim Aufbau: wer von Hand neu lädt (in der installierten App das Ziehen), landet genau
    // hier. Ohne diesen Zweig bekäme er dieselbe alte Seite zurück — der wartende Service
    // Worker kommt bei einem bloßen Neuladen nicht dran.
    const beimAufbau = setTimeout(() => pruefen(true), 0)
    const beiSichtwechsel = () => pruefen(false)
    document.addEventListener('visibilitychange', beiSichtwechsel)
    return () => {
      clearTimeout(beimAufbau)
      document.removeEventListener('visibilitychange', beiSichtwechsel)
    }
  }, [neueFassungDa, updateServiceWorker])

  if (!wechselt) return null

  return (
    <div
      role="status"
      aria-live="polite"
      // Die Balkendauer kommt aus derselben Konstante wie der Wechsel: so ist er genau
      // dann voll, wenn die Seite springt — und bleibt es, wenn jemand die Zahl aendert.
      style={{ '--update-dauer': `${HINWEIS_MS}ms` } as CSSProperties}
      className="update-tafel fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-5 bg-surface"
    >
      <img src="/deadsox.svg" alt="" width={56} height={56} className="rounded-xl" />
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-ink-muted">Neue Version wird geladen</p>
        <div className="update-spur h-px w-32 overflow-hidden rounded-full bg-line">
          <div className="update-balken h-full w-full origin-left bg-ink-faint" />
        </div>
      </div>
    </div>
  )
}
