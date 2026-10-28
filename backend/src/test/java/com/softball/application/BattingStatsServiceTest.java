package com.softball.application;

import com.softball.adapter.dto.PlayerBattingStatsResponse;
import com.softball.domain.model.AtBat;
import com.softball.domain.model.AtBatResult;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests für Aggregation & Sortierung in BattingStatsService.
 * Calculator-Logik selbst wird separat in BattingStatsCalculatorTest getestet.
 */
@ExtendWith(MockitoExtension.class)
class BattingStatsServiceTest {

    @Mock private AtBatRepository atBatRepository;
    @Mock private BaseRunningEventRepository stealingRepository;
    @Mock private GameRepository gameRepository;
    @Mock private LineupEntryRepository lineupEntryRepository;
    @Mock private PlayerRepository playerRepository;

    @InjectMocks
    private BattingStatsService service;

    private Player hung;
    private Player anne;
    private Player khang;
    private Game game1;
    private Game game2;

    @BeforeEach
    void setUp() {
        hung = new Player(1L, "Hung", false, 1);
        anne = new Player(2L, "Anne", false, 2);
        khang = new Player(3L, "Khang", false, 3);
        game1 = new Game(10L, 1);
        game2 = new Game(20L, 2);
    }

    // --- getSeasonStats ---

    @Test
    void seasonStats_aggregatesAcrossGames() {
        // Hung: 1 Hit in Spiel 1, 1 Hit in Spiel 2 → 2 Hits, 2 AB, BA=1.000
        final List<AtBat> seasonAtBats = List.of(
            atBat(hung, AtBatResult.SINGLE),
            atBat(hung, AtBatResult.SINGLE)
        );
        when(atBatRepository.findBySeasonId(100L)).thenReturn(seasonAtBats);
        when(stealingRepository.findBySeasonId(100L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final List<PlayerBattingStatsResponse> stats = service.getSeasonStats(100L);

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0).playerId()).isEqualTo(hung.getId());
        assertThat(stats.get(0).atBats()).isEqualTo(2);
        assertThat(stats.get(0).hits()).isEqualTo(2);
    }

    @Test
    void seasonStats_emptyWhenNoEvents() {
        when(atBatRepository.findBySeasonId(100L)).thenReturn(List.of());
        when(stealingRepository.findBySeasonId(100L)).thenReturn(List.of());

        final List<PlayerBattingStatsResponse> stats = service.getSeasonStats(100L);

        assertThat(stats).isEmpty();
    }

