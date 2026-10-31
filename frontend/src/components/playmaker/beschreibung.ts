import type { Play } from './board/types'

/**
 * Die Ausgangslage aus dem ersten Stand ableiten — sie ist kein eigenes Feld.
 * Wer im Mai dazukam, sieht dieselbe Zeile wie alle: Runner, Outs, Anzahl der Staende.
 */
export function beschreibung(play: Play): string {
  const ersterStand = play.steps[0]
  if (!ersterStand) return staende(play.steps.length)
  const runner = ersterStand.markers.runners.filter(r => r.status === 'ACTIVE').length
  const runnerText = runner === 0 ? 'Keine Runner' : runner === 1 ? '1 Runner' : `${runner} Runner`
  const outs = ersterStand.outs
  return `${runnerText} · ${outs} ${outs === 1 ? 'Out' : 'Outs'} · ${staende(play.steps.length)}`
}

/** „1 Stand", nicht „1 Stände" — die Standard-Aufstellung hat genau einen. */
function staende(anzahl: number): string {
  return `${anzahl} ${anzahl === 1 ? 'Stand' : 'Stände'}`
}
