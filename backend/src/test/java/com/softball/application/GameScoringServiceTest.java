package com.softball.application;

import com.softball.adapter.dto.ScoreboardResponse;
import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GameScoringServiceTest {

    @Mock private GameRepository gameRepository;
    @Mock private PlayerRepository playerRepository;
    @Mock private LineupEntryRepository lineupEntryRepository;
    @Mock private AtBatRepository atBatRepository;
    @Mock private BaseRunningEventRepository stealingRepository;

    @InjectMocks
    private GameScoringService service;

    private Game game;
    private Player hung;
    private Player anne;
    private Player khang;

    @BeforeEach
    void setUp() {
        game = new Game(1L, 1);
        game.setScoreUs(0);
        game.setScoreThem(0);
        hung = new Player(1L, "Hung", false, 1);
        anne = new Player(2L, "Anne", false, 2);
        khang = new Player(3L, "Khang", false, 3);
    }

    @Test
    void emptyGame_returnsEmptyState() {
        mockGame();
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isZero();
        assertThat(sb.currentInning()).isEqualTo(1);
        assertThat(sb.outsInCurrentInning()).isZero();
        assertThat(sb.runners()).isEmpty();
        assertThat(sb.baseState().first()).isNull();
        assertThat(sb.totalAtBats()).isZero();
    }

    @Test
    void scoreboardTracksRunnerStateFromLastAtBat() {
        mockGame();
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.baseState().first()).isEqualTo(hung.getId());
        assertThat(sb.runners()).hasSize(1);
        assertThat(sb.runners().get(0).playerId()).isEqualTo(hung.getId());
    }

    @Test
    void caughtStealingCountsAsOut() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant csTime = Instant.parse("2026-04-21T10:01:00Z");
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        ab.setCreatedAt(atBatTime);
        final BaseRunningEvent cs = stealingEvent(hung, 1, BaseRunningEventType.CAUGHT_STEALING, csTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(cs));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.outsInCurrentInning()).isEqualTo(1);
        // Runner wurde entfernt von 1B nach CS
        assertThat(sb.baseState().first()).isNull();
    }

    @Test
    void stolenBase_runnerMovesFrom1Bto2B() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant stealTime = Instant.parse("2026-04-21T10:01:00Z");
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        ab.setCreatedAt(atBatTime);
        final BaseRunningEvent sb = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(sb));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final ScoreboardResponse scoreboard = service.getScoreboard(1L);

        assertThat(scoreboard.baseState().first()).isNull();
        assertThat(scoreboard.baseState().second()).isEqualTo(hung.getId());
    }

    @Test
    void doubleSteal_cascade_1Band2B_bothAdvance() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant stealTime = Instant.parse("2026-04-21T10:01:00Z");
        // Nach letztem AtBat: Hung auf 1B, Anne auf 2B
        final AtBat ab = atBat(1, 1, khang, AtBatResult.OUT, new BaseState(hung.getId(), anne.getId(), null));
        ab.setCreatedAt(atBatTime);
        // Hung klaut 2B — Anne sollte kaskadiert zu 3B laufen
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.baseState().first()).isNull();
        assertThat(sb.baseState().second()).isEqualTo(hung.getId());
        assertThat(sb.baseState().third()).isEqualTo(anne.getId()); // kaskadiert!
    }

    @Test
    void stealOfHome_scoresRun() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant stealTime = Instant.parse("2026-04-21T10:01:00Z");
        // Hung auf 3B
        final AtBat ab = atBat(1, 1, khang, AtBatResult.OUT, new BaseState(null, null, hung.getId()));
        ab.setCreatedAt(atBatTime);
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.baseState().third()).isNull();
        assertThat(sb.scoreUs()).isEqualTo(1); // Steal of Home scort
    }

    @Test
    void tripleSteal_basesLoaded_thirdRunnerScores() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant stealTime = Instant.parse("2026-04-21T10:01:00Z");
        // Bases loaded: Hung 1B, Anne 2B, Khang 3B
        final AtBat ab = atBat(1, 1, hung, AtBatResult.WALK, new BaseState(hung.getId(), anne.getId(), khang.getId()));
        ab.setCreatedAt(atBatTime);
        // Hung klaut 2B — Kaskade: Anne → 3B, Khang scort
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.baseState().first()).isNull();
        assertThat(sb.baseState().second()).isEqualTo(hung.getId());
        assertThat(sb.baseState().third()).isEqualTo(anne.getId());
        assertThat(sb.scoreUs()).isEqualTo(1); // Khang scort Home durch Kaskade
    }

    @Test
    void stealingEventBeforeLastAtBat_isIgnored() {
        mockGame();
        // Szenario: Altes Stealing-Event aus Inning 1 existiert noch
        // Dann neuer AtBat in Inning 2. Stealing darf NICHT mehr auf aktuellen State angewendet werden.
        final Instant oldStealTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant newAtBatTime = Instant.parse("2026-04-21T11:00:00Z");

        final AtBat ab = atBat(1, 2, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        ab.setCreatedAt(newAtBatTime);
        final BaseRunningEvent oldSteal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, oldStealTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(oldSteal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        // Hung ist auf 1B, NICHT auf 2B (alter Steal darf nicht anwenden)
        assertThat(sb.baseState().first()).isEqualTo(hung.getId());
        assertThat(sb.baseState().second()).isNull();
    }

    @Test
    void simultaneousTimestamp_stealingIsStillApplied() {
        // Regression: Steal und AtBat in derselben Millisekunde → Steal muss gefoldet werden
        mockGame();
        final Instant sameTime = Instant.parse("2026-04-21T10:00:00.000Z");

        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
        ab.setCreatedAt(sameTime);
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, sameTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        // Steal sollte trotz gleichem Timestamp angewendet werden
        assertThat(sb.baseState().first()).isNull();
        assertThat(sb.baseState().second()).isEqualTo(hung.getId());
    }

    @Test
    void outsInCurrentInningOnly_oldOutsNotCounted() {
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant t2 = Instant.parse("2026-04-21T11:00:00Z");
        // Inning 1 hat 2 Outs, Inning 2 hat 0
        final AtBat i1Out1 = atBat(1, 1, hung, AtBatResult.STRIKEOUT, BaseState.empty());
        i1Out1.setCreatedAt(t1);
        final AtBat i1Out2 = atBat(2, 1, anne, AtBatResult.OUT, BaseState.empty());
        i1Out2.setCreatedAt(t1);
        final AtBat i2 = atBat(3, 2, khang, AtBatResult.SINGLE, new BaseState(khang.getId(), null, null));
        i2.setCreatedAt(t2);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(i1Out1, i1Out2, i2));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(khang));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentInning()).isEqualTo(2);
        assertThat(sb.outsInCurrentInning()).isZero(); // NICHT 2 aus Inning 1
    }

    @Test
    void homerunsContributeToScoreCorrectly() {
        mockGame();
        final AtBat hr = atBat(1, 1, hung, AtBatResult.HOMERUN, BaseState.empty());
        hr.setRunsScored(1);
        hr.setCreatedAt(Instant.now());

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(hr));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(1);
        assertThat(sb.baseState().first()).isNull();
        assertThat(sb.baseState().second()).isNull();
        assertThat(sb.baseState().third()).isNull();
    }

    // --- helpers ---

    private void mockGame() {
        when(gameRepository.findById(1L)).thenReturn(java.util.Optional.of(game));
    }

    private AtBat atBat(int sequence, int inning, Player batter, AtBatResult result, BaseState state) {
        final AtBat ab = new AtBat();
        ab.setId((long) sequence);
        ab.setGame(game);
        ab.setSequence(sequence);
        ab.setInning(inning);
        ab.setBatter(batter);
        ab.setResult(result);
        ab.setBaseStateAfter(state);
        ab.setRunsScored(0);
        ab.setRbi(0);
        return ab;
    }

    private BaseRunningEvent stealingEvent(Player runner, int inning, BaseRunningEventType type, Instant createdAt) {
        final BaseRunningEvent e = new BaseRunningEvent();
        e.setGame(game);
        e.setRunner(runner);
        e.setInning(inning);
        e.setType(type);
        e.setCreatedAt(createdAt);
        return e;
    }

    private static <T> java.util.Collection<T> any() {
        return org.mockito.ArgumentMatchers.anyCollection();
    }

    @SuppressWarnings("unused")
    private static List<Long> anyIds() {
        return new ArrayList<>();
    }
}
