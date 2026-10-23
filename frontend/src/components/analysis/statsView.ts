export type StatsView = 'batting' | 'games'

/** Einzige Deutung des `view`-Parameters von /stats: alles außer „games" ist Schlagen. */
export function parseStatsView(raw: string | null): StatsView {
  return raw === 'games' ? 'games' : 'batting'
}
