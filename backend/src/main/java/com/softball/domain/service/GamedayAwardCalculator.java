package com.softball.domain.service;

import com.softball.domain.model.Award;
import com.softball.domain.model.AwardType;
import com.softball.domain.model.BattingStats;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Pure Auswahl-Logik für Spieltags-Auszeichnungen. Kein Spring, keine I/O.
 * Reihenfolge: MVP, POWER, SPEED, ON_BASE (jeweils nur falls qualifiziert).
 */
public class GamedayAwardCalculator {

    private static final int MIN_PA = 2;

    public List<Award> calculate(final List<BattingStats> stats) {
        final List<Award> result = new ArrayList<>();
        if (stats == null || stats.isEmpty()) {
            return result;
        }

        final Optional<BattingStats> mvp = pickMvp(stats);
        mvp.ifPresent(s -> result.add(new Award(
            AwardType.MVP, s.playerId(), s.playerName(), "OPS " + s.ops().toPlainString())));

        pickPower(stats).ifPresent(s -> result.add(new Award(
            AwardType.POWER, s.playerId(), s.playerName(), s.totalBases() + " Bases")));

        pickSpeed(stats).ifPresent(s -> result.add(new Award(
            AwardType.SPEED, s.playerId(), s.playerName(), s.stolenBases() + " SB")));

        final Long mvpId = mvp.map(BattingStats::playerId).orElse(null);
        pickOnBase(stats, mvpId).ifPresent(s -> result.add(new Award(
            AwardType.ON_BASE, s.playerId(), s.playerName(), "OBP " + s.onBasePct().toPlainString())));

        return result;
    }

    private int composite(final BattingStats s) {
        return s.totalBases() + s.runsBattedIn() + s.walks() + s.stolenBases();
    }

    private boolean hasExtraBaseHit(final BattingStats s) {
        return s.doubles() + s.triples() + s.homeRuns() > 0;
    }

    private Optional<BattingStats> pickMvp(final List<BattingStats> stats) {
        return stats.stream()
            .filter(s -> s.plateAppearances() >= MIN_PA)
            .max(Comparator
                .comparingInt(this::composite)
                .thenComparing(BattingStats::ops)
                .thenComparingInt(BattingStats::plateAppearances)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }

    private Optional<BattingStats> pickPower(final List<BattingStats> stats) {
        return stats.stream()
            .filter(s -> s.plateAppearances() >= MIN_PA)
            .filter(s -> s.totalBases() > 0 && hasExtraBaseHit(s))
            .max(Comparator
                .comparingInt(BattingStats::totalBases)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }

    private Optional<BattingStats> pickSpeed(final List<BattingStats> stats) {
        return stats.stream()
            .filter(s -> s.stolenBases() > 0)
            .max(Comparator
                .comparingInt(BattingStats::stolenBases)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }

    private Optional<BattingStats> pickOnBase(final List<BattingStats> stats, final Long excludeId) {
        return stats.stream()
            .filter(s -> s.plateAppearances() >= MIN_PA)
            .filter(s -> excludeId == null || !s.playerId().equals(excludeId))
            .max(Comparator
                .comparing(BattingStats::onBasePct)
                .thenComparingInt(BattingStats::plateAppearances)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }
}
