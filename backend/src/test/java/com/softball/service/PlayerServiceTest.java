package com.softball.service;

import com.softball.domain.model.Player;
import com.softball.application.SuperadminGuard;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SubstitutionRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.application.AvailabilityService;
import com.softball.application.PlayerService;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlayerServiceTest {

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private AtBatRepository atBatRepository;

    @Mock
    private BaseRunningEventRepository baseRunningEventRepository;

    @Mock
    private SubstitutionRepository substitutionRepository;

    @Mock
    private TrainingAttendanceRepository trainingAttendanceRepository;

    @Mock
    private AvailabilityService availabilityService;

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private SuperadminGuard superadminGuard;

    @InjectMocks
    private PlayerService playerService;

    private Player testPlayer;

    @BeforeEach
    void setUp() {
        testPlayer = new Player("Max");
        testPlayer.setId(1L);
    }

    @Test
    void findAll_returnsAllPlayers() {
        when(playerRepository.findAll()).thenReturn(List.of(testPlayer));

        final List<Player> players = playerService.findAll();

        assertThat(players).hasSize(1);
        assertThat(players.getFirst().getName()).isEqualTo("Max");
    }

    @Test
    void findById_existingPlayer_returnsPlayer() {
        when(playerRepository.findById(1L)).thenReturn(Optional.of(testPlayer));

        final Player player = playerService.findById(1L);

        assertThat(player.getName()).isEqualTo("Max");
    }

    @Test
    void findById_nonExistingPlayer_throwsResourceNotFound() {
        when(playerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playerService.findById(99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Player not found");
    }

    @Test
    void create_savesAndReturnsPlayer() {
        when(playerRepository.save(any(Player.class))).thenReturn(testPlayer);

        final Player created = playerService.create("Max");

        assertThat(created.getName()).isEqualTo("Max");
        verify(playerRepository).save(any(Player.class));
    }

    @Test
    void update_changesName() {
        when(playerRepository.findById(1L)).thenReturn(Optional.of(testPlayer));
        when(playerRepository.save(any(Player.class))).thenAnswer(inv -> inv.getArgument(0));

        final Player updated = playerService.update(1L, "Maximilian", null);

        assertThat(updated.getName()).isEqualTo("Maximilian");
    }

    @Test
    void delete_existingPlayer_withoutScoring_cleansUpAndDeletes() {
        when(playerRepository.findById(1L)).thenReturn(Optional.of(testPlayer));
        when(atBatRepository.existsByPlayerId(1L)).thenReturn(false);
        when(baseRunningEventRepository.existsByRunnerPlayerId(1L)).thenReturn(false);
        when(substitutionRepository.existsByPlayerId(1L)).thenReturn(false);

        playerService.delete(1L);

        verify(availabilityService).removeAllPlanningReferences(1L);
        verify(trainingAttendanceRepository).deleteByPlayerId(1L);
        verify(playerRepository).deleteById(1L);
    }

    @Test
    void delete_existingPlayer_withAtBatScoring_throwsBusinessValidation() {
        when(playerRepository.findById(1L)).thenReturn(Optional.of(testPlayer));
        when(atBatRepository.existsByPlayerId(1L)).thenReturn(true);

        assertThatThrownBy(() -> playerService.delete(1L))
            .isInstanceOf(BusinessValidationException.class)
            .hasMessageContaining("Scoring-Daten");

        verify(playerRepository, never()).deleteById(any());
    }

    @Test
    void delete_nonExistingPlayer_throwsResourceNotFound() {
        when(playerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playerService.delete(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateBattingOrder_setsOrderByIndex() {
        final Player p1 = new Player(1L, "Alice", true);
        final Player p2 = new Player(2L, "Bob", true);
        final Player p3 = new Player(3L, "Charlie", true);
        when(playerRepository.findAll()).thenReturn(List.of(p1, p2, p3));
        when(playerRepository.save(any(Player.class))).thenAnswer(inv -> inv.getArgument(0));

        final List<Player> result = playerService.updateBattingOrder(List.of(3L, 1L));

        // Player 3 = order 1, Player 1 = order 2, Player 2 = null
        assertThat(p3.getDefaultBattingOrder()).isEqualTo(1);
        assertThat(p1.getDefaultBattingOrder()).isEqualTo(2);
        assertThat(p2.getDefaultBattingOrder()).isNull();
        verify(playerRepository, times(3)).save(any(Player.class));
    }
}
