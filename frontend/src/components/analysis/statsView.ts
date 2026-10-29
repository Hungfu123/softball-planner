export type StatsView = 'batting' | 'games'

/** Einzige Deutung des `view`-Parameters von /stats: alles außer „games" ist Schlagen. */
export function parseStatsView(raw: string | null): StatsView {
  return raw === 'games' ? 'games' : 'batting'
}

/**
 * Dasselbe, aber mit dem Blick des Betrachters: **Einsätze ist für Spieler zu.**
 *
 * <p>Die Tabelle stellt den ganzen Kader nebeneinander — wer stand wie oft auf welcher
 * Position. Das ist derselbe Unterschied wie bei den Trainingszahlen: die eigene Zahl ist
 * eine Auskunft, dieselbe Zahl neben der des Nebenmanns ist ein Anspruch. Seinen eigenen
 * Einsatz sieht jeder im Profil (`/players/:id`, „Einsatz und Verfügbarkeit"), und dort steht
 * er ohne Rangliste daneben.
 *
 * <p>Das ist **Verstecken, kein Verbot** — anders als bei der Aufstellung. Die gezählten
 * Einsätze stammen aus vergangenen Spieltagen, und die sind für Spieler ausdrücklich offen
 * (`AufstellungSichtbarkeit`): derselbe Stoff steht im Reiter Spiel-Verlauf, der bleibt. Hier
 * geht es nicht um ein Geheimnis, sondern darum, Spielern keine Rangliste über sich selbst
 * hinzustellen. Wer die Grenze zur Sperre machen will, fängt beim Backend an, nicht hier.
 *
 * <p>Gelesen wird die Rolle über `useRolle` und nicht über `me.role`: der Spielermodus
 * soll genau das hier zeigen, und `/api/me` weiß von ihm nichts.
 */
export function sichtbareStatsView(raw: string | null, istAdmin: boolean): StatsView {
  const gewuenscht = parseStatsView(raw)
  return gewuenscht === 'games' && !istAdmin ? 'batting' : gewuenscht
}
