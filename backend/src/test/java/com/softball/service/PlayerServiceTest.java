package com.softball.service;

import com.softball.entity.Player;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.PlayerRepository;
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
    void delete_existingPlayer_callsRepository() {
        when(playerRepository.existsById(1L)).thenReturn(true);

        playerService.delete(1L);

        verify(playerRepository).deleteById(1L);
    }

    @Test
    void delete_nonExistingPlayer_throwsResourceNotFound() {
        when(playerRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> playerService.delete(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
