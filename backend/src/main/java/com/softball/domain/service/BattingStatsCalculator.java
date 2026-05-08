package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.BattingStats;
import com.softball.domain.model.Player;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure Domain Service: berechnet Batting-Statistiken aus rohen Events.
 * Kein Spring, kein I/O. Voll testbar.
 *
 * Formeln:
 *   BA  (Batting Average) = Hits / At-Bats
 *   OBP (On-Base %)       = (Hits + Walks + HBP) / (At-Bats + Walks + HBP + SacrificeFlies)
 *   SLG (Slugging)        = Total Bases / At-Bats
 * In unserer V1 (ohne Sacrifice Flies) vereinfacht sich OBP-Nenner auf Plate Appearances.
 */
public class BattingStatsCalculator {

    public List<BattingStats> calculateForPlayers(final List<Player> players,
                                                   final List<AtBat> atBats,
                                                   final List<BaseRunningEvent> stealingEvents) {
        final Map<Long, List<AtBat>> atBatsByPlayer = new HashMap<>();
        for (final AtBat ab : atBats) {
            if (ab.getBatter() == null) continue;
            atBatsByPlayer.computeIfAbsent(ab.getBatter().getId(), k -> new java.util.ArrayList<>()).add(ab);
        }

        final Map<Long, List<BaseRunningEvent>> stealsByPlayer = new HashMap<>();
        for (final BaseRunningEvent e : stealingEvents) {
            if (e.getRunner() == null) continue;
            stealsByPlayer.computeIfAbsent(e.getRunner().getId(), k -> new java.util.ArrayList<>()).add(e);
        }

        return players.stream()
            .map(p -> calculateForPlayer(p,
                atBatsByPlayer.getOrDefault(p.getId(), List.of()),
                stealsByPlayer.getOrDefault(p.getId(), List.of())))
            .toList();
    }

    public BattingStats calculateForPlayer(final Player player,
                                            final List<AtBat> playerAtBats,
                                            final List<BaseRunningEvent> playerStealingEvents) {
        int plateAppearances = 0;
        int atBats = 0;
        int hits = 0, singles = 0, doubles = 0, triples = 0, homeRuns = 0;
        int walks = 0, hbp = 0, strikeouts = 0, outs = 0;
        int reachedOnError = 0;
        int totalBases = 0;
        int rbi = 0;

        for (final AtBat ab : playerAtBats) {
            final AtBatResult r = ab.getResult();
            if (r == null) continue; // Defensive: AtBat ohne Result wird ignoriert (sollte DB-seitig NOT NULL sein)
            plateAppearances++;
            if (r.countsAsAtBat()) atBats++;
            if (r.isHit()) hits++;
            switch (r) {
                case SINGLE -> singles++;
                case DOUBLE -> doubles++;
                case TRIPLE -> triples++;
                case HOMERUN -> homeRuns++;
                case WALK -> walks++;
                case HIT_BY_PITCH -> hbp++;
                case STRIKEOUT -> strikeouts++;
                case OUT -> outs++;
                case REACHED_ON_ERROR -> reachedOnError++;
            }
            totalBases += r.totalBases();
            if (ab.getRbi() != null) rbi += ab.getRbi();
        }

        int stolenBases = 0;
        int caughtStealing = 0;
        for (final BaseRunningEvent e : playerStealingEvents) {
            if (e.getType() == BaseRunningEventType.STOLEN_BASE) stolenBases++;
            else if (e.getType() == BaseRunningEventType.CAUGHT_STEALING) caughtStealing++;
            // OUT_ON_PLAY zählt NICHT für Batter-Stats — ist nur ein Inning-Out-Event
        }

        final BigDecimal ba = divide(hits, atBats);
        final BigDecimal obp = divide(hits + walks + hbp, plateAppearances);
        final BigDecimal slg = divide(totalBases, atBats);

        return new BattingStats(
            player.getId(), player.getName(),
            plateAppearances, atBats, hits,
            singles, doubles, triples, homeRuns,
            walks, hbp, strikeouts, outs,
            reachedOnError,
            stolenBases, caughtStealing, rbi, totalBases,
            ba, obp, slg
        );
    }

    private static BigDecimal divide(final int numerator, final int denominator) {
        if (denominator == 0) return BigDecimal.ZERO.setScale(3);
        return BigDecimal.valueOf(numerator)
            .divide(BigDecimal.valueOf(denominator), 3, RoundingMode.HALF_UP);
    }
}
