package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.BattingStats;
import com.softball.domain.model.Game;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Player;
import com.softball.domain.model.PlayerFormPoint;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure Domain Service: baut aus den At-Bats eines Spielers seine Form-Kurve —
 * ein Punkt je Spiel, dazu der gleitende Schnitt über die letzten
 * {@link #WINDOW_PLATE_APPEARANCES} Plate Appearances.
 *
 * Warum gleitend und nicht kumulativ: ein Saisonschnitt beruhigt sich mit jedem
 * Spiel und zeigt am Ende keine Formänderung mehr. Das Fenster zeigt, wie der
 * Spieler GERADE schlägt.
 *
 * Gerechnet wird nicht selbst, sondern mit {@link BattingStatsCalculator} — AVG und
 * OBP haben im Projekt genau eine Formel, egal ob Tabelle oder Kurve.
 */
public class BattingTimelineCalculator {

    /** Fensterbreite in Plate Appearances. Rund drei Spieltage — kurz genug für Form, lang genug gegen Zufall. */
    public static final int WINDOW_PLATE_APPEARANCES = 20;

    private final BattingStatsCalculator statsCalculator = new BattingStatsCalculator();

    /**
     * @param atBats At-Bats des Spielers, bereits chronologisch sortiert (ältestes zuerst).
     * @param gamesById Spiele mit Gegner und Spieltag — die At-Bats selbst tragen nur die Spiel-ID.
     * @param stealsByGame Baserunning-Events des Spielers je Spiel (Steals zählen nicht in die Quoten,
     *                     stehen aber je Spiel in der Kurve).
     * @return ein Punkt je Spiel mit mindestens einer Plate Appearance, ältestes zuerst.
     */
    public List<PlayerFormPoint> calculate(final Player player,
                                           final List<AtBat> atBats,
                                           final Map<Long, Game> gamesById,
                                           final Map<Long, List<BaseRunningEvent>> stealsByGame) {
        final Map<Long, List<AtBat>> byGame = groupByGame(atBats);
        final List<PlayerFormPoint> points = new ArrayList<>();
        final List<AtBat> window = new ArrayList<>();
        int seenPlateAppearances = 0;

        for (final Map.Entry<Long, List<AtBat>> entry : byGame.entrySet()) {
            final List<AtBat> gameAtBats = entry.getValue();
            window.addAll(gameAtBats);
            seenPlateAppearances += gameAtBats.size();
            while (window.size() > WINDOW_PLATE_APPEARANCES) {
                window.remove(0);
            }

            final BattingStats gameStats = statsCalculator.calculateForPlayer(player, gameAtBats, List.of(), 0);
            final BattingStats rolling = statsCalculator.calculateForPlayer(player, List.copyOf(window), List.of(), 0);
            final Game game = gamesById.get(entry.getKey());
            final List<BaseRunningEvent> steals = stealsByGame.getOrDefault(entry.getKey(), List.of());

            points.add(new PlayerFormPoint(
                entry.getKey(),
                date(game),
                opponent(game),
                seasonId(game),
                seasonName(game),
                year(game),
                gameStats.plateAppearances(),
                gameStats.atBats(),
                gameStats.hits(),
                gameStats.walks(),
                gameStats.strikeouts(),
                gameStats.runsBattedIn(),
                gameStats.totalBases(),
                gameStats.hits() + gameStats.walks() + gameStats.hitByPitch(),
                count(steals, BaseRunningEventType.STOLEN_BASE),
                count(steals, BaseRunningEventType.CAUGHT_STEALING),
                rolling.battingAverage(),
                rolling.onBasePct(),
                rolling.sluggingPct(),
                rolling.ops(),
                window.size(),
                seenPlateAppearances < WINDOW_PLATE_APPEARANCES
            ));
        }
        return points;
    }

    private static int count(final List<BaseRunningEvent> events, final BaseRunningEventType type) {
        return (int) events.stream().filter(e -> e.getType() == type).count();
    }

    /** At-Bats nach Spiel bündeln, Reihenfolge der Eingabe (= chronologisch) bleibt erhalten. */
    private static Map<Long, List<AtBat>> groupByGame(final List<AtBat> atBats) {
        final Map<Long, List<AtBat>> byGame = new LinkedHashMap<>();
        for (final AtBat ab : atBats) {
            if (ab.getGame() == null || ab.getGame().getId() == null || ab.getResult() == null) continue;
            byGame.computeIfAbsent(ab.getGame().getId(), k -> new ArrayList<>()).add(ab);
        }
        return byGame;
    }

    private static java.time.LocalDate date(final Game game) {
        final GameDay day = game != null ? game.getGameDay() : null;
        return day != null ? day.getDate() : null;
    }

    private static String opponent(final Game game) {
        return game != null && game.getOpponentTeam() != null ? game.getOpponentTeam().getName() : null;
    }

    private static Long seasonId(final Game game) {
        final GameDay day = game != null ? game.getGameDay() : null;
        return day != null && day.getSeason() != null ? day.getSeason().getId() : null;
    }

    private static String seasonName(final Game game) {
        final GameDay day = game != null ? game.getGameDay() : null;
        return day != null && day.getSeason() != null ? day.getSeason().getName() : null;
    }

    private static Integer year(final Game game) {
        final GameDay day = game != null ? game.getGameDay() : null;
        return day != null && day.getSeason() != null ? day.getSeason().getYear() : null;
    }
}