    @Test
    void seasonStats_includesPlayersWithOnlyStealingEvents() {
        // Hung hat nur gestohlen, keine AtBats — soll trotzdem in Stats auftauchen
        when(atBatRepository.findBySeasonId(100L)).thenReturn(List.of());
        when(stealingRepository.findBySeasonId(100L)).thenReturn(List.of(
            stealingEvent(hung, BaseRunningEventType.STOLEN_BASE)
        ));
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung));

        final List<PlayerBattingStatsResponse> stats = service.getSeasonStats(100L);

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0).stolenBases()).isEqualTo(1);
        assertThat(stats.get(0).plateAppearances()).isZero();
    }

    // --- getYearStats ---

    @Test
    void yearStats_aggregatesAcrossMultipleSeasons() {
        // AtBats aus zwei verschiedenen Saisons des Jahres — Service aggregiert
        final List<AtBat> yearAtBats = List.of(
            atBat(hung, AtBatResult.SINGLE),  // Saison 1
            atBat(hung, AtBatResult.DOUBLE),  // Saison 2
            atBat(anne, AtBatResult.HOMERUN)  // Saison 1
        );
        when(atBatRepository.findByYear(2026)).thenReturn(yearAtBats);
        when(stealingRepository.findByYear(2026)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final List<PlayerBattingStatsResponse> stats = service.getYearStats(2026);

        assertThat(stats).hasSize(2);
        final PlayerBattingStatsResponse hungStats = stats.stream()
            .filter(s -> s.playerId().equals(hung.getId())).findFirst().orElseThrow();
        assertThat(hungStats.hits()).isEqualTo(2);
        assertThat(hungStats.totalBases()).isEqualTo(3); // 1 + 2
    }

    @Test
    void yearStats_emptyWhenNoEventsInYear() {
        when(atBatRepository.findByYear(2099)).thenReturn(List.of());
        when(stealingRepository.findByYear(2099)).thenReturn(List.of());

        final List<PlayerBattingStatsResponse> stats = service.getYearStats(2099);

        assertThat(stats).isEmpty();
    }

    // --- getAllTimeStats ---

    @Test
    void allTimeStats_usesAllEventsIgnoringScope() {
        final List<AtBat> allAtBats = List.of(
            atBat(hung, AtBatResult.SINGLE),
            atBat(anne, AtBatResult.DOUBLE)
        );
        when(atBatRepository.findAll()).thenReturn(allAtBats);
        when(stealingRepository.findAll()).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final List<PlayerBattingStatsResponse> stats = service.getAllTimeStats();

        assertThat(stats).hasSize(2);
    }

    // --- getGameStats ---

    @Test
    void gameStats_includesLineupPlayersEvenWithoutAtBats() {
        // Lineup hat Khang dabei, aber Khang hat nie gebattet im Spiel
        // → Khang soll trotzdem in Stats auftauchen (mit 0 Einträgen)
        final LineupEntry khangEntry = new LineupEntry();
        khangEntry.setPlayer(khang);
        khangEntry.setBattingOrder(1);

        when(atBatRepository.findByGameIdOrderBySequenceAsc(10L))
            .thenReturn(List.of(atBat(hung, AtBatResult.SINGLE)));
        when(stealingRepository.findByGameIdOrderByIdAsc(10L)).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L))
            .thenReturn(List.of(khangEntry));

        final List<PlayerBattingStatsResponse> stats = service.getGameStats(10L, true);

        // Beide Spieler dabei: Khang aus Lineup, Hung aus AtBat
        final Set<Long> ids = stats.stream().map(PlayerBattingStatsResponse::playerId).collect(java.util.stream.Collectors.toSet());
        assertThat(ids).contains(hung.getId(), khang.getId());
        final PlayerBattingStatsResponse khangStats = stats.stream()
            .filter(s -> s.playerId().equals(khang.getId())).findFirst().orElseThrow();
        assertThat(khangStats.plateAppearances()).isZero();
    }

    // --- getGameDayStats ---

    @Test
    void gameDayStats_aggregatesAcrossAllGamesOfDay() {
        when(gameRepository.findByGameDayIdOrderByGameNumberAsc(5L))
            .thenReturn(List.of(game1, game2));
        when(atBatRepository.findByGameIdInOrderBySequenceAsc(List.of(10L, 20L))).thenReturn(List.of(
            atBat(hung, AtBatResult.SINGLE),  // Spiel 1
            atBat(hung, AtBatResult.DOUBLE)   // Spiel 2
        ));
        when(stealingRepository.findByGameIdInOrderByIdAsc(List.of(10L, 20L))).thenReturn(List.of());
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L, 20L))).thenReturn(List.of());

        final List<PlayerBattingStatsResponse> stats = service.getGameDayStats(5L, true);

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0).hits()).isEqualTo(2);
        assertThat(stats.get(0).totalBases()).isEqualTo(3);
    }

    @Test
    void gameDayStats_emptyListIfNoGames() {
        when(gameRepository.findByGameDayIdOrderByGameNumberAsc(999L)).thenReturn(List.of());

        final List<PlayerBattingStatsResponse> stats = service.getGameDayStats(999L, true);

        assertThat(stats).isEmpty();
    }

    /**
     * Die Lesegrenze greift am Lineup-Keim: ohne Aufstellung bleibt nur, was aus At-Bats und
     * Steals kommt. Ein Spiel vor dem Anpfiff liefert dann nichts statt der ganzen Aufstellung —
     * und die Aufstellung wird gar nicht erst abgefragt.
     */
    @Test
    void gameStats_ohneAufstellungBleibtNurWerGeschlagenHat() {
        when(atBatRepository.findByGameIdOrderBySequenceAsc(10L))
            .thenReturn(List.of(atBat(hung, AtBatResult.SINGLE)));
        when(stealingRepository.findByGameIdOrderByIdAsc(10L)).thenReturn(List.of());

        final List<PlayerBattingStatsResponse> stats = service.getGameStats(10L, false);

        assertThat(stats).extracting(PlayerBattingStatsResponse::playerId).containsExactly(hung.getId());
        verify(lineupEntryRepository, never()).findByGameIdOrderByBattingOrderAsc(anyLong());
    }

    @Test
    void gameStats_ohneAufstellungUndOhneAtBatsBleibtNichts() {
        when(atBatRepository.findByGameIdOrderBySequenceAsc(10L)).thenReturn(List.of());
        when(stealingRepository.findByGameIdOrderByIdAsc(10L)).thenReturn(List.of());

        assertThat(service.getGameStats(10L, false)).isEmpty();
    }

    @Test
    void gameDayStats_ohneAufstellungBleibtNurWerGeschlagenHat() {
        when(gameRepository.findByGameDayIdOrderByGameNumberAsc(5L))
            .thenReturn(List.of(game1, game2));
        when(atBatRepository.findByGameIdInOrderBySequenceAsc(List.of(10L, 20L))).thenReturn(List.of());
        when(stealingRepository.findByGameIdInOrderByIdAsc(List.of(10L, 20L))).thenReturn(List.of());

        assertThat(service.getGameDayStats(5L, false)).isEmpty();
        verify(lineupEntryRepository, never()).findByGameIdInOrderByBattingOrderAsc(any());
    }

    // --- Sortierung ---

    @Test
    void statsAreSortedByBattingAverageDescending() {
        // Anne: 2/2 = 1.000, Hung: 1/2 = 0.500, Khang: 0/2 = 0.000
        when(atBatRepository.findBySeasonId(100L)).thenReturn(List.of(
            atBat(anne, AtBatResult.SINGLE), atBat(anne, AtBatResult.SINGLE),
            atBat(hung, AtBatResult.SINGLE), atBat(hung, AtBatResult.OUT),
            atBat(khang, AtBatResult.OUT), atBat(khang, AtBatResult.OUT)
        ));
        when(stealingRepository.findBySeasonId(100L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne, khang));

        final List<PlayerBattingStatsResponse> stats = service.getSeasonStats(100L);

        assertThat(stats).extracting(PlayerBattingStatsResponse::playerName)
            .containsExactly("Anne", "Hung", "Khang");
    }

    @Test
    void tiebreaker_sameBa_higherHitsFirst() {
        // Beide 1.000 BA, aber Anne hat 2 Hits, Hung nur 1 Hit
        when(atBatRepository.findBySeasonId(100L)).thenReturn(List.of(
            atBat(anne, AtBatResult.SINGLE), atBat(anne, AtBatResult.SINGLE),
            atBat(hung, AtBatResult.SINGLE)
        ));
        when(stealingRepository.findBySeasonId(100L)).thenReturn(List.of());
        when(playerRepository.findAllById(any())).thenReturn(List.of(hung, anne));

        final List<PlayerBattingStatsResponse> stats = service.getSeasonStats(100L);

        assertThat(stats.get(0).playerName()).isEqualTo("Anne"); // mehr Hits → vorne
        assertThat(stats.get(1).playerName()).isEqualTo("Hung");
    }

    // --- helpers ---

    private AtBat atBat(final Player batter, final AtBatResult result) {
        final AtBat ab = new AtBat();
        ab.setBatter(batter);
        ab.setResult(result);
        ab.setRbi(0);
        ab.setRunsScored(0);
        return ab;
    }

    private BaseRunningEvent stealingEvent(final Player runner, final BaseRunningEventType type) {
        final BaseRunningEvent e = new BaseRunningEvent();
        e.setRunner(runner);
        e.setType(type);
        e.setInning(1);
        return e;
    }
}
