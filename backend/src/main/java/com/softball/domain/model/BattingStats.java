package com.softball.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Batting-Statistik pro Spieler (Game/GameDay/Season-Scope).
 * Immutable Value-Object. Quoten als BigDecimal mit 3 Nachkommastellen (MLB-Konvention).
 */
public record BattingStats(
    Long playerId,
    String playerName,
    int plateAppearances,
    int atBats,
    int hits,
    int singles,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int hitByPitch,
    int strikeouts,
    int outs,
    int reachedOnError,
    int stolenBases,
    int caughtStealing,
    int pickoffs,
    int runsBattedIn,
    int totalBases,
    BigDecimal battingAverage,
    BigDecimal onBasePct,
    BigDecimal sluggingPct,
    boolean qualified
) {
    public BigDecimal ops() {
        return onBasePct.add(sluggingPct).setScale(3, RoundingMode.HALF_UP);
    }
}
