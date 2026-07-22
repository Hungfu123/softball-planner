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
    @Mock private SubstitutionRepository substitutionRepository;
    @Mock private com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository;
    @Mock private com.softball.domain.port.out.AutomaticOutEventRepository automaticOutEventRepository;

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
    void stealOfHome_thenLaterAtBat_runStillCounts() {
        // Regression: Steal of Home darf nicht verschwinden sobald ein weiterer
        // AtBat folgt. Der Run liegt auf keinem AtBat — muss aus den Events abgeleitet
        // und persistent gezählt werden.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant tSteal = Instant.parse("2026-04-21T10:01:00Z");
        final Instant t2 = Instant.parse("2026-04-21T10:02:00Z");
        // AB1: Khang out, Hung bleibt auf 3B
        final AtBat ab1 = atBat(1, 1, khang, AtBatResult.OUT, new BaseState(null, null, hung.getId()));
        ab1.setCreatedAt(t1);
        // Hung klaut Home → Run
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, tSteal);
        // AB2 danach: Anne single, Hung ist längst gescort
        final AtBat ab2 = atBat(2, 1, anne, AtBatResult.SINGLE, new BaseState(anne.getId(), null, null));
        ab2.setCreatedAt(t2);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(1);
    }

    @Test
    void cascadeStealHome_thenLaterAtBat_runStillCounts() {
        // Regression: Kaskaden-Run (Double/Triple-Steal wo 3B-Runner scort) muss
        // ebenfalls persistent gezählt werden, auch nach weiteren AtBats.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant tSteal = Instant.parse("2026-04-21T10:01:00Z");
        final Instant t2 = Instant.parse("2026-04-21T10:02:00Z");
        // Bases loaded
        final AtBat ab1 = atBat(1, 1, hung, AtBatResult.WALK, new BaseState(hung.getId(), anne.getId(), khang.getId()));
        ab1.setCreatedAt(t1);
        // Hung klaut 2B → Kaskade: Anne → 3B, Khang scort Home
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, tSteal);
        // weiterer AtBat danach — State nach dem Steal: Hung 2B, Anne 3B
        final AtBat ab2 = atBat(2, 1, hung, AtBatResult.OUT, new BaseState(null, hung.getId(), anne.getId()));
        ab2.setCreatedAt(t2);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(1);
    }

    @Test
    void stealOfHome_inEarlierInning_stillCountsAfterInningChange() {
        // Steal of Home in Inning 1, danach Inning 2 mit AtBats → Run bleibt im Score.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant tSteal = Instant.parse("2026-04-21T10:01:00Z");
        final Instant t2 = Instant.parse("2026-04-21T10:30:00Z");
        final AtBat ab1 = atBat(1, 1, khang, AtBatResult.OUT, new BaseState(null, null, hung.getId()));
        ab1.setCreatedAt(t1);
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, tSteal);
        final AtBat ab2 = atBat(2, 2, anne, AtBatResult.SINGLE, new BaseState(anne.getId(), null, null));
        ab2.setCreatedAt(t2);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentInning()).isEqualTo(2);
        assertThat(sb.scoreUs()).isEqualTo(1);
    }

    @Test
    void computeLiveScoreUs_includesStealRuns() {
        // liveScoreUs (Karten/Dashboard) muss Steal-of-Home-Runs enthalten — wie die Scoring-Page.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant tSteal = Instant.parse("2026-04-21T10:01:00Z");
        final Instant t2 = Instant.parse("2026-04-21T10:02:00Z");
        final AtBat hr = atBat(1, 1, hung, AtBatResult.HOMERUN, BaseState.empty());
        hr.setRunsScored(1);
        hr.setCreatedAt(t1);
        final AtBat triple = atBat(2, 1, anne, AtBatResult.TRIPLE, new BaseState(null, null, anne.getId()));
        triple.setCreatedAt(t2);
        final BaseRunningEvent steal = stealingEvent(anne, 1, BaseRunningEventType.STOLEN_BASE,
            Instant.parse("2026-04-21T10:03:00Z"));

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(hr, triple));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));

        assertThat(service.computeLiveScoreUs(1L)).isEqualTo(2); // 1 HR + 1 Steal of Home
    }

    @Test
    void computeLiveScoreUs_emptyGame_isZero() {
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        assertThat(service.computeLiveScoreUs(1L)).isZero();
    }

    @Test
    void stealOfHome_isCountedExactlyOnce_notDoubled() {
        // Over-count-Guard: Steal of Home als letztes Event darf NICHT doppelt zählen
        // (Replay + Anzeige-Fold). Genau 1 Run.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant tSteal = Instant.parse("2026-04-21T10:01:00Z");
        final AtBat ab = atBat(1, 1, khang, AtBatResult.OUT, new BaseState(null, null, hung.getId()));
        ab.setCreatedAt(t1);
        final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, tSteal);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(1);
        assertThat(sb.baseState().third()).isNull();
    }

    @Test
    void hitDrivenRunAndStealRun_noOverCount() {
        // HR (2 Runs auf AtBat) + späterer Steal of Home (1 Run aus Event) = genau 3,
        // keine Doppelzählung zwischen AtBat-Runs und Steal-Runs.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant t2 = Instant.parse("2026-04-21T10:01:00Z");
        final Instant tSteal = Instant.parse("2026-04-21T10:02:00Z");
        final AtBat hr = atBat(1, 1, hung, AtBatResult.HOMERUN, BaseState.empty());
        hr.setRunsScored(2);
        hr.setCreatedAt(t1);
        final AtBat single = atBat(2, 1, anne, AtBatResult.TRIPLE, new BaseState(null, null, anne.getId()));
        single.setCreatedAt(t2);
        final BaseRunningEvent steal = stealingEvent(anne, 1, BaseRunningEventType.STOLEN_BASE, tSteal);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(hr, single));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(3);
    }

    @Test
    void caughtStealingAtHome_doesNotScore() {
        // Over-count-Guard: Runner auf 3B wird beim Klau-Versuch erwischt → kein Run.
        mockGame();
        final Instant t1 = Instant.parse("2026-04-21T10:00:00Z");
        final Instant tCs = Instant.parse("2026-04-21T10:01:00Z");
        final Instant t2 = Instant.parse("2026-04-21T10:02:00Z");
        final AtBat ab = atBat(1, 1, khang, AtBatResult.OUT, new BaseState(null, null, hung.getId()));
        ab.setCreatedAt(t1);
        final BaseRunningEvent cs = stealingEvent(hung, 1, BaseRunningEventType.CAUGHT_STEALING, tCs);
        final AtBat ab2 = atBat(2, 1, anne, AtBatResult.SINGLE, new BaseState(anne.getId(), null, null));
        ab2.setCreatedAt(t2);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab, ab2));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(cs));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isZero();
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

    // --- Edge Cases: Softball-Szenarien ---

    @Test
    void grandSlam_basesLoadedHomerun_scoresFour() {
        mockGame();
        // Bases loaded + HR → 4 Runs, alle Bases leer
        final AtBat hr = atBat(1, 1, hung, AtBatResult.HOMERUN, BaseState.empty());
        hr.setRunsScored(4);
        hr.setRbi(4);
        hr.setCreatedAt(Instant.now());

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(hr));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(4);
        assertThat(sb.baseState().first()).isNull();
    }

    @Test
    void scoreUs_sumsAllRunsScoredAcrossAtBats() {
        mockGame();
        // 3 verschiedene AtBats mit verschiedenen runsScored-Werten
        final AtBat hr = atBat(1, 1, hung, AtBatResult.HOMERUN, BaseState.empty());
        hr.setRunsScored(2); // Solo + Runner von 1B
        final AtBat single = atBat(2, 2, anne, AtBatResult.SINGLE, new BaseState(anne.getId(), null, null));
        single.setRunsScored(1);
        final AtBat out = atBat(3, 3, khang, AtBatResult.OUT, BaseState.empty());
        out.setRunsScored(0);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(hr, single, out));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(3);
    }

    @Test
    void basesLoadedWalk_forcedRunScores() {
        // Simuliert: 3 Runner auf Base, Batter bekommt Walk → 1 Run forced
        // (Frontend berechnet das + sendet runsScored=1)
        mockGame();
        final AtBat walk = atBat(1, 1, hung, AtBatResult.WALK,
            new BaseState(hung.getId(), anne.getId(), khang.getId()));
        walk.setRunsScored(1);
        walk.setRbi(1);
        walk.setCreatedAt(Instant.now());

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(walk));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne, khang));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(1);
        // Bases bleiben loaded
        assertThat(sb.baseState().first()).isEqualTo(hung.getId());
        assertThat(sb.baseState().second()).isEqualTo(anne.getId());
        assertThat(sb.baseState().third()).isEqualTo(khang.getId());
    }

    @Test
    void outsInCurrentInning_multipleOutsAccumulate() {
        mockGame();
        final Instant t = Instant.parse("2026-04-21T10:00:00Z");
        final AtBat so = atBat(1, 2, hung, AtBatResult.STRIKEOUT, BaseState.empty());
        so.setCreatedAt(t);
        final AtBat groundOut = atBat(2, 2, anne, AtBatResult.OUT, BaseState.empty());
        groundOut.setCreatedAt(t);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(so, groundOut));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.outsInCurrentInning()).isEqualTo(2);
        assertThat(sb.currentInning()).isEqualTo(2);
    }

    @Test
    void caughtStealingAt2B_removesRunnerFrom2B() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant csTime = Instant.parse("2026-04-21T10:01:00Z");
        // Anne auf 2B, versucht 3B zu klauen, wird gefangen
        final AtBat ab = atBat(1, 1, hung, AtBatResult.OUT, new BaseState(null, anne.getId(), null));
        ab.setCreatedAt(atBatTime);
        final BaseRunningEvent cs = stealingEvent(anne, 1, BaseRunningEventType.CAUGHT_STEALING, csTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(cs));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.baseState().second()).isNull();
        assertThat(sb.outsInCurrentInning()).isEqualTo(2); // AtBat-Out + CS-Out
    }

    @Test
    void caughtStealingAt3B_removesRunnerFrom3B() {
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant csTime = Instant.parse("2026-04-21T10:01:00Z");
        final AtBat ab = atBat(1, 1, hung, AtBatResult.OUT, new BaseState(null, null, anne.getId()));
        ab.setCreatedAt(atBatTime);
        final BaseRunningEvent cs = stealingEvent(anne, 1, BaseRunningEventType.CAUGHT_STEALING, csTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(cs));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.baseState().third()).isNull();
    }

    @Test
    void outOnPlay_countsAsInningOut_andRemovesRunner() {
        // Grounder-Out (Batter): Runner auf 2B wird bei Force-Play ausgespielt
        mockGame();
        final Instant t = Instant.parse("2026-04-23T10:00:00Z");
        final AtBat grounder = atBat(1, 1, hung, AtBatResult.OUT, new BaseState(null, anne.getId(), null));
        grounder.setCreatedAt(t);
        final BaseRunningEvent runnerOut = stealingEvent(anne, 1, BaseRunningEventType.OUT_ON_PLAY, t.plusSeconds(1));

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(grounder));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(runnerOut));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.outsInCurrentInning()).isEqualTo(2); // Batter-Out + Runner-Out
        assertThat(sb.baseState().second()).isNull(); // Runner weg von 2B
    }

    @Test
    void outOnPlay_andCaughtStealing_mixedInInning() {
        // Inning 1: 1× Batter-Out (Grounder), 1× Runner-Out-on-Play (vom Grounder),
        //            später 1× CaughtStealing bei echtem Steal-Versuch
        mockGame();
        final Instant t1 = Instant.parse("2026-04-23T10:00:00Z");
        final AtBat grounder = atBat(1, 1, hung, AtBatResult.OUT, BaseState.empty());
        grounder.setCreatedAt(t1);
        final BaseRunningEvent runnerOut = stealingEvent(anne, 1, BaseRunningEventType.OUT_ON_PLAY, t1.plusSeconds(1));
        final BaseRunningEvent cs = stealingEvent(khang, 1, BaseRunningEventType.CAUGHT_STEALING, t1.plusSeconds(2));

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(grounder));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(runnerOut, cs));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.outsInCurrentInning()).isEqualTo(3); // alle drei zählen als Inning-Outs
    }

    @Test
    void caughtStealing_doesNotAffectScoreUs() {
        // CS nimmt keinen Run weg (logisch)
        mockGame();
        final Instant atBatTime = Instant.parse("2026-04-21T10:00:00Z");
        final Instant csTime = Instant.parse("2026-04-21T10:01:00Z");
        // Score war schon 2 durch vorherige Runs
        final AtBat prevHr = atBat(1, 1, hung, AtBatResult.HOMERUN, BaseState.empty());
        prevHr.setRunsScored(2);
        prevHr.setCreatedAt(atBatTime.minusSeconds(10));
        final AtBat ab = atBat(2, 1, anne, AtBatResult.SINGLE, new BaseState(anne.getId(), null, null));
        ab.setCreatedAt(atBatTime);
        final BaseRunningEvent cs = stealingEvent(anne, 1, BaseRunningEventType.CAUGHT_STEALING, csTime);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(prevHr, ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(cs));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.scoreUs()).isEqualTo(2); // CS hat Score nicht verändert
    }

    // --- currentBatter resolution ---

    @Test
    void firstAtBat_currentBatterIsFirstInLineup() {
        mockGame();
        final LineupEntry e1 = lineupEntry(hung, 1);
        final LineupEntry e2 = lineupEntry(anne, 2);
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of(e1, e2));
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentBatterId()).isEqualTo(hung.getId());
        assertThat(sb.currentBatterName()).isEqualTo("Hung");
    }

    @Test
    void afterAtBat_currentBatterIsNextInOrder() {
        mockGame();
        final LineupEntry e1 = lineupEntry(hung, 1);
        final LineupEntry e2 = lineupEntry(anne, 2);
        final LineupEntry e3 = lineupEntry(khang, 3);
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of(e1, e2, e3));
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne, khang));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentBatterId()).isEqualTo(anne.getId());
    }

    @Test
    void afterLastBatter_currentBatterWrapsToFirst() {
        mockGame();
        final LineupEntry e1 = lineupEntry(hung, 1);
        final LineupEntry e2 = lineupEntry(anne, 2);
        // Letzter Batter war #2 (Anne) — danach muss #1 (Hung) wieder dran sein
        final AtBat ab = atBat(1, 1, anne, AtBatResult.OUT, BaseState.empty());

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of(e1, e2));
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentBatterId()).isEqualTo(hung.getId()); // Wrap-around
    }

    @Test
    void lastBatterNotInLineup_fallbackToFirstInLineup() {
        // Edge: Falls letzter Batter nicht im Lineup (z.B. entfernt nach AtBat),
        // fallback zum ersten Spieler der Batting-Order.
        mockGame();
        final LineupEntry e1 = lineupEntry(hung, 1);
        // Anne ist NICHT im Lineup, hat aber gebattet (Inkonsistenz)
        final AtBat ab = atBat(1, 1, anne, AtBatResult.SINGLE, new BaseState(anne.getId(), null, null));

        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of(e1));
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentBatterId()).isEqualTo(hung.getId());
    }

    @Test
    void emptyLineup_currentBatterIsNull() {
        mockGame();
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());

        final ScoreboardResponse sb = service.getScoreboard(1L);

        assertThat(sb.currentBatterId()).isNull();
        assertThat(sb.currentBatterName()).isNull();
    }

    // --- Mutation-Operationen ---

    @Test
    void undoLastAtBat_removesLastEntry() {
        mockGame();
        final AtBat last = atBat(2, 1, anne, AtBatResult.OUT, BaseState.empty());
        last.setId(42L);
        when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(last));

        service.undoLastAtBat(1L);

        org.mockito.Mockito.verify(atBatRepository).deleteById(42L);
    }

    @Test
    void undoLastAtBat_noAtBats_doesNothing() {
        mockGame();
        when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());

        service.undoLastAtBat(1L); // Kein throw

        org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never())
            .deleteById(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void resetScoring_clearsAllAtBatsAndSteals_andResetsScore() {
        mockGame();
        game.setScoreUs(5);
        game.setScoreThem(3);
        final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, BaseState.empty());
        ab.setId(10L);
        final BaseRunningEvent e = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, Instant.now());
        e.setId(20L);
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(e));

        service.resetScoring(1L);

        org.mockito.Mockito.verify(atBatRepository).deleteById(10L);
        org.mockito.Mockito.verify(stealingRepository).deleteById(20L);
        assertThat(game.getScoreUs()).isZero();
        assertThat(game.getScoreThem()).isZero();
        org.mockito.Mockito.verify(gameRepository).save(game);
    }

    @Test
    void resetScoring_clearsInningAdvanceEvents() {
        mockGame();
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        final com.softball.domain.model.InningAdvanceEvent ev1 = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
        ev1.setId(701L);
        final com.softball.domain.model.InningAdvanceEvent ev2 = new com.softball.domain.model.InningAdvanceEvent(game, 3, 2, "test");
        ev2.setId(702L);
        when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev1, ev2));

        service.resetScoring(1L);

        org.mockito.Mockito.verify(inningAdvanceEventRepository).deleteById(701L);
        org.mockito.Mockito.verify(inningAdvanceEventRepository).deleteById(702L);
    }

    @Test
    void resetScoring_clearsSubstitutions() {
        mockGame();
        when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
        when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        service.resetScoring(1L);

        org.mockito.Mockito.verify(substitutionRepository).deleteByGameId(1L);
    }

    @org.junit.jupiter.api.Nested
    class UndoLastAction {

        @Test
        void emptyGame_returnsNone() {
            mockGame();
            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.NONE);
            assertThat(result.removedId()).isNull();
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never())
                .deleteById(org.mockito.ArgumentMatchers.anyLong());
        }

        @Test
        void stealingIsNewest_deletesOnlyStealing() {
            mockGame();
            final Instant abTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant stealTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(101L); ab.setCreatedAt(abTime);
            final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);
            steal.setId(201L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.STEALING);
            assertThat(result.removedId()).isEqualTo(201L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(201L);
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never())
                .deleteById(org.mockito.ArgumentMatchers.anyLong());
        }

        @Test
        void singleStealingNoAB_deletesStealing() {
            mockGame();
            final Instant stealTime = Instant.parse("2026-05-11T10:00:00Z");
            final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);
            steal.setId(202L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.STEALING);
            assertThat(result.removedId()).isEqualTo(202L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(202L);
        }

        @Test
        void subIsNewest_deletesOnlySub() {
            mockGame();
            final Instant abTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant subTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(101L); ab.setCreatedAt(abTime);
            final Substitution sub = new Substitution(game, hung, anne, 1);
            sub.setId(301L);
            sub.setCreatedAt(subTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of(sub));

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.SUBSTITUTION);
            assertThat(result.removedId()).isEqualTo(301L);
            org.mockito.Mockito.verify(substitutionRepository).deleteById(301L);
        }

        @Test
        void lastABIsNewest_deletesOnlyAB_keepsStealingsIntact() {
            mockGame();
            // Stealing zwischen ab1 und ab2 ist ein eigenstaendiges Event und bleibt beim
            // AB-Undo erhalten. User muss Steal separat per Undo entfernen wenn gewuenscht.
            final Instant ab1Time = Instant.parse("2026-05-11T10:00:00Z");
            final Instant stealTime = Instant.parse("2026-05-11T10:00:30Z");
            final Instant ab2Time = Instant.parse("2026-05-11T10:01:00Z");
            final AtBat ab1 = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab1.setId(101L); ab1.setCreatedAt(ab1Time);
            final AtBat ab2 = atBat(2, 1, anne, AtBatResult.OUT, new BaseState(hung.getId(), null, null));
            ab2.setId(102L); ab2.setCreatedAt(ab2Time);
            final BaseRunningEvent steal = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealTime);
            steal.setId(201L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab2));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(steal));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AT_BAT);
            assertThat(result.removedId()).isEqualTo(102L);
            org.mockito.Mockito.verify(atBatRepository).deleteById(102L);
            org.mockito.Mockito.verify(stealingRepository, org.mockito.Mockito.never()).deleteById(201L);
        }

        @Test
        void inningAdvanceIsNewest_revertsScoreAndDeletesEvent() {
            mockGame();
            game.setScoreThem(5);
            final Instant abTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant eventTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(101L); ab.setCreatedAt(abTime);
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            ev.setId(601L);
            ev.setCreatedAt(eventTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.INNING_ADVANCE);
            assertThat(result.removedId()).isEqualTo(601L);
            org.mockito.Mockito.verify(inningAdvanceEventRepository).deleteById(601L);
            assertThat(game.getScoreThem()).isEqualTo(2);
            org.mockito.Mockito.verify(gameRepository).save(game);
        }

        @Test
        void abNewerThanInningAdvance_undosAB() {
            mockGame();
            game.setScoreThem(3);
            final Instant eventTime = Instant.parse("2026-05-11T10:00:00Z");
            final Instant abTime = Instant.parse("2026-05-11T10:05:00Z");
            final AtBat ab = atBat(1, 2, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab.setId(102L); ab.setCreatedAt(abTime);
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            ev.setId(602L);
            ev.setCreatedAt(eventTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AT_BAT);
            org.mockito.Mockito.verify(atBatRepository).deleteById(102L);
            org.mockito.Mockito.verify(inningAdvanceEventRepository, org.mockito.Mockito.never())
                .deleteById(org.mockito.ArgumentMatchers.anyLong());
            assertThat(game.getScoreThem()).isEqualTo(3);
        }

        @Test
        void inningAdvanceUndo_clampsScoreThemAtZero() {
            mockGame();
            game.setScoreThem(1);
            final Instant eventTime = Instant.parse("2026-05-11T10:00:00Z");
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            ev.setId(603L);
            ev.setCreatedAt(eventTime);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.empty());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            service.undoLastAction(1L);

            assertThat(game.getScoreThem()).isZero();
        }

        @Test
        void undoAB_keepsAllStealings_independentOfTimestamp() {
            mockGame();
            final Instant stealEarlyTime = Instant.parse("2026-05-11T09:59:00Z");
            final Instant ab1Time = Instant.parse("2026-05-11T10:00:00Z");
            final Instant stealMidTime = Instant.parse("2026-05-11T10:00:30Z");
            final Instant ab2Time = Instant.parse("2026-05-11T10:01:00Z");
            final AtBat ab1 = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab1.setId(101L); ab1.setCreatedAt(ab1Time);
            final AtBat ab2 = atBat(2, 1, anne, AtBatResult.OUT, new BaseState(null, hung.getId(), null));
            ab2.setId(102L); ab2.setCreatedAt(ab2Time);
            final BaseRunningEvent stealEarly = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealEarlyTime);
            stealEarly.setId(200L);
            final BaseRunningEvent stealMid = stealingEvent(hung, 1, BaseRunningEventType.STOLEN_BASE, stealMidTime);
            stealMid.setId(201L);

            when(atBatRepository.findLastByGameId(1L)).thenReturn(java.util.Optional.of(ab2));
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of(ab1, ab2));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of(stealEarly, stealMid));
            when(substitutionRepository.findByGameId(1L)).thenReturn(List.of());

            final com.softball.adapter.dto.UndoResultResponse result = service.undoLastAction(1L);

            assertThat(result.type()).isEqualTo(com.softball.adapter.dto.UndoResultResponse.UndoType.AT_BAT);
            assertThat(result.removedId()).isEqualTo(102L);
            org.mockito.Mockito.verify(atBatRepository).deleteById(102L);
            org.mockito.Mockito.verify(stealingRepository, org.mockito.Mockito.never()).deleteById(200L);
            org.mockito.Mockito.verify(stealingRepository, org.mockito.Mockito.never()).deleteById(201L);
        }
    }

    @org.junit.jupiter.api.Nested
    class AdvanceInning {

        @Test
        void advanceInning_createsEventAndUpdatesScoreThem() {
            mockGame();
            game.setScoreThem(0);
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
            final com.softball.domain.model.InningAdvanceEvent saved = new com.softball.domain.model.InningAdvanceEvent(game, 2, 3, "test");
            saved.setId(501L);
            saved.setCreatedAt(Instant.parse("2026-05-11T10:00:00Z"));
            when(inningAdvanceEventRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(saved);

            final com.softball.adapter.dto.InningAdvanceEventResponse res = service.advanceInning(1L, 3);

            assertThat(res.toInning()).isEqualTo(2);
            assertThat(res.opponentRuns()).isEqualTo(3);
            assertThat(game.getScoreThem()).isEqualTo(3);
            org.mockito.Mockito.verify(gameRepository).save(game);
        }

        @Test
        void advanceInning_zeroRuns_doesNotChangeScoreThem() {
            mockGame();
            game.setScoreThem(5);
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
            final com.softball.domain.model.InningAdvanceEvent saved = new com.softball.domain.model.InningAdvanceEvent(game, 2, 0, "test");
            saved.setId(502L);
            saved.setCreatedAt(Instant.parse("2026-05-11T10:00:00Z"));
            when(inningAdvanceEventRepository.save(org.mockito.ArgumentMatchers.any())).thenReturn(saved);

            service.advanceInning(1L, 0);

            assertThat(game.getScoreThem()).isEqualTo(5);
        }

        @Test
        void scoreboard_currentInning_reflectsLastEvent() {
            mockGame();
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(1L)).thenReturn(List.of());
            final com.softball.domain.model.InningAdvanceEvent ev = new com.softball.domain.model.InningAdvanceEvent(game, 3, 0, "test");
            ev.setId(503L);
            ev.setCreatedAt(Instant.parse("2026-05-11T10:00:00Z"));
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(ev));

            final com.softball.adapter.dto.ScoreboardResponse sb = service.getScoreboard(1L);

            assertThat(sb.currentInning()).isEqualTo(3);
        }
    }

    @org.junit.jupiter.api.Nested
    class DeleteCurrentInning {

        @Test
        void deletesOnlyCurrentInningABsAndStealings() {
            mockGame();
            final AtBat ab1 = atBat(1, 1, hung, AtBatResult.SINGLE, new BaseState(hung.getId(), null, null));
            ab1.setRunsScored(0);
            final AtBat ab2 = atBat(2, 1, anne, AtBatResult.HOMERUN, BaseState.empty());
            ab2.setRunsScored(2);
            // Inning 2 (current)
            final AtBat ab3 = atBat(3, 2, khang, AtBatResult.SINGLE, new BaseState(khang.getId(), null, null));
            ab3.setRunsScored(0);
            final AtBat ab4 = atBat(4, 2, hung, AtBatResult.OUT, new BaseState(khang.getId(), null, null));
            ab4.setRunsScored(0);
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(new ArrayList<>(List.of(ab1, ab2, ab3, ab4)));
            final BaseRunningEvent st = stealingEvent(khang, 2, BaseRunningEventType.STOLEN_BASE, Instant.parse("2026-05-11T10:00:00Z"));
            st.setId(101L);
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(new ArrayList<>(List.of(st)));
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
            game.setScoreUs(2);
            game.setScoreThem(3);

            service.deleteCurrentInning(1L);

            // Inning 2: ab3, ab4, st deleted; ab1, ab2 bleiben
            org.mockito.Mockito.verify(atBatRepository).deleteById(3L);
            org.mockito.Mockito.verify(atBatRepository).deleteById(4L);
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never()).deleteById(1L);
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never()).deleteById(2L);
            org.mockito.Mockito.verify(stealingRepository).deleteById(101L);
            // scoreUs recomputed (ab1=0 + ab2=2 = 2), scoreThem untouched (3)
            assertThat(game.getScoreUs()).isEqualTo(2);
            assertThat(game.getScoreThem()).isEqualTo(3);
            org.mockito.Mockito.verify(gameRepository).save(game);
        }

        @Test
        void afterUndidAdvance_deletesEarlierInningAsCurrent() {
            // User war in Inning 3, hat per Undo zurück nach Inning 2.
            // CurrentInning = max(lastAB-inning=2, lastEvent-inning=0) = 2 → wipe Inning 2.
            mockGame();
            final AtBat ab1 = atBat(1, 1, hung, AtBatResult.SINGLE, BaseState.empty());
            ab1.setRunsScored(1);
            final AtBat ab2 = atBat(2, 2, anne, AtBatResult.DOUBLE, BaseState.empty());
            ab2.setRunsScored(2);
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(new ArrayList<>(List.of(ab1, ab2)));
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(new ArrayList<>(List.of()));
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

            service.deleteCurrentInning(1L);

            org.mockito.Mockito.verify(atBatRepository).deleteById(2L);
            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never()).deleteById(1L);
            assertThat(game.getScoreUs()).isEqualTo(1);  // nur ab1 verbleibt
        }

        @Test
        void emptyGame_noOp() {
            mockGame();
            when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(new ArrayList<>());
            when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(new ArrayList<>());
            when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

            service.deleteCurrentInning(1L);

            org.mockito.Mockito.verify(atBatRepository, org.mockito.Mockito.never()).deleteById(org.mockito.ArgumentMatchers.anyLong());
            assertThat(game.getScoreUs()).isZero();
            org.mockito.Mockito.verify(gameRepository).save(game);
        }
    }

    // --- helpers ---

    private LineupEntry lineupEntry(final Player player, final int battingOrder) {
        final LineupEntry e = new LineupEntry();
        e.setGame(game);
        e.setPlayer(player);
        e.setBattingOrder(battingOrder);
        return e;
    }

    // original helpers below:
    // mockGame, atBat, stealingEvent

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
