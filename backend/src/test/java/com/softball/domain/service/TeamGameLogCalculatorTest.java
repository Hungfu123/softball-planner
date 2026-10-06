package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseState;
import com.softball.domain.model.BattingSlotStat;
import com.softball.domain.model.Game;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.Season;
import com.softball.domain.model.TeamGameLog;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure-Logic-Tests für die Team-Spiel-Analyse: Team-Zahlen pro Spiel, Inning-Verlauf,
 * Left-on-Base ("wer kam auf Base, kam aber nicht Home, weil 3 Aus das Inning beendeten"),
 * Walkoff-Regeln, "nicht ausgewertet"-Spiele und die Batting-Slot-Zuordnung inkl. DH.
 */
class TeamGameLogCalculatorTest {

    private final TeamGameLogCalculator calculator = new TeamGameLogCalculator();

    private final Player a = player(1L, "A");
    private final Player b = player(2L, "B");
    private final Player c = player(3L, "C");

    // --- Team Game Log ---

    @Test
    void gameLog_teamOffenseInningVerlaufUndStranded() {
        final Game game = game(10L, LocalDate.of(2026, 6, 1), "Gegner", "RFL", 2026);

        // Inning 1: Single (A bleibt auf 1st), Walk, Strikeout = 3. Out -> A gestrandet
        final AtBat i1a = atBat(game, a, AtBatResult.SINGLE, 1, 1, new BaseState(1L, null, null), 0);
        final AtBat i1b = atBat(game, b, AtBatResult.WALK, 1, 2, new BaseState(1L, null, null), 0);
        final AtBat i1c = atBat(game, c, AtBatResult.STRIKEOUT, 1, 3, new BaseState(1L, null, null), 0);

        // Inning 2: Homerun (1 Run), dann 3 Aus ohne Runner
        final AtBat i2a = atBat(game, a, AtBatResult.HOMERUN, 2, 1, BaseState.empty(), 1);
        final AtBat i2b = atBat(game, b, AtBatResult.OUT, 2, 2, BaseState.empty(), 0);
        final AtBat i2c = atBat(game, c, AtBatResult.OUT, 2, 3, BaseState.empty(), 0);
        final AtBat i2d = atBat(game, a, AtBatResult.OUT, 2, 4, BaseState.empty(), 0);

        final List<TeamGameLog> logs = calculator.calculateGameLogs(
            List.of(game), List.of(i1a, i1b, i1c, i2a, i2b, i2c, i2d),
            Map.of(10L, 1), Map.of(1L, "A", 2L, "B", 3L, "C"));

        assertThat(logs).hasSize(1);
        final TeamGameLog log = logs.get(0);

        assertThat(log.hasAtBatData()).isTrue();
        assertThat(log.plateAppearances()).isEqualTo(7);
        assertThat(log.atBats()).isEqualTo(6); // Walk zählt nicht als At-Bat
        assertThat(log.hits()).isEqualTo(2);
        assertThat(log.homeRuns()).isEqualTo(1);
        assertThat(log.walks()).isEqualTo(1);
        assertThat(log.strikeouts()).isEqualTo(1);
        assertThat(log.scoreUs()).isEqualTo(1); // Live-Score (Map) schlägt DB-Score
        assertThat(log.opponent()).isEqualTo("Gegner");
        assertThat(log.league()).isEqualTo("RFL");
        assertThat(log.year()).isEqualTo(2026);

        // Inning 1: 1 Hit, 2x On-Base (Single + Walk), 1 Aus, A gestrandet
        final TeamGameLog.InningLog inning1 = log.innings().get(0);
        assertThat(inning1.inning()).isEqualTo(1);
        assertThat(inning1.hits()).isEqualTo(1);
        assertThat(inning1.onBase()).isEqualTo(2);
        assertThat(inning1.outs()).isEqualTo(1);
        assertThat(inning1.stranded()).containsExactly("A");

        // Inning 2: 1 Run, 1 Hit, 3 Aus, niemand gestrandet
        final TeamGameLog.InningLog inning2 = log.innings().get(1);
        assertThat(inning2.runs()).isEqualTo(1);
        assertThat(inning2.hits()).isEqualTo(1);
        assertThat(inning2.outs()).isEqualTo(3);
        assertThat(inning2.stranded()).isEmpty();

        // LOB über das Spiel: nur A, einmal
        assertThat(log.leftOnBase()).isEqualTo(1);
        assertThat(log.strandedByPlayer()).containsEntry("A", 1).hasSize(1);
        // On-Base gesamt: Inning 1 (Single + Walk) + Inning 2 (Homerun) = 3
        assertThat(log.onBase()).isEqualTo(3);
    }

