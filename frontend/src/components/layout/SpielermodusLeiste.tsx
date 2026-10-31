import { useRolle } from '@/hooks/useRolle'
import { spielermodusSetzen } from '@/hooks/useSpielermodus'

/**
 * Der Streifen, der im Spielermodus stehen bleibt.
 *
 * Er muss **immer** sichtbar sein, nicht nur im Menü: wer vergisst, dass er in der kleineren
 * Sicht steckt, hält die App für kaputt, sobald etwas fehlt. Deshalb unten fest — über dem
 * Inhalt, in Daumennähe, und kein Weg führt daran vorbei.
 *
 * Er sitzt über dem Router (neben `UpdateWaechter`) und deckt damit auch die Seiten ab, die
 * außerhalb des Layouts laufen.
 *
 * Der Streifen liegt auf z-50, nicht auf der Modal-Ebene (60): ein offenes Modal darf ihn
 * verdecken, sonst klebte er ueber dessen Schaltflaechen.
 *
 * Aussperren kann man sich damit nicht: serverseitig gibt es nichts zu entsperren, der Browser
 * lässt die Kopfzeile schlicht weg.
 */
export function SpielermodusLeiste() {
  const { spielermodus } = useRolle()
  if (!spielermodus) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3 bg-spotlight px-4 py-2 text-xs text-spotlight-ink"
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
      <span>Spieleransicht. Du bist weiterhin Superadmin</span>
      <button
        type="button"
        onClick={() => { void spielermodusSetzen(false) }}
        className="shrink-0 rounded-lg border border-spotlight-ink/40 px-2.5 py-1 font-semibold transition-colors hover:bg-spotlight-ink hover:text-spotlight"
      >
        Zurück
      </button>
    </div>
  )
}
