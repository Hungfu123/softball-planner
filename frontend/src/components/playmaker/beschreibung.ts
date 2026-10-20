import type { Play } from './board/types'

/**
 * Die Ausgangslage aus dem ersten Stand ableiten — sie ist kein eigenes Feld.
 * Wer im Mai dazukam, sieht dieselbe Zeile wie alle: Runner, Outs, Anzahl der Staende.
 */
export function beschreibung(play: Play): string {
  const ersterStand = play.steps[0]
  if (!ersterStand) return `${play.steps.length} Stände`
  const runner = ersterStand.markers.runners.filter(r => r.status === 'ACTIVE').length
  const runnerText = runner === 0 ? 'Keine Runner' : runner === 1 ? '1 Runner' : `${runner} Runner`
  const outs = ersterStand.outs
  return `${runnerText} · ${outs} ${outs === 1 ? 'Out' : 'Outs'} · ${play.steps.length} Stände`
}
