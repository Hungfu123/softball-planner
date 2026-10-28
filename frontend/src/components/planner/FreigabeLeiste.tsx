import { useState } from 'react'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

interface Props {
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

const leiseKnopf =
  'px-3 py-1.5 text-sm rounded-lg font-semibold cursor-pointer border border-line-strong text-ink-muted hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors'
const hauptKnopf =
  'px-3 py-1.5 text-sm rounded-lg font-bold cursor-pointer bg-accent text-white hover:bg-navy-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent'

// Zustand des Spieltags, kein Werkzeug. Der dritte Zustand ist eine Auskunft fuer den Trainer:
// Spieler sehen nach der Freigabe immer den Live-Stand, der Haken sperrt nichts.
export function FreigabeLeiste({ freigegebenSeit, seitdemGeaendert, hatAufstellung, umschalten }: Props) {
  const [fragt, setFragt] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const freigegeben = freigegebenSeit !== null

  const ausfuehren = async (released: boolean) => {
    setLaeuft(true)
    try {
      await umschalten(released)
    } finally {
      setLaeuft(false)
    }
  }

  const punkt = freigegeben && !seitdemGeaendert
    ? 'bg-accent'
    : hatAufstellung ? 'bg-amber-400' : 'bg-line-strong'

  let text: string
  if (!freigegeben) text = 'Noch nicht für Spieler freigegeben'
  else if (seitdemGeaendert) text = `Seit der Freigabe geändert · ${seitText(freigegebenSeit)}`
  else text = `Für Spieler freigegeben · ${seitText(freigegebenSeit)}`

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 mt-1">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full inline-block ${punkt}`} />
        <span>{text}</span>
      </div>
      <div className="flex items-center gap-2">
        {(!freigegeben || seitdemGeaendert) && (
          <button
            type="button"
            className={hauptKnopf}
            disabled={!hatAufstellung || laeuft}
            onClick={() => ausfuehren(true)}
          >
            {freigegeben ? 'Erneut freigeben' : 'Freigeben'}
          </button>
        )}
        {freigegeben && (
          <button type="button" className={leiseKnopf} disabled={laeuft} onClick={() => setFragt(true)}>
            zurücknehmen
          </button>
        )}
      </div>
      {fragt && (
        <ConfirmModal
          title="Freigabe zurücknehmen?"
          message="Die Aufstellung verschwindet dann wieder aus der Spieler-Ansicht."
          confirmLabel="Zurücknehmen"
          onConfirm={() => { setFragt(false); void ausfuehren(false) }}
          onCancel={() => setFragt(false)}
        />
      )}
    </div>
  )
}
