export type ScopeKind = 'season' | 'year' | 'allTime' | 'gameDay' | 'game' | 'opponent'

/** Die einzige Quelle für die Wörter der Zeiträume: Knopf, Blatt und PDF lesen von hier. */
export const SCOPE_LABEL_MAP: Record<ScopeKind, string> = {
  season: 'Saison',
  year: 'Jahr',
  allTime: 'Alle Zeit',
  gameDay: 'Spieltag',
  game: 'Spiel',
  opponent: 'Nach Gegner',
}

/** Der Zeitraum, der aus der URL kommt und nicht gewählt wird. */
export const THIS_GAME_LABEL = 'Dieses Spiel'

/** Die wählbaren Zeiträume in der Reihenfolge des Blatts (ohne „Spiel"). */
export const SCOPES: { kind: ScopeKind; label: string }[] =
  (['gameDay', 'season', 'year', 'opponent', 'allTime'] as const)
    .map(kind => ({ kind, label: SCOPE_LABEL_MAP[kind] }))
