package com.softball.service;

import com.softball.adapter.dto.SubstitutionRequest;
import com.softball.application.SubstitutionService;
import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SubstitutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubstitutionServiceTest {

    @Mock
    private SubstitutionRepository substitutionRepository;
    @Mock
    private LineupEntryRepository lineupEntryRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private GameRepository gameRepository;

    @InjectMocks
    private SubstitutionService substitutionService;

    private Game game;
    private GameDay gameDay;
    private Player lineupPlayer1;
    private Player lineupPlayer2;
    private Player benchPlayer;

    @BeforeEach
    void setUp() {
        lineupPlayer1 = new Player(1L, "Max", true);
        lineupPlayer2 = new Player(2L, "Lisa", true);
        benchPlayer = new Player(3L, "Anna", true);

        gameDay = new GameDay();
        gameDay.setId(100L);
        gameDay.setAvailablePlayers(Set.of(lineupPlayer1, lineupPlayer2, benchPlayer));

        game = new Game(10L, 1);
        game.setGameDay(gameDay);
    }

    private void setupGameAndLineup() {
        when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
        when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of(
            new LineupEntry(game, lineupPlayer1, Position.SS, 1),
            new LineupEntry(game, lineupPlayer2, Position.P, 2)
        ));
    }

    @Nested
    class SetSubstitutions {

        @Test
        void validSubstitution_succeeds() {
            setupGameAndLineup();
            when(playerRepository.findAllById(any())).thenReturn(List.of(lineupPlayer1, benchPlayer));
            when(substitutionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            substitutionService.setSubstitutions(10L, List.of(
                new SubstitutionRequest(1L, 3L, 3)
            ));

            verify(substitutionRepository).deleteByGameId(10L);
            verify(substitutionRepository).save(any(Substitution.class));
        }

        @Test
        void multipleSubstitutions_succeed() {
            setupGameAndLineup();
            when(playerRepository.findAllById(any())).thenReturn(List.of(lineupPlayer1, lineupPlayer2, benchPlayer));
            when(substitutionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            substitutionService.setSubstitutions(10L, List.of(
                new SubstitutionRequest(1L, 3L, 3),
                new SubstitutionRequest(2L, 3L, 5)
            ));

            verify(substitutionRepository, times(2)).save(any(Substitution.class));
        }

        @Test
        void emptyList_clearsSubstitutions() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            substitutionService.setSubstitutions(10L, List.of());

            verify(substitutionRepository).deleteByGameId(10L);
            verify(substitutionRepository, never()).save(any());
        }

        @Test
        void gameNotFound_throws() {
            when(gameRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                substitutionService.setSubstitutions(99L, List.of(new SubstitutionRequest(1L, 3L, 3)))
            ).isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void playerOutNotInLineup_throws() {
            setupGameAndLineup();

            assertThatThrownBy(() ->
                substitutionService.setSubstitutions(10L, List.of(
                    new SubstitutionRequest(3L, 1L, 3)
                ))
            ).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Lineup");
        }

        @Test
        void playerInAlreadyInLineup_throws() {
            setupGameAndLineup();

            assertThatThrownBy(() ->
                substitutionService.setSubstitutions(10L, List.of(
                    new SubstitutionRequest(1L, 2L, 3)
                ))
            ).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("bereits im Lineup");
        }

        @Test
        void samePlayerOutAndIn_throws() {
            setupGameAndLineup();

            assertThatThrownBy(() ->
                substitutionService.setSubstitutions(10L, List.of(
                    new SubstitutionRequest(1L, 1L, 3)
                ))
            ).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("sich selbst");
        }
    }

    @Nested
    class GetSubstitutions {

        @Test
        void delegatesToRepository() {
            when(substitutionRepository.findByGameId(10L)).thenReturn(List.of());

            substitutionService.getSubstitutions(10L);

            verify(substitutionRepository).findByGameId(10L);
        }
    }
}
