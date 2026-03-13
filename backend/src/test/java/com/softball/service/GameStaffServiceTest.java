package com.softball.service;

import com.softball.adapter.dto.GameStaffRequest;
import com.softball.application.GameStaffService;
import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.GameStaffRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameStaffServiceTest {

    @Mock
    private GameStaffRepository gameStaffRepository;
    @Mock
    private LineupEntryRepository lineupEntryRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private GameRepository gameRepository;

    @InjectMocks
    private GameStaffService gameStaffService;

    private Game game;
    private Player player1;
    private Player player2;

    @BeforeEach
    void setUp() {
        game = new Game(10L, 1);
        player1 = new Player(1L, "Coach 1", true);
        player2 = new Player(2L, "Coach 2", true);
    }

    @Test
    void getStaff_returnsStaffForGame() {
        final GameStaff staff = new GameStaff(game, player1, StaffRole.BASE_COACH_1ST);
        when(gameStaffRepository.findByGameId(10L)).thenReturn(List.of(staff));

        final List<GameStaff> result = gameStaffService.getStaff(10L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getPlayer().getName()).isEqualTo("Coach 1");
    }

    @Nested
    class SetStaff {

        @Test
        void validStaff_savesSuccessfully() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of());
            when(playerRepository.findById(1L)).thenReturn(Optional.of(player1));
            when(gameStaffRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final List<GameStaff> result = gameStaffService.setStaff(10L,
                List.of(new GameStaffRequest(1L, "BASE_COACH_1ST")));

            assertThat(result).hasSize(1);
            verify(gameStaffRepository).deleteByGameId(10L);
        }

        @Test
        void moreThanTwoCoaches_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameStaffService.setStaff(10L, List.of(
                new GameStaffRequest(1L, "BASE_COACH_1ST"),
                new GameStaffRequest(2L, "BASE_COACH_3RD"),
                new GameStaffRequest(3L, "BASE_COACH_1ST")
            ))).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Maximal 2");
        }

        @Test
        void duplicatePlayer_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameStaffService.setStaff(10L, List.of(
                new GameStaffRequest(1L, "BASE_COACH_1ST"),
                new GameStaffRequest(1L, "BASE_COACH_3RD")
            ))).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("doppelt als Coach");
        }

        @Test
        void duplicateRole_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameStaffService.setStaff(10L, List.of(
                new GameStaffRequest(1L, "BASE_COACH_1ST"),
                new GameStaffRequest(2L, "BASE_COACH_1ST")
            ))).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("doppelt vergeben");
        }

        @Test
        void invalidRole_throws() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));

            assertThatThrownBy(() -> gameStaffService.setStaff(10L, List.of(
                new GameStaffRequest(1L, "INVALID_ROLE")
            ))).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Ungueltige Rolle");
        }

        @Test
        void playerInLineup_throws() {
            final LineupEntry entry = new LineupEntry(game, player1, Position.P, 1);
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of(entry));

            assertThatThrownBy(() -> gameStaffService.setStaff(10L, List.of(
                new GameStaffRequest(1L, "BASE_COACH_1ST")
            ))).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("bereits im Lineup");
        }

        @Test
        void gameNotFound_throws() {
            when(gameRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> gameStaffService.setStaff(99L, List.of()))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void emptyStaff_clearsExisting() {
            when(gameRepository.findById(10L)).thenReturn(Optional.of(game));
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(10L)).thenReturn(List.of());

            final List<GameStaff> result = gameStaffService.setStaff(10L, List.of());

            assertThat(result).isEmpty();
            verify(gameStaffRepository).deleteByGameId(10L);
        }
    }
}