    @Test
    void gameLog_walkoffStrandetNiemanden() {
        final Game game = game(11L, LocalDate.of(2026, 6, 2), "Gegner", "RFL", 2026);
        // Letzter At-Bat des Innings ist ein Hit (Walkoff) mit Runner auf 2nd:
        // das Inning endete NICHT mit 3 Aus -> niemand wurde gestrandet
        final AtBat single = atBat(game, a, AtBatResult.SINGLE, 7, 1, new BaseState(null, 2L, null), 1);

        final List<TeamGameLog> logs = calculator.calculateGameLogs(
            List.of(game), List.of(single), Map.of(11L, 1), Map.of(1L, "A", 2L, "B", 3L, "C"));

        assertThat(logs.get(0).leftOnBase()).isZero();
        assertThat(logs.get(0).strandedByPlayer()).isEmpty();
        // Walkoff endete mit einem Hit, nicht mit einem Out — kein Out-Macher
        assertThat(logs.get(0).innings().get(0).outMaker()).isNull();
    }

    @Test
    void gameLog_erzwungenerInningWechselBeiZeitablaufStrandetAuch() {
        // Zeitablauf: Inning 1 endet nach einem Hit (kein 3. Out), Inning 2 existiert
        // -> die Runner beim Ende von Inning 1 haften genauso als gestrandet
        final Game game = game(16L, LocalDate.of(2026, 6, 7), "Gegner", "RFL", 2026);
        final AtBat i1last = atBat(game, a, AtBatResult.SINGLE, 1, 1, new BaseState(null, null, 2L), 0);
        final AtBat i2 = atBat(game, b, AtBatResult.OUT, 2, 1, BaseState.empty(), 0);

        final List<TeamGameLog> logs = calculator.calculateGameLogs(
            List.of(game), List.of(i1last, i2), Map.of(16L, 0), Map.of(1L, "A", 2L, "B", 3L, "C"));

        final TeamGameLog log = logs.get(0);
        assertThat(log.innings().get(0).stranded()).containsExactly("B");
        assertThat(log.strandedByPlayer()).containsEntry("B", 1);
    }

    @Test
    void gameLog_nichtAusgewertetesSpielZeigtNurDenEndstand() {
        // Nur DB-Score, keine At-Bats (z.B. Spielbogen-Spiel): keine Fake-Nullen-Analyse
        final Game game = game(12L, LocalDate.of(2026, 6, 3), "Gegner", "RFL", 2026);
        game.setScoreUs(5);
        game.setScoreThem(3);

        final List<TeamGameLog> logs = calculator.calculateGameLogs(
            List.of(game), List.of(), Map.of(), Map.of());

        final TeamGameLog log = logs.get(0);
        assertThat(log.hasAtBatData()).isFalse();
        assertThat(log.scoreUs()).isEqualTo(5); // DB-Score, weil kein Live-Scoring
        assertThat(log.scoreThem()).isEqualTo(3);
        assertThat(log.hits()).isZero();
        assertThat(log.plateAppearances()).isZero();
        assertThat(log.innings()).isEmpty();
    }

    @Test
    void gameLog_automaticOutZaehltAlsAusAberNichtAlsPlateAppearance() {
        final Game game = game(13L, LocalDate.of(2026, 6, 4), "Gegner", "RFL", 2026);
        final AtBat auto = atBat(game, b, AtBatResult.AUTOMATIC_OUT, 1, 1, BaseState.empty(), 0);

        final List<TeamGameLog> logs = calculator.calculateGameLogs(
            List.of(game), List.of(auto), Map.of(13L, 0), Map.of(1L, "A", 2L, "B", 3L, "C"));

        final TeamGameLog log = logs.get(0);
        assertThat(log.plateAppearances()).isZero(); // Slot hat gar nicht geschlagen
        assertThat(log.atBats()).isZero();
        assertThat(log.innings().get(0).outs()).isEqualTo(1);
    }

    @Test
    void gameLogs_neuestesSpielZuerst() {
        final Game alt = game(14L, LocalDate.of(2025, 5, 1), "X", "Liga", 2025);
        final Game neu = game(15L, LocalDate.of(2026, 6, 1), "Y", "Liga", 2026);

        final List<TeamGameLog> logs = calculator.calculateGameLogs(
            List.of(alt, neu), List.of(), Map.of(), Map.of());

        assertThat(logs).extracting(TeamGameLog::date)
            .containsExactly(LocalDate.of(2026, 6, 1), LocalDate.of(2025, 5, 1));
    }

