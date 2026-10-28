package com.softball.application;

import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LineupSetServiceTest {

    @Mock LineupSetRepository lineupSetRepository;
    @Mock GameRepository gameRepository;
    @Mock LineupEntryRepository lineupEntryRepository;
    @Mock GameStaffRepository gameStaffRepository;
    @Mock GameDayRepository gameDayRepository;

    private LineupSetService service() {
        return new LineupSetService(lineupSetRepository, gameRepository, lineupEntryRepository,
            gameStaffRepository, gameDayRepository);
    }

    @Test
    void snapshot_capturesStaffAndAvailablePlayers() {
        final Game g1 = new Game(10L, 1);
        final Player hung = new Player(1L, "Hung", false, 1);
        final Player anne = new Player(2L, "Anne", true, 2);
        when(gameRepository.findByGameDayIdOrderByGameNumberAsc(99L)).thenReturn(List.of(g1));
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L))).thenReturn(List.of());
        when(gameStaffRepository.findByGameIdIn(List.of(10L)))
            .thenReturn(List.of(new GameStaff(g1, hung, StaffRole.BASE_COACH_1ST)));
        final GameDay gd = new GameDay();
        gd.setId(99L);
        gd.setAvailablePlayers(Set.of(hung, anne));
        when(gameDayRepository.findByIdWithPlayers(99L)).thenReturn(Optional.of(gd));
        when(lineupSetRepository.maxSortOrder(99L)).thenReturn(0);
        when(lineupSetRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service().snapshot(99L, "Set A");

        final ArgumentCaptor<LineupSet> captor = ArgumentCaptor.forClass(LineupSet.class);
        verify(lineupSetRepository).save(captor.capture());
        final LineupSet saved = captor.getValue();
        assertThat(saved.getStaffEntries()).hasSize(1);
        assertThat(saved.getStaffEntries().get(0).getRole()).isEqualTo(StaffRole.BASE_COACH_1ST);
        assertThat(saved.getStaffEntries().get(0).getGameNumber()).isEqualTo(1);
        assertThat(saved.getAvailablePlayerIds()).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void overwrite_keepsIdentityAndReplacesContent() {
        final Game g1 = new Game(10L, 1);
        final Player hung = new Player(1L, "Hung", false, 1);
        final Player anne = new Player(2L, "Anne", true, 2);

        final LineupSet existing = new LineupSet(99L, "Set A", 3);
        existing.setId(7L);
        existing.setEntries(List.of(new LineupSetEntry(1, anne, Position.P, 1, null)));
        existing.setStaffEntries(List.of(new LineupSetStaffEntry(1, anne, StaffRole.BASE_COACH_3RD)));
        existing.setAvailablePlayerIds(List.of(2L));
        when(lineupSetRepository.findById(7L)).thenReturn(Optional.of(existing));

        final LineupEntry current = new LineupEntry();
        current.setGame(g1);
        current.setPlayer(hung);
        current.setPosition(Position.C);
        current.setBattingOrder(1);
        when(gameRepository.findByGameDayIdOrderByGameNumberAsc(99L)).thenReturn(List.of(g1));
        when(lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(List.of(10L))).thenReturn(List.of(current));
        when(gameStaffRepository.findByGameIdIn(List.of(10L)))
            .thenReturn(List.of(new GameStaff(g1, hung, StaffRole.BASE_COACH_1ST)));
        final GameDay gd = new GameDay();
        gd.setId(99L);
        gd.setAvailablePlayers(Set.of(hung));
        when(gameDayRepository.findByIdWithPlayers(99L)).thenReturn(Optional.of(gd));
        when(lineupSetRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service().overwrite(7L);

        final ArgumentCaptor<LineupSet> captor = ArgumentCaptor.forClass(LineupSet.class);
        verify(lineupSetRepository).save(captor.capture());
        final LineupSet saved = captor.getValue();
        // Identitaet bleibt — nur der Inhalt ist der frische Spieltag-Stand
        assertThat(saved.getId()).isEqualTo(7L);
        assertThat(saved.getName()).isEqualTo("Set A");
        assertThat(saved.getSortOrder()).isEqualTo(3);
        assertThat(saved.getEntries()).hasSize(1);
        assertThat(saved.getEntries().get(0).getPlayer().getId()).isEqualTo(1L);
        assertThat(saved.getEntries().get(0).getPosition()).isEqualTo(Position.C);
        assertThat(saved.getStaffEntries()).hasSize(1);
        assertThat(saved.getStaffEntries().get(0).getRole()).isEqualTo(StaffRole.BASE_COACH_1ST);
        assertThat(saved.getAvailablePlayerIds()).containsExactly(1L);
    }
}
