package com.softball.adapter.dto;

import com.softball.domain.model.BattingStats;

import java.math.BigDecimal;

public record PlayerBattingStatsResponse(
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
    BigDecimal ops
) {
    public static PlayerBattingStatsResponse from(final BattingStats s) {
        return new PlayerBattingStatsResponse(
            s.playerId(), s.playerName(),
            s.plateAppearances(), s.atBats(), s.hits(),
            s.singles(), s.doubles(), s.triples(), s.homeRuns(),
            s.walks(), s.hitByPitch(), s.strikeouts(), s.outs(),
            s.reachedOnError(),
            s.stolenBases(), s.caughtStealing(), s.pickoffs(), s.runsBattedIn(), s.totalBases(),
            s.battingAverage(), s.onBasePct(), s.sluggingPct(), s.ops()
        );
    }
}
