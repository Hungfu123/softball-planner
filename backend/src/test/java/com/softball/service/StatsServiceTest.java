package com.softball.service;

import com.softball.adapter.dto.SeasonPlayerStats;
import com.softball.domain.model.*;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.SeasonRepository;
import com.softball.application.StatsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private LineupEntryRepository lineupEntryRepository;

    @InjectMocks
    private StatsService statsService;

    @Test
    void getSeasonStats_aggregatesAcrossGameDays() {
        final Player player1 = new Player("Max");
        player1.setId(1L);
        final Player player2 = new Player("Lisa");
        player2.setId(2L);

        final Season season = new Season(1L, "Saison 2026", 2026);

        final GameDay gd1 = new GameDay(LocalDate.of(2026, 3, 15), null, null, season);
        final Game g1 = new Game(10L, 1);
        g1.setGameDay(gd1);
        gd1.setGames(List.of(g1));

        final GameDay gd2 = new GameDay(LocalDate.of(2026, 3, 22), null, null, season);
        final Game g2 = new Game(20L, 1);
        g2.setGameDay(gd2);
        gd2.setGames(List.of(g2));

        season.setGameDays(Set.of(gd1, gd2));
        when(seasonRepository.findByIdWithGameDaysAndGames(1L)).thenReturn(Optional.of(season));

        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(any())).thenReturn(List.of(
            new LineupEntry(g1, player1, Position.SS, 1),
            new LineupEntry(g1, player2, Position.EH, 2),
            new LineupEntry(g2, player1, Position.P, 1),
            new LineupEntry(g2, player2, Position.CF, 2)
        ));

        final List<SeasonPlayerStats> stats = statsService.getSeasonStats(1L);

        assertThat(stats.get(0).playerName()).isEqualTo("Max");
        assertThat(stats.get(0).totalGames()).isEqualTo(2.0);
        assertThat(stats.get(0).positionCounts()).containsEntry("SS", 1L);
        assertThat(stats.get(0).positionCounts()).containsEntry("P", 1L);

        assertThat(stats.get(1).playerName()).isEqualTo("Lisa");
        assertThat(stats.get(1).totalGames()).isEqualTo(1.5);
        assertThat(stats.get(1).positionCounts()).containsEntry("EH", 1L);
        assertThat(stats.get(1).positionCounts()).containsEntry("CF", 1L);
    }

    @Test
    void getSeasonStats_dhHostCountsHalfGame_splitWithDhBatter() {
        // Max spielt 2 Games als Feldspieler. In Game 2 schlägt Lisa als DH für ihn.
        // → Game 1 = 1.0, Game 2 (DH-Host) = 0.5  ⇒  Max = 1.5
        // → Lisa (DH-Batter) = 0.5
        final Player max = new Player("Max");
        max.setId(1L);
        final Player lisa = new Player("Lisa");
        lisa.setId(2L);

        final Season season = new Season(1L, "Saison 2026", 2026);

        final GameDay gd1 = new GameDay(LocalDate.of(2026, 3, 15), null, null, season);
        final Game g1 = new Game(10L, 1);
        g1.setGameDay(gd1);
        gd1.setGames(List.of(g1));

        final GameDay gd2 = new GameDay(LocalDate.of(2026, 3, 22), null, null, season);
        final Game g2 = new Game(20L, 1);
        g2.setGameDay(gd2);
        gd2.setGames(List.of(g2));

        season.setGameDays(Set.of(gd1, gd2));
        when(seasonRepository.findByIdWithGameDaysAndGames(1L)).thenReturn(Optional.of(season));

        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(any())).thenReturn(List.of(
            new LineupEntry(g1, max, Position.SS, 1),
            new LineupEntry(g2, max, Position.SS, 1, lisa)  // DH-Host
        ));

        final List<SeasonPlayerStats> stats = statsService.getSeasonStats(1L);

        final SeasonPlayerStats maxStats = stats.stream()
            .filter(s -> s.playerName().equals("Max")).findFirst().orElseThrow();
        final SeasonPlayerStats lisaStats = stats.stream()
            .filter(s -> s.playerName().equals("Lisa")).findFirst().orElseThrow();

        assertThat(maxStats.totalGames()).isEqualTo(1.5);
        assertThat(maxStats.positionCounts()).containsEntry("SS", 2L);
        assertThat(lisaStats.totalGames()).isEqualTo(0.5);
        assertThat(lisaStats.positionCounts()).containsEntry("DH", 1L);
    }

    @Test
    void getSeasonStats_emptySeasonReturnsEmptyList() {
        final Season season = new Season(1L, "Empty", 2026);
        season.setGameDays(Set.of());
        when(seasonRepository.findByIdWithGameDaysAndGames(1L)).thenReturn(Optional.of(season));

        final List<SeasonPlayerStats> stats = statsService.getSeasonStats(1L);

        assertThat(stats).isEmpty();
    }
}
