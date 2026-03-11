package com.softball.service;

import com.softball.dto.SeasonPlayerStats;
import com.softball.entity.*;
import com.softball.repository.LineupEntryRepository;
import com.softball.repository.SeasonRepository;
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

        final Season season = new Season("Saison 2026", 2026);
        season.setId(1L);

        final GameDay gd1 = new GameDay(LocalDate.of(2026, 3, 15), null, null, season);
        final Game g1 = new Game(1, gd1);
        g1.setId(10L);
        gd1.setGames(List.of(g1));

        final GameDay gd2 = new GameDay(LocalDate.of(2026, 3, 22), null, null, season);
        final Game g2 = new Game(1, gd2);
        g2.setId(20L);
        gd2.setGames(List.of(g2));

        season.setGameDays(Set.of(gd1, gd2));
        when(seasonRepository.findByIdWithGameDaysAndGames(1L)).thenReturn(Optional.of(season));

        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of(
            new LineupEntry(g1, player1, Position.SS, 1),
            new LineupEntry(g1, player2, Position.EH, 2)
        ));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(20L)).thenReturn(List.of(
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
    void getSeasonStats_emptySeasonReturnsEmptyList() {
        final Season season = new Season("Empty", 2026);
        season.setId(1L);
        season.setGameDays(Set.of());
        when(seasonRepository.findByIdWithGameDaysAndGames(1L)).thenReturn(Optional.of(season));

        final List<SeasonPlayerStats> stats = statsService.getSeasonStats(1L);

        assertThat(stats).isEmpty();
    }
}
