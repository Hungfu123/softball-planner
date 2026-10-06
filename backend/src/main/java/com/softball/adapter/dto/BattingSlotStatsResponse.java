package com.softball.adapter.dto;

import com.softball.domain.model.BattingSlotStat;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record BattingSlotStatsResponse(
    int slot,
    int plateAppearances,
    int atBats,
    int hits,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int strikeouts,
    int outs,
    BigDecimal battingAverage,
    BigDecimal onBasePct
) {
    public static BattingSlotStatsResponse from(final BattingSlotStat stat) {
        return new BattingSlotStatsResponse(
            stat.slot(), stat.plateAppearances(), stat.atBats(), stat.hits(),
            stat.doubles(), stat.triples(), stat.homeRuns(),
            stat.walks(), stat.strikeouts(), stat.outs(),
            rate(stat.battingAverage()), rate(stat.onBasePct())
        );
    }

    private static BigDecimal rate(final double value) {
        return BigDecimal.valueOf(value).setScale(3, RoundingMode.HALF_UP);
    }
}
