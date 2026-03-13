package com.softball.service;

import com.softball.application.GameService;
import com.softball.application.LeagueTeamService;
import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.GameStaffRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock
    private GameRepository gameRepository;
    @Mock
    private LineupEntryRepository lineupEntryRepository;
    @Mock
    private GameStaffRepository gameStaffRepository;
    @Mock
    private LeagueTeamService leagueTeamService;

    @InjectMocks
    private GameService gameService;

    private Season season;
    private GameDay gameDay;
    private Game game;

    @BeforeEach
    void setUp() {
        season = new Season(1L, "2025", 2025);
        gameDay = new GameDay(1L, LocalDate.now(), "Spieltag 1", "Feld A");
        gameDay.setSeason(season);
        game = new Game(10L, 1);
        game.setGameDay(gameDay);
    }

    @Test
    void findById_existingGame_returnsGame() {
        when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

        assertThat(gameService.findById(10L).getGameNumber()).isEqualTo(1);
    }

    @Test
    void findById_nonExisting_throwsResourceNotFound() {
        when(gameRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gameService.findById(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Nested
    class UpdateOpponent {

        @Test
        void setOpponent_valid() {
            final LeagueTeam opponent = new LeagueTeam(2L, "Tigers", false);
            opponent.setSeason(season);
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(leagueTeamService.findById(2L)).thenReturn(opponent);
            when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final Game result = gameService.updateOpponent(10L, 2L);

            assertThat(result.getOpponentTeam().getName()).isEqualTo("Tigers");
        }

        @Test
        void clearOpponent_setsNull() {
            game.setOpponentTeam(new LeagueTeam(2L, "Tigers", false));
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final Game result = gameService.updateOpponent(10L, null);

            assertThat(result.getOpponentTeam()).isNull();
        }

        @Test
        void ownTeamAsOpponent_throws() {
            final LeagueTeam ownTeam = new LeagueTeam(1L, "Dead Sox", true);
            ownTeam.setSeason(season);
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(leagueTeamService.findById(1L)).thenReturn(ownTeam);

            assertThatThrownBy(() -> gameService.updateOpponent(10L, 1L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("eigene Team");
        }

        @Test
        void opponentFromDifferentSeason_throws() {
            final Season otherSeason = new Season(99L, "Andere", 2024);
            final LeagueTeam opponent = new LeagueTeam(2L, "Tigers", false);
            opponent.setSeason(otherSeason);
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(leagueTeamService.findById(2L)).thenReturn(opponent);

            assertThatThrownBy(() -> gameService.updateOpponent(10L, 2L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("selben Saison");
        }
    }

    @Nested
    class SetScore {

        @Test
        void validScore_setsScores() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final Game result = gameService.setScore(10L, 5, 3);

            assertThat(result.getScoreUs()).isEqualTo(5);
            assertThat(result.getScoreThem()).isEqualTo(3);
        }

        @Test
        void clearScores_setsNull() {
            game.setScoreUs(5);
            game.setScoreThem(3);
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final Game result = gameService.setScore(10L, null, null);

            assertThat(result.getScoreUs()).isNull();
            assertThat(result.getScoreThem()).isNull();
        }

        @Test
        void onlyOneScoreSet_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameService.setScore(10L, 5, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("beide gesetzt oder beide null");
        }

        @Test
        void negativeScoreUs_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameService.setScore(10L, -1, 3))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("negativ");
        }

        @Test
        void negativeScoreThem_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameService.setScore(10L, 3, -1))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("negativ");
        }
    }

    @Nested
    class SwapGames {

        @Test
        void swapWithSelf_throws() {
            assertThatThrownBy(() -> gameService.swapGames(10L, 10L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("sich selbst");
        }

        @Test
        void differentGameDays_throws() {
            final GameDay otherGameDay = new GameDay(2L, LocalDate.now(), "Spieltag 2", "Feld B");
            otherGameDay.setSeason(season);
            final Game gameB = new Game(20L, 2);
            gameB.setGameDay(otherGameDay);

            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(gameRepository.findById(20L)).thenReturn(Optional.of(gameB));

            assertThatThrownBy(() -> gameService.swapGames(10L, 20L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("selben Spieltag");
        }

        @Test
        void validSwap_swapsFieldsAndLineups() {
            final Game gameB = new Game(20L, 2);
            gameB.setGameDay(gameDay);

            final LeagueTeam opp1 = new LeagueTeam(2L, "Tigers", false);
            final LeagueTeam opp2 = new LeagueTeam(3L, "Bears", false);
            game.setOpponentTeam(opp1);
            game.setScoreUs(10);
            game.setScoreThem(5);
            gameB.setOpponentTeam(opp2);
            gameB.setScoreUs(3);
            gameB.setScoreThem(7);

            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(gameRepository.findById(20L)).thenReturn(Optional.of(gameB));
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of());
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(20L)).thenReturn(List.of());
            when(gameStaffRepository.findByGameId(10L)).thenReturn(List.of());
            when(gameStaffRepository.findByGameId(20L)).thenReturn(List.of());
            when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final List<Game> result = gameService.swapGames(10L, 20L);

            // Game A should now have Game B's fields
            assertThat(result.get(0).getOpponentTeam().getName()).isEqualTo("Bears");
            assertThat(result.get(0).getScoreUs()).isEqualTo(3);
            assertThat(result.get(0).getScoreThem()).isEqualTo(7);

            // Game B should now have Game A's fields
            assertThat(result.get(1).getOpponentTeam().getName()).isEqualTo("Tigers");
            assertThat(result.get(1).getScoreUs()).isEqualTo(10);
            assertThat(result.get(1).getScoreThem()).isEqualTo(5);
        }

        @Test
        void validSwap_recreatesLineupEntries() {
            final Game gameB = new Game(20L, 2);
            gameB.setGameDay(gameDay);

            final Player player1 = new Player(1L, "Player 1", true);
            final LineupEntry entryA = new LineupEntry(game, player1, Position.P, 1);

            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(gameRepository.findById(20L)).thenReturn(Optional.of(gameB));
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of(entryA));
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(20L)).thenReturn(List.of());
            when(gameStaffRepository.findByGameId(10L)).thenReturn(List.of());
            when(gameStaffRepository.findByGameId(20L)).thenReturn(List.of());
            when(gameRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(lineupEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            gameService.swapGames(10L, 20L);

            // Old entries deleted
            verify(lineupEntryRepository).deleteByGameId(10L);
            verify(lineupEntryRepository).deleteByGameId(20L);

            // EntryA should be recreated on gameB
            verify(lineupEntryRepository).save(argThat(e ->
                e.getGame().getId().equals(20L) && e.getPlayer().getId().equals(1L)));
        }
    }
}
