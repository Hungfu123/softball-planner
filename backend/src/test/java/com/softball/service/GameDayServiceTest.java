package com.softball.service;

import com.softball.dto.GameDayPlayerStats;
import com.softball.dto.GameDayResponse;
import com.softball.entity.*;
import com.softball.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameDayServiceTest {

    @Mock
    private GameDayRepository gameDayRepository;

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private LineupEntryRepository lineupEntryRepository;

    @Mock
    private SeasonService seasonService;

    @Mock
    private AvailabilityService availabilityService;

    @InjectMocks
    private GameDayService gameDayService;

    private Season testSeason;
    private Player player1, player2;

    @BeforeEach
    void setUp() {
        testSeason = new Season("Saison 2026", 2026);
        testSeason.setId(1L);

        player1 = new Player("Max");
        player1.setId(1L);
        player2 = new Player("Lisa");
        player2.setId(2L);
    }

    @Test
    void create_createsGameDayWith3Games() {
        when(seasonService.findById(1L)).thenReturn(testSeason);
        when(gameDayRepository.save(any(GameDay.class))).thenAnswer(inv -> {
            final GameDay gd = inv.getArgument(0);
            gd.setId(1L);
            return gd;
        });

        final GameDayResponse response = gameDayService.create(1L, LocalDate.of(2026, 3, 15), "Spieltag 1", null);

        assertThat(response.games()).hasSize(3);
        assertThat(response.games().get(0).gameNumber()).isEqualTo(1);
        assertThat(response.games().get(2).gameNumber()).isEqualTo(3);
    }

    @Test
    void getStats_calculatesGameCountCorrectly() {
        final GameDay gameDay = createGameDayWithPlayers(player1, player2);
        final Game game1 = createGame(1, 10L, gameDay);
        final Game game2 = createGame(2, 20L, gameDay);
        gameDay.setGames(List.of(game1, game2));

        mockGameDayQueries(gameDay);
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L, 20L))).thenReturn(List.of(
            new LineupEntry(game1, player1, Position.SS, 1),
            new LineupEntry(game1, player2, Position.EH, 2),
            new LineupEntry(game2, player1, Position.P, 1)
        ));

        final List<GameDayPlayerStats> stats = gameDayService.getStats(1L);

        assertThat(stats.get(0).playerName()).isEqualTo("Lisa");
        assertThat(stats.get(0).gameCount()).isEqualTo(0.5);
        assertThat(stats.get(0).positions()).hasSize(1);
        assertThat(stats.get(0).positions().getFirst().position()).isEqualTo("EH");

        assertThat(stats.get(1).playerName()).isEqualTo("Max");
        assertThat(stats.get(1).gameCount()).isEqualTo(2.0);
        assertThat(stats.get(1).positions()).hasSize(2);
    }

    @Test
    void getStats_dhBatterCountsAsHalfGame() {
        final Player player3 = new Player("Tom");
        player3.setId(3L);
        final GameDay gameDay = createGameDayWithPlayers(player1, player2, player3);
        final Game game1 = createGame(1, 10L, gameDay);
        gameDay.setGames(List.of(game1));

        mockGameDayQueries(gameDay);
        // player1 plays SS, player3 (from bench) is DH batter for player1
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L))).thenReturn(List.of(
            new LineupEntry(game1, player1, Position.SS, 1, player3),
            new LineupEntry(game1, player2, Position.P, 2)
        ));

        final List<GameDayPlayerStats> stats = gameDayService.getStats(1L);

        // player3 (DH batter) should have 0.5 game
        final GameDayPlayerStats dhBatterStats = stats.stream()
            .filter(s -> s.playerName().equals("Tom")).findFirst().orElseThrow();
        assertThat(dhBatterStats.gameCount()).isEqualTo(0.5);
        assertThat(dhBatterStats.positions().getFirst().position()).isEqualTo("DH");

        // player1 (fielder with DH batter) still counts as 1.0 game
        final GameDayPlayerStats fielderStats = stats.stream()
            .filter(s -> s.playerName().equals("Max")).findFirst().orElseThrow();
        assertThat(fielderStats.gameCount()).isEqualTo(1.0);
    }

    @Test
    void getStats_playerWithNoGamesShowsZero() {
        final GameDay gameDay = createGameDayWithPlayers(player1);
        final Game game1 = createGame(1, 10L, gameDay);
        gameDay.setGames(List.of(game1));

        mockGameDayQueries(gameDay);
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L))).thenReturn(List.of());

        final List<GameDayPlayerStats> stats = gameDayService.getStats(1L);

        assertThat(stats.getFirst().gameCount()).isEqualTo(0.0);
        assertThat(stats.getFirst().positions()).isEmpty();
    }

    @Test
    void getStats_sortedByGameCountAscending() {
        final Player player3 = new Player("Tom");
        player3.setId(3L);

        final GameDay gameDay = createGameDayWithPlayers(player1, player2, player3);
        final Game game1 = createGame(1, 10L, gameDay);
        final Game game2 = createGame(2, 20L, gameDay);
        gameDay.setGames(List.of(game1, game2));

        mockGameDayQueries(gameDay);
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L, 20L))).thenReturn(List.of(
            new LineupEntry(game1, player1, Position.SS, 1),
            new LineupEntry(game1, player2, Position.P, 2),
            new LineupEntry(game1, player3, Position.EH, 3),
            new LineupEntry(game2, player1, Position.CF, 1)
        ));

        final List<GameDayPlayerStats> stats = gameDayService.getStats(1L);

        assertThat(stats.get(0).playerName()).isEqualTo("Tom");
        assertThat(stats.get(0).gameCount()).isEqualTo(0.5);
        assertThat(stats.get(1).playerName()).isEqualTo("Lisa");
        assertThat(stats.get(1).gameCount()).isEqualTo(1.0);
        assertThat(stats.get(2).playerName()).isEqualTo("Max");
        assertThat(stats.get(2).gameCount()).isEqualTo(2.0);
    }

    private GameDay createGameDayWithPlayers(final Player... players) {
        final GameDay gameDay = new GameDay(LocalDate.of(2026, 3, 15), null, null, testSeason);
        gameDay.setId(1L);
        gameDay.setAvailablePlayersList(List.of(players));
        return gameDay;
    }

    private Game createGame(final int gameNumber, final Long id, final GameDay gameDay) {
        final Game game = new Game(gameNumber, gameDay);
        game.setId(id);
        return game;
    }

    private void mockGameDayQueries(final GameDay gameDay) {
        when(gameDayRepository.findByIdWithPlayers(1L)).thenReturn(Optional.of(gameDay));
        when(gameDayRepository.findByIdWithGames(1L)).thenReturn(Optional.of(gameDay));
    }
}
