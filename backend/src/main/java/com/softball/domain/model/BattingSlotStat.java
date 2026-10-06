package com.softball.domain.model;

/**
 * Batting-Slot-Analyse über alle Spiele: was hat Lineup-Platz 1..N produziert,
 * unabhängig davon, WER dort stand. Beantwortet "funktioniert unsere Reihenfolge?"
 * — z.B. wenn Platz 5-7 kaum On-Base kommen, liegt die Last zu weit oben.
 */
public record BattingSlotStat(
    int slot,
    int plateAppearances,
    int atBats,
    int hits,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int hitByPitch,
    int strikeouts,
    int outs
) {

    public double battingAverage() {
        return atBats == 0 ? 0 : (double) hits / atBats;
    }

    public double onBasePct() {
        // OBP-Vereinfachung wie BattingStatsCalculator (ohne SF): (H + BB + HBP) / PA
        return plateAppearances == 0 ? 0
            : (double) (hits + walks + hitByPitch) / plateAppearances;
    }
}
