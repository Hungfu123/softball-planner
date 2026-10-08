package com.softball.adapter.dto;

import com.softball.domain.model.BattingSlotStat;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public record BattingSlotStatsResponse(
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
    int outs,
    BigDecimal battingAverage,
    BigDecimal onBasePct,
    List<SlotPlayerResponse> players
) {
    public static BattingSlotStatsResponse from(final BattingSlotStat stat) {
        return new BattingSlotStatsResponse(
            stat.slot(), stat.plateAppearances(), stat.atBats(), stat.hits(),
            stat.doubles(), stat.triples(), stat.homeRuns(),
            stat.walks(), stat.hitByPitch(), stat.strikeouts(), stat.outs(),
            rate(stat.battingAverage()), rate(stat.onBasePct()),
            stat.players().stream().map(SlotPlayerResponse::from).toList()
        );
    }

    /** Wer diesen Platz wie oft besetzte und wie oft ER dort auf Base kam. */
    public record SlotPlayerResponse(String name, int plateAppearances, int onBase) {
        public static SlotPlayerResponse from(final BattingSlotStat.SlotPlayerStat player) {
            return new SlotPlayerResponse(player.name(), player.plateAppearances(), player.onBase());
        }
    }

    private static BigDecimal rate(final double value) {
        return BigDecimal.valueOf(value).setScale(3, RoundingMode.HALF_UP);
    }
}
