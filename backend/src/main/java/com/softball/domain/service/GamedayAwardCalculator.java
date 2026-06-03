package com.softball.domain.service;

import com.softball.domain.model.Award;
import com.softball.domain.model.AwardType;
import com.softball.domain.model.BattingStats;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Pure Auswahl-Logik für Spieltags-Auszeichnungen. Kein Spring, keine I/O.
 * Reihenfolge: MVP, TOP_HITTER, POWER, RBI, SPEED, ON_BASE, WALK (jeweils nur falls qualifiziert).
 *
 * Gleichstand: Teilen sich mehrere Spieler den besten (angezeigten) Stat-Wert, werden ALLE
 * als Gewinner geführt — {@code playerName} listet die Namen kommagetrennt, {@code playerId}
 * ist dann {@code null} (mehrdeutig).
 */
public class GamedayAwardCalculator {

    private static final int MIN_PA = 2;

    public List<Award> calculate(final List<BattingStats> stats) {
        final List<Award> result = new ArrayList<>();
        if (stats == null || stats.isEmpty()) {
            return result;
        }

        final List<BattingStats> mvp = topTied(stats,
            s -> s.plateAppearances() >= MIN_PA,
            Comparator.comparing(BattingStats::ops));
        if (!mvp.isEmpty()) {
            result.add(award(AwardType.MVP, mvp, "OPS " + mvp.get(0).ops().toPlainString()));
        }
        final Set<Long> mvpIds = ids(mvp);

        final List<BattingStats> topHitter = topTiedSharedWithMvp(stats,
            s -> s.plateAppearances() >= MIN_PA && s.battingAverage().signum() > 0,
            Comparator.comparing(BattingStats::battingAverage), mvpIds);
        if (!topHitter.isEmpty()) {
            result.add(award(AwardType.TOP_HITTER, topHitter, "AVG " + fmtAvg(topHitter.get(0).battingAverage())));
        }

        final List<BattingStats> power = topTied(stats,
            s -> s.plateAppearances() >= MIN_PA && s.totalBases() > 0 && hasExtraBaseHit(s),
            Comparator.comparingInt(BattingStats::totalBases));
        if (!power.isEmpty()) {
            result.add(award(AwardType.POWER, power, power.get(0).totalBases() + " Bases"));
        }

        final List<BattingStats> rbi = topTiedSharedWithMvp(stats,
            s -> s.plateAppearances() >= MIN_PA && s.runsBattedIn() > 0,
            Comparator.comparingInt(BattingStats::runsBattedIn), mvpIds);
        if (!rbi.isEmpty()) {
            result.add(award(AwardType.RBI, rbi, rbi.get(0).runsBattedIn() + " RBI"));
        }

        final List<BattingStats> speed = topTied(stats,
            s -> s.stolenBases() > 0,
            Comparator.comparingInt(BattingStats::stolenBases));
        if (!speed.isEmpty()) {
            result.add(award(AwardType.SPEED, speed, speed.get(0).stolenBases() + " SB"));
        }

        final List<BattingStats> onBase = topTiedSharedWithMvp(stats,
            s -> s.plateAppearances() >= MIN_PA,
            Comparator.comparing(BattingStats::onBasePct), mvpIds);
        if (!onBase.isEmpty()) {
            result.add(award(AwardType.ON_BASE, onBase, "OBP " + onBase.get(0).onBasePct().toPlainString()));
        }

        final List<BattingStats> walks = topTiedSharedWithMvp(stats,
            s -> s.walks() > 0,
            Comparator.comparingInt(BattingStats::walks), mvpIds);
        if (!walks.isEmpty()) {
            result.add(award(AwardType.WALK, walks, walks.get(0).walks() + " BB"));
        }

        return result;
    }

    /**
     * Alle Spieler, die den besten Wert der Metrik teilen (Gleichstand → mehrere Gewinner).
     * Die Metrik vergleicht NUR den angezeigten Stat (kein PA-/ID-Tiebreak), damit ein echter
     * Gleichstand auch als solcher erkannt wird.
     */
    private List<BattingStats> topTied(final List<BattingStats> stats,
                                       final Predicate<BattingStats> eligible,
                                       final Comparator<BattingStats> metric) {
        return topOf(stats.stream().filter(eligible).toList(), metric);
    }

    /**
     * Neben-Award mit MVP-Sonderregel: Der MVP gewinnt einen Neben-Award nicht ALLEIN
     * (kein Doppel-Krönen). Teilt er den Spitzenwert aber mit mindestens einem Nicht-MVP
     * (echter Gleichstand), wird er mitgenannt. Steht nur der MVP an der Spitze, geht der
     * Award an den/die nächstbesten Nicht-MVP.
     */
    private List<BattingStats> topTiedSharedWithMvp(final List<BattingStats> stats,
                                                    final Predicate<BattingStats> eligible,
                                                    final Comparator<BattingStats> metric,
                                                    final Set<Long> mvpIds) {
        final List<BattingStats> pool = stats.stream().filter(eligible).toList();
        final List<BattingStats> winners = topOf(pool, metric);
        final boolean hasNonMvp = winners.stream().anyMatch(s -> !mvpIds.contains(s.playerId()));
        if (hasNonMvp) {
            return winners; // MVP wird bei echtem Tie mitgelistet
        }
        // Nur MVP(s) an der Spitze → ausschließen, nächstbesten Nicht-MVP nehmen
        return topOf(pool.stream().filter(s -> !mvpIds.contains(s.playerId())).toList(), metric);
    }

    private List<BattingStats> topOf(final List<BattingStats> pool, final Comparator<BattingStats> metric) {
        final Optional<BattingStats> best = pool.stream().max(metric);
        if (best.isEmpty()) {
            return List.of();
        }
        final BattingStats top = best.get();
        return pool.stream().filter(s -> metric.compare(s, top) == 0).toList();
    }

    /**
     * Baut den Award aus allen Gewinnern: Namen alphabetisch kommagetrennt, {@code playerId} nur
     * bei einem einzigen Gewinner gesetzt (sonst {@code null}, da mehrdeutig).
     */
    private Award award(final AwardType type, final List<BattingStats> winners, final String displayValue) {
        final List<BattingStats> sorted = winners.stream()
            .sorted(Comparator.comparing(BattingStats::playerName, String.CASE_INSENSITIVE_ORDER))
            .toList();
        final String names = sorted.stream().map(BattingStats::playerName).collect(Collectors.joining(", "));
        final Long playerId = sorted.size() == 1 ? sorted.get(0).playerId() : null;
        return new Award(type, playerId, names, displayValue);
    }

    private Set<Long> ids(final List<BattingStats> winners) {
        return winners.stream().map(BattingStats::playerId).collect(Collectors.toSet());
    }

    /** AVG ohne führende Null (Baseball-Konvention): 0.833 → .833, 1.000 → 1.000. */
    private String fmtAvg(final java.math.BigDecimal avg) {
        final String s = avg.setScale(3, java.math.RoundingMode.HALF_UP).toPlainString();
        return s.startsWith("0") ? s.substring(1) : s;
    }

    private boolean hasExtraBaseHit(final BattingStats s) {
        return s.doubles() + s.triples() + s.homeRuns() > 0;
    }
}
