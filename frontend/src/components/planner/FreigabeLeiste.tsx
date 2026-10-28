import { useState } from 'react'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { AufstellungsLage } from '@/types'

interface Props {
  lage: AufstellungsLage
  freigegebenSeit: string | null
  seitdemGeaendert: boolean
  hatAufstellung: boolean
  umschalten: (released: boolean) => Promise<void>
}

function seitText(iso: string): string {
  const d = new Date(iso)
  const tag = d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')
  const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${tag} ${zeit}`
}

const knopf =
  'shrink-0 px-2.5 py-1 text-xs rounded-lg font-semibold cursor-pointer border border-line-strong text-ink-muted hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted disabled:hover:border-line-strong'

// Beantwortet genau eine Frage: sehen die Spieler die Aufstellung gerade? Die Lage kommt fertig
// aus dem Backend (dort sitzt die 7-Uhr-Regel samt Zeitzone) — hier wird nichts umgerechnet.
// Die Freigabe ist nur einer der Gruende fuer ein Ja. "Seit der Freigabe geaendert" bleibt als
// Zusatz, weil der Trainer sonst nicht erfaehrt, dass die Spieler etwas Altes sehen.
// Punktfarben: accent = sichtbar, amber = du koenntest etwas tun, grau = nichts zu tun.
export function FreigabeLeiste({ lage, freigegebenSeit, seitdemGeaendert, hatAufstellung, umschalten }: Props) {
  const [fragt, setFragt] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  const ausfuehren = async (released: boolean) => {
    setLaeuft(true)
    try {
      await umschalten(released)
    } finally {
      setLaeuft(false)
    }
  }

  const freigegeben = lage === 'FREIGEGEBEN' && freigegebenSeit !== null
  const geaendert = freigegeben && seitdemGeaendert

  let punkt: string
  let text: string
  switch (lage) {
    case 'GESPERRT':
      punkt = hatAufstellung ? 'bg-amber-400' : 'bg-line-strong'
      text = hatAufstellung ? 'Noch nicht für Spieler freigegeben' : 'Noch nichts aufgestellt'
      break
    case 'FREIGEGEBEN':
      punkt = geaendert ? 'bg-amber-400' : 'bg-accent'
      text = freigegebenSeit === null
        ? 'Für Spieler sichtbar'
        : `${geaendert ? 'Seit der Freigabe geändert' : 'Für Spieler sichtbar'} · ${seitText(freigegebenSeit)}`
      break
    case 'HEUTE_VOR_SIEBEN':
      // Grau, nicht amber: Nichtstun ist hier richtig, ab 7 Uhr wird es von selbst sichtbar.
      punkt = 'bg-line-strong'
      text = 'Ab 7 Uhr für alle sichtbar'
      break
    case 'OFFEN_AB_SIEBEN':
      punkt = 'bg-accent'
      text = 'Für alle sichtbar · seit 7 Uhr'
      break
    case 'OFFEN_VERGANGEN':
      punkt = 'bg-accent'
      text = 'Für alle sichtbar · Spieltag vorbei'
      break
  }

  const freigebenKnopf =
    lage === 'GESPERRT' ? 'Freigeben'
    : lage === 'HEUTE_VOR_SIEBEN' ? 'Früher freigeben'
    : geaendert ? 'Erneut freigeben'
    : null

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 mt-1">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full inline-block ${punkt}`} />
        <span>{text}</span>
      </div>
      <div className="flex items-center gap-2">
        {freigebenKnopf && (
          <button
            type="button"
            className={knopf}
            disabled={!hatAufstellung || laeuft}
            onClick={() => ausfuehren(true)}
          >
            {freigebenKnopf}
          </button>
        )}
        {freigegeben && (
          <button type="button" className={knopf} disabled={laeuft} onClick={() => setFragt(true)}>
            zurücknehmen
          </button>
        )}
      </div>
      {fragt && (
        <ConfirmModal
          title="Freigabe zurücknehmen?"
          // Kopplung: der Satz stimmt nur, weil "zurücknehmen" ausschliesslich bei FREIGEGEBEN
          // erscheint. In OFFEN_AB_SIEBEN/OFFEN_VERGANGEN ist die Aufstellung ohnehin offen und
          // der Knopf fehlt. Kommt er dort je hin, muss dieser Text mit.
          message="Die Aufstellung verschwindet dann wieder aus der Spieler-Ansicht."
          confirmLabel="Zurücknehmen"
          onConfirm={() => { setFragt(false); void ausfuehren(false) }}
          onCancel={() => setFragt(false)}
        />
      )}
    </div>
  )
}
