package com.softball.service;

import com.softball.application.AvailabilityService;
import com.softball.domain.model.*;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AvailabilityServiceTest {

    @Mock
    private GameDayRepository gameDayRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private LineupEntryRepository lineupEntryRepository;
    @Mock
    private GameStaffRepository gameStaffRepository;

    @InjectMocks
    private AvailabilityService availabilityService;

    private GameDay gameDay;
    private Player player1;
    private Player player2;
    private Player player3;
    private Game game1;

    @BeforeEach
    void setUp() {
        player1 = new Player(1L, "Player 1", true);
        player2 = new Player(2L, "Player 2", true);
        player3 = new Player(3L, "Player 3", true);

        gameDay = new GameDay(10L, LocalDate.now(), "Spieltag 1", "Feld A");
        gameDay.setAvailablePlayers(new HashSet<>(Set.of(player1, player2, player3)));

        game1 = new Game(100L, 1);
        game1.setGameDay(gameDay);
    }

    @Test
    void setAvailablePlayers_gameDayNotFound_throws() {
        when(gameDayRepository.findByIdWithPlayers(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> availabilityService.setAvailablePlayers(99L, List.of(1L)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void setAvailablePlayers_playerNotFound_throws() {
        when(gameDayRepository.findByIdWithPlayers(10L)).thenReturn(Optional.of(gameDay));
        when(playerRepository.findAllById(List.of(1L, 99L))).thenReturn(List.of(player1));

        assertThatThrownBy(() -> availabilityService.setAvailablePlayers(10L, List.of(1L, 99L)))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("nicht gefunden");
    }

    @Test
    void setAvailablePlayers_noRemovals_noCascade() {
        when(gameDayRepository.findByIdWithPlayers(10L)).thenReturn(Optional.of(gameDay));
        when(playerRepository.findAllById(List.of(1L, 2L, 3L))).thenReturn(List.of(player1, player2, player3));
        when(gameDayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        availabilityService.setAvailablePlayers(10L, List.of(1L, 2L, 3L));

        // No cascade operations needed
        verify(gameDayRepository, never()).findByIdWithGames(any());
    }

    @Nested
    class CascadeRemoval {

        @BeforeEach
        void setUpCascade() {
            final GameDay gameDayWithGames = new GameDay(10L, LocalDate.now(), "Spieltag 1", "Feld A");
            gameDayWithGames.setGames(List.of(game1));

            when(gameDayRepository.findByIdWithPlayers(10L)).thenReturn(Optional.of(gameDay));
            when(gameDayRepository.findByIdWithGames(10L)).thenReturn(Optional.of(gameDayWithGames));
            when(playerRepository.findAllById(anyList())).thenReturn(List.of(player1));
            when(gameDayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        }

        @Test
        void removedPlayer_deletedFromLineup() {
            final LineupEntry entry = new LineupEntry(game1, player2, Position.P, 1);
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(100L)).thenReturn(new ArrayList<>(List.of(entry)));
            when(gameStaffRepository.findByGameId(100L)).thenReturn(List.of());

            // Remove player2 and player3 (keep only player1)
            availabilityService.setAvailablePlayers(10L, List.of(1L));

            verify(lineupEntryRepository).deleteAll(anyList());
        }

        @Test
        void removedPlayer_dhBatterReferenceCleared() {
            // player1 fields with player2 as DH batter; player2 gets removed
            final LineupEntry entryWithDh = new LineupEntry(game1, player1, Position.FIRST_BASE, 1, player2);
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(100L))
                .thenReturn(new ArrayList<>(List.of(entryWithDh)));
            when(gameStaffRepository.findByGameId(100L)).thenReturn(List.of());

            availabilityService.setAvailablePlayers(10L, List.of(1L));

            // DH reference should be cleared, entry saved
            verify(lineupEntryRepository).save(argThat(e ->
                e.getPlayer().getId().equals(1L) && e.getDhBatterPlayer() == null));
        }

        @Test
        void removedPlayer_deletedFromStaff() {
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(100L)).thenReturn(List.of());
            final GameStaff staff = new GameStaff(game1, player2, StaffRole.BASE_COACH_1ST);
            when(gameStaffRepository.findByGameId(100L)).thenReturn(List.of(staff));

            availabilityService.setAvailablePlayers(10L, List.of(1L));

            verify(gameStaffRepository).deleteAll(anyList());
        }

        @Test
        void removedPlayer_battingOrderRenumbered() {
            final LineupEntry entry1 = new LineupEntry(game1, player2, Position.P, 1);
            final LineupEntry entry2 = new LineupEntry(game1, player1, Position.C, 2);
            final LineupEntry entry3 = new LineupEntry(game1, player3, Position.FIRST_BASE, 3);

            // First call: returns all 3 entries (for DH check + delete)
            // Second call: returns remaining entries after delete (player1 at order 2)
            when(lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(100L))
                .thenReturn(new ArrayList<>(List.of(entry1, entry2, entry3)))
                .thenReturn(new ArrayList<>(List.of(entry2)));
            when(gameStaffRepository.findByGameId(100L)).thenReturn(List.of());

            // Remove player2 and player3
            availabilityService.setAvailablePlayers(10L, List.of(1L));

            // After removing player2 + player3, player1 should be renumbered to 1
            verify(lineupEntryRepository).saveAll(argThat((List<LineupEntry> entries) ->
                entries.size() == 1 && entries.getFirst().getBattingOrder() == 1));
        }
    }
}
