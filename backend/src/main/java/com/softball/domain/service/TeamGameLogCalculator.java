package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BattingSlotStat;
import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.TeamGameLog;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Pure Domain Service: Team-Offensiv-Auswertung über ganze Spiele.
 * Kein Spring, kein I/O. Voll testbar.
 *
 * Zwei Fragen:
 *  1. "Was haben wir pro Spiel produziert?" — {@link #calculateGameLogs}: Team-Zahlen
 *     je Spiel inklusive Inning-Verlauf und Left-on-Base ("wer kam auf Base, kam aber
 *     nicht Home, weil das Inning mit 3 Aus endete").
 *  2. "Funktioniert unsere Batting-Reihenfolge?" — {@link #calculateBattingSlots}:
 *     was haben die Lineup-Plätze 1..N produziert, egal wer dort stand.
 *
 * Left-on-Base-Regel: Runner im Base-State-Nach dem LETZTEN At-Bat eines Innings,
 * wenn das Inning damit endete — klassisch der 3. Out, oder ein bei Zeitablauf vor
 * 3 Outs erzwungener Inning-Wechsel (Folge-Inning existiert). Walkoff-Innings und
 * laufende Live-Innings stranden korrekt niemanden. Runs pro Inning sind Batting-Runs
 * (runsScored); Steal-of-Home-Runs fehlen dort (siehe TeamGameLog).
 */
public class TeamGameLogCalculator {

    public List<TeamGameLog> calculateGameLogs(final List<Game> games,
                                               final List<AtBat> atBats,
                                               final Map<Long, Integer> liveScores,
                                               final Map<Long, String> playerNames) {
        final Map<Long, List<AtBat>> atBatsByGame = new HashMap<>();
        for (final AtBat ab : atBats) {
            if (ab.getGame() == null || ab.getGame().getId() == null) continue;
            atBatsByGame.computeIfAbsent(ab.getGame().getId(), k -> new ArrayList<>()).add(ab);
        }

        final List<TeamGameLog> logs = new ArrayList<>();
        for (final Game game : games) {
            final List<AtBat> gameAtBats = atBatsByGame.getOrDefault(game.getId(), List.of());
            logs.add(calculateGameLog(game, gameAtBats, liveScores, playerNames));
        }
        logs.sort(Comparator.comparing(TeamGameLog::date, Comparator.nullsLast(Comparator.reverseOrder())));
        return logs;
    }

    private TeamGameLog calculateGameLog(final Game game,
                                         final List<AtBat> gameAtBats,
                                         final Map<Long, Integer> liveScores,
                                         final Map<Long, String> playerNames) {
        final boolean hasAtBatData = !gameAtBats.isEmpty();
        // Effektiver Score wie TeamDirectory/GameDayResponse: Live-Score sobald gescort, sonst DB-Score
        final Integer scoreUs = hasAtBatData ? liveScores.get(game.getId()) : game.getScoreUs();

        final Map<Integer, List<AtBat>> byInning = new LinkedHashMap<>();
        for (final AtBat ab : gameAtBats) {
            byInning.computeIfAbsent(ab.getInning(), k -> new ArrayList<>()).add(ab);
        }

        int plateAppearances = 0, atBats = 0, hits = 0, doubles = 0, triples = 0, homeRuns = 0;
        int walks = 0, strikeouts = 0, hitByPitch = 0, onBase = 0, leftOnBase = 0;
        final Map<String, Integer> strandedByPlayer = new LinkedHashMap<>();
        final List<TeamGameLog.InningLog> innings = new ArrayList<>();

        for (final Map.Entry<Integer, List<AtBat>> entry : byInning.entrySet()) {
            final List<AtBat> inningAtBats = new ArrayList<>(entry.getValue());
            // sequence aufsteigend — der letzte At-Bat entscheidet über Stranded
            inningAtBats.sort(Comparator.comparing(AtBat::getSequence, Comparator.nullsLast(Comparator.naturalOrder())));

            int inningRuns = 0, inningHits = 0, inningOnBase = 0, inningWalks = 0, inningOuts = 0;
            final Map<String, Integer> hitsByPlayer = new LinkedHashMap<>();
            final List<TeamGameLog.InningLog.AtBatSnippet> atBatSnippets = new ArrayList<>();
            for (final AtBat ab : inningAtBats) {
                final AtBatResult r = ab.getResult();
                if (r == null) continue;
                atBatSnippets.add(new TeamGameLog.InningLog.AtBatSnippet(
                    ab.getBatter() != null ? playerNames.getOrDefault(ab.getBatter().getId(), "Unbekannt") : "Unbekannt",
                    r, ab.getRunsScored() != null ? ab.getRunsScored() : 0));
                // AUTOMATIC_OUT ist laut Domain-Regel weder At-Bat noch Plate Appearance
                if (r != AtBatResult.AUTOMATIC_OUT) plateAppearances++;
                if (r.countsAsAtBat()) atBats++;
                if (r.isHit()) {
                    hits++;
                    inningHits++;
                    if (ab.getBatter() != null) {
                        hitsByPlayer.merge(playerNames.getOrDefault(ab.getBatter().getId(), "Unbekannt"), 1, Integer::sum);
                    }
                }
                switch (r) {
                    case DOUBLE -> doubles++;
                    case TRIPLE -> triples++;
                    case HOMERUN, INSIDE_PARK_HR -> homeRuns++;
                    case WALK -> { walks++; inningWalks++; }
                    case HIT_BY_PITCH -> hitByPitch++;
                    case STRIKEOUT -> strikeouts++;
                    default -> { }
                }
                if (r.reachedBase()) { inningOnBase++; onBase++; }
                if (r.isOut()) inningOuts++;
                if (ab.getRunsScored() != null) inningRuns += ab.getRunsScored();
            }

            // Inning definitiv vorbei, wenn ein Folge-Inning existiert — der Wechsel kann
            // auch vor 3 Outs erzwungen worden sein (Zeitablauf), dann bleiben Runner ebenfalls hängen
            final boolean hasNextInning = byInning.keySet().stream().anyMatch(k -> k > entry.getKey());
            final List<String> stranded = strandedAtInningEnd(inningAtBats, hasNextInning, playerNames);
            leftOnBase += stranded.size();
            for (final String name : stranded) {
                strandedByPlayer.merge(name, 1, Integer::sum);
            }
            innings.add(new TeamGameLog.InningLog(entry.getKey(), inningRuns, inningHits,
                inningOnBase, inningWalks, inningOuts, stranded, outMakerOf(inningAtBats, playerNames), hitsByPlayer,
                atBatSnippets));
        }

        return new TeamGameLog(
            game.getId(), dateOf(game), opponentName(game), leagueName(game), yearOf(game),
            scoreUs, game.getScoreThem(), hasAtBatData,
            plateAppearances, atBats, hits, doubles, triples, homeRuns,
            walks, strikeouts, hitByPitch, onBase, leftOnBase,
            strandedByPlayer, innings
        );
    }

    /**
     * Wessen At-Bat das Inning beendet hat: der Batter des LETZTEN At-Bats, wenn dieser
     * ein Out war — sonst (Walkoff, erzwungener Wechsel nach Hit, laufendes Inning) null.
     * Bei gestrandeten Runnern ist das der "Verursacher": sein Aus ließ sie hängen.
     */
    private String outMakerOf(final List<AtBat> inningAtBats, final Map<Long, String> playerNames) {
        if (inningAtBats.isEmpty()) return null;
        final AtBat last = inningAtBats.get(inningAtBats.size() - 1);
        if (last.getResult() == null || !last.getResult().isOut() || last.getBatter() == null) return null;
        return playerNames.getOrDefault(last.getBatter().getId(), "Unbekannt");
    }

    /**
     * Runner, die beim Inning-Ende noch auf Base standen — namentlich. Ende heißt:
     * der letzte At-Bat war der 3. Out, oder das Inning wurde (bei Zeitablauf) vor
     * 3 Outs abgebrochen und ein Folge-Inning existiert. Ein laufendes Live-Inning
     * (kein Out, kein Nachfolger) strandet niemanden — ebenso ein Walkoff.
     */
    private List<String> strandedAtInningEnd(final List<AtBat> inningAtBats,
                                              final boolean hasNextInning,
                                              final Map<Long, String> playerNames) {
        if (inningAtBats.isEmpty()) return List.of();
        final AtBat last = inningAtBats.get(inningAtBats.size() - 1);
        if (last.getResult() == null) return List.of();
        final boolean inningOver = last.getResult().isOut() || hasNextInning;
        if (!inningOver) return List.of();

        final List<String> names = new ArrayList<>();
        if (last.getBaseStateAfter() != null) {
            addRunner(names, last.getBaseStateAfter().first(), playerNames);
            addRunner(names, last.getBaseStateAfter().second(), playerNames);
            addRunner(names, last.getBaseStateAfter().third(), playerNames);
        }
        return names;
    }

    private void addRunner(final List<String> names, final Long playerId, final Map<Long, String> playerNames) {
        if (playerId == null) return;
        names.add(playerNames.getOrDefault(playerId, "Unbekannt"));
    }

    /**
     * Was haben die Batting-Plätze 1..N über alle Spiele hinweg produziert?
     * Ein At-Bat zählt für den Slot, an dem der Batter im Lineup DIESES Spiels stand —
     * DH-Batter zählen für den Slot ihres DH-Host-Eintrags.
     */
    public List<BattingSlotStat> calculateBattingSlots(final List<LineupEntry> lineupEntries,
                                                       final List<AtBat> atBats) {
        // (gameId, batterId) -> Slot
        final Map<Long, Map<Long, Integer>> slotByGameAndPlayer = new HashMap<>();
        for (final LineupEntry entry : lineupEntries) {
            if (entry.getGame() == null || entry.getBattingOrder() == null) continue;
            final Map<Long, Integer> byPlayer = slotByGameAndPlayer
                .computeIfAbsent(entry.getGame().getId(), k -> new HashMap<>());
            if (entry.getPlayer() != null) byPlayer.put(entry.getPlayer().getId(), entry.getBattingOrder());
            if (entry.getDhBatterPlayer() != null) byPlayer.put(entry.getDhBatterPlayer().getId(), entry.getBattingOrder());
        }

        final Map<Integer, SlotAccumulator> acc = new LinkedHashMap<>();
        for (final AtBat ab : atBats) {
            if (ab.getGame() == null || ab.getBatter() == null || ab.getResult() == null) continue;
            final Integer slot = slotByGameAndPlayer
                .getOrDefault(ab.getGame().getId(), Map.of())
                .get(ab.getBatter().getId());
            if (slot == null) continue; // Batter ohne Lineup-Zuordnung — Daten-Anomalie, nicht mitzählen

            final SlotAccumulator a = acc.computeIfAbsent(slot, k -> new SlotAccumulator());
            final AtBatResult r = ab.getResult();
            final String batterName = ab.getBatter().getName();
            final SlotAccumulator.PlayerPa pp =
                a.playersByName.computeIfAbsent(batterName, k -> new SlotAccumulator.PlayerPa());
            if (r != AtBatResult.AUTOMATIC_OUT) { // AUTOMATIC_OUT: keine PA
                a.plateAppearances++;
                pp.plateAppearances++;
            }
            if (r.reachedBase()) pp.onBase++;
            if (r.countsAsAtBat()) a.atBats++;
            if (r.isHit()) a.hits++;
            switch (r) {
                case DOUBLE -> a.doubles++;
                case TRIPLE -> a.triples++;
                case HOMERUN, INSIDE_PARK_HR -> a.homeRuns++;
                case WALK -> a.walks++;
                case HIT_BY_PITCH -> a.hitByPitch++;
                case STRIKEOUT -> a.strikeouts++;
                default -> { }
            }
            if (r.isOut()) a.outs++;
        }

        return acc.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> {
                final SlotAccumulator a = e.getValue();
                final List<BattingSlotStat.SlotPlayerStat> players = a.playersByName.entrySet().stream()
                    .sorted((x, y) -> Integer.compare(y.getValue().plateAppearances, x.getValue().plateAppearances))
                    .map(e2 -> new BattingSlotStat.SlotPlayerStat(
                        e2.getKey(), e2.getValue().plateAppearances, e2.getValue().onBase))
                    .toList();
                return new BattingSlotStat(e.getKey(),
                    a.plateAppearances, a.atBats, a.hits, a.doubles, a.triples, a.homeRuns,
                    a.walks, a.hitByPitch, a.strikeouts, a.outs, players);
            })
            .toList();
    }

    private java.time.LocalDate dateOf(final Game game) {
        return game.getGameDay() != null ? game.getGameDay().getDate() : null;
    }

    private String opponentName(final Game game) {
        return game.getOpponentTeam() != null ? game.getOpponentTeam().getName() : null;
    }

    private String leagueName(final Game game) {
        return game.getGameDay() != null && game.getGameDay().getSeason() != null
            ? game.getGameDay().getSeason().getName() : null;
    }

    /** Mutierbarer Zähler pro Slot — Grundgerüst für BattingSlotStat, ohne magische Array-Indizes. */
    private static final class SlotAccumulator {
        private int plateAppearances, atBats, hits, doubles, triples, homeRuns;
        private int walks, hitByPitch, strikeouts, outs;
        private final Map<String, PlayerPa> playersByName = new LinkedHashMap<>();

        /** PA + On-Base EINES Spielers an diesem Slot. */
        private static final class PlayerPa {
            private int plateAppearances, onBase;
        }
    }

    private Integer yearOf(final Game game) {
        return game.getGameDay() != null && game.getGameDay().getSeason() != null
            ? game.getGameDay().getSeason().getYear() : null;
    }
}