    // --- Batting Slots ---

    @Test
    void battingSlots_zuordnungUeberLineupUndDhBatter() {
        final Game game = game(20L, LocalDate.of(2026, 6, 5), "Gegner", "RFL", 2026);

        final LineupEntry slot1 = new LineupEntry();
        slot1.setGame(game); slot1.setPlayer(a); slot1.setBattingOrder(1);

        final Player dhHost = b;
        final Player dhBatter = c;
        final LineupEntry slot2 = new LineupEntry();
        slot2.setGame(game); slot2.setPlayer(dhHost); slot2.setBattingOrder(2); slot2.setDhBatterPlayer(dhBatter);

        final AtBat aSingle = atBat(game, a, AtBatResult.SINGLE, 1, 1, BaseState.empty(), 0);
        final AtBat dhHomerun = atBat(game, dhBatter, AtBatResult.HOMERUN, 1, 2, BaseState.empty(), 1);

        final List<BattingSlotStat> slots = calculator.calculateBattingSlots(
            List.of(slot1, slot2), List.of(aSingle, dhHomerun));

        assertThat(slots).hasSize(2);
        assertThat(slots.get(0).slot()).isEqualTo(1);
        assertThat(slots.get(0).plateAppearances()).isEqualTo(1);
        assertThat(slots.get(0).hits()).isEqualTo(1);
        // DH-Batter schlägt für den Slot seines Host-Eintrags
        assertThat(slots.get(1).slot()).isEqualTo(2);
        assertThat(slots.get(1).hits()).isEqualTo(1);
        assertThat(slots.get(1).homeRuns()).isEqualTo(1);
    }

    @Test
    void battingSlots_ignoriertAtBatOhneLineupUndWalkZaehltNichtAlsAtBat() {
        final Game game = game(21L, LocalDate.of(2026, 6, 6), "Gegner", "RFL", 2026);

        final LineupEntry slot1 = new LineupEntry();
        slot1.setGame(game); slot1.setPlayer(a); slot1.setBattingOrder(1);

        final AtBat aWalk = atBat(game, a, AtBatResult.WALK, 1, 1, BaseState.empty(), 0);
        // Spieler ohne Lineup-Zuordnung (Daten-Anomalie) wird nicht mitgezählt
        final Player fremd = player(99L, "Fremd");
        final AtBat fremdSingle = atBat(game, fremd, AtBatResult.SINGLE, 1, 2, BaseState.empty(), 0);

        final List<BattingSlotStat> slots = calculator.calculateBattingSlots(
            List.of(slot1), List.of(aWalk, fremdSingle));

        assertThat(slots).hasSize(1);
        assertThat(slots.get(0).plateAppearances()).isEqualTo(1);
        assertThat(slots.get(0).atBats()).isZero(); // Walk ist kein At-Bat
        assertThat(slots.get(0).walks()).isEqualTo(1);
        // OBP zählt On-Base (H + BB + HBP), nicht nur Hits: Walk -> OBP 1.000
        assertThat(slots.get(0).onBasePct()).isEqualTo(1.0);
    }

    // --- helpers ---

    private Player player(final Long id, final String name) {
        return new Player(id, name, false, null);
    }

    private Game game(final Long id, final LocalDate date, final String opponent, final String league, final int year) {
        final Game game = new Game();
        game.setId(id);
        final GameDay gameDay = new GameDay();
        gameDay.setId(100L + id);
        gameDay.setDate(date);
        final Season season = new Season();
        season.setId(200L + id);
        season.setName(league);
        season.setYear(year);
        gameDay.setSeason(season);
        game.setGameDay(gameDay);
        final var opponentTeam = new com.softball.domain.model.LeagueTeam();
        opponentTeam.setId(300L + id);
        opponentTeam.setName(opponent);
        game.setOpponentTeam(opponentTeam);
        return game;
    }

    private AtBat atBat(final Game game, final Player batter, final AtBatResult result,
                       final int inning, final int sequence, final BaseState baseStateAfter, final int runsScored) {
        final AtBat ab = new AtBat();
        ab.setGame(game);
        ab.setBatter(batter);
        ab.setResult(result);
        ab.setInning(inning);
        ab.setSequence(sequence);
        ab.setBaseStateAfter(baseStateAfter);
        ab.setRunsScored(runsScored);
        ab.setRbi(0);
        ab.setCreatedAt(java.time.Instant.now());
        return ab;
    }
}
