package com.softball.service;

import com.softball.adapter.dto.TrainingStatsResponse;
import com.softball.application.TrainingStatsService;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingStatsServiceTest {

    @Mock private TrainingRepository trainingRepository;
    @Mock private TrainingAttendanceRepository attendanceRepository;
    @Mock private PlayerRepository playerRepository;

    @InjectMocks private TrainingStatsService service;

    private Training training(final Long id, final LocalDate date, final boolean cancelled) {
        final Training t = new Training(date, "18:00", "Feld");
        t.setId(id);
        t.setCancelled(cancelled);
        return t;
    }

    @Test
    void getStats_noTrainings_returnsRegularPlayersWithZero() {
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of());
        final Player regular = new Player(1L, "Alice", true);
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(regular));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(regular));

        final List<TrainingStatsResponse> result = service.getStats(null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().attended()).isZero();
        assertThat(result.getFirst().totalTrainings()).isZero();
    }

    @Test
    void getStats_cancelledTrainingsExcluded() {
        final var t1 = training(1L, LocalDate.of(2025, 6, 1), false);
        final var t2 = training(2L, LocalDate.of(2025, 6, 8), true); // cancelled
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(t1, t2));

        final Player player = new Player(1L, "Alice", true);
        final var attendance = new TrainingAttendance(t1, player, true);
        when(attendanceRepository.findByTrainingIdIn(List.of(1L))).thenReturn(List.of(attendance));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(player));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(player));

        final List<TrainingStatsResponse> result = service.getStats(null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().totalTrainings()).isEqualTo(1); // nur t1
        assertThat(result.getFirst().attended()).isEqualTo(1);
    }

    @Test
    void getStats_sinceFilter_excludesOlderTrainings() {
        final var old = training(1L, LocalDate.of(2025, 1, 1), false);
        final var recent = training(2L, LocalDate.of(2025, 6, 1), false);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(old, recent));

        final Player player = new Player(1L, "Alice", true);
        final var attendance = new TrainingAttendance(recent, player, true);
        when(attendanceRepository.findByTrainingIdIn(List.of(2L))).thenReturn(List.of(attendance));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(player));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(player));

        final List<TrainingStatsResponse> result = service.getStats(null, LocalDate.of(2025, 3, 1), null);

        assertThat(result.getFirst().totalTrainings()).isEqualTo(1); // nur recent
    }

    @Test
    void getStats_filtersByPeriod() {
        when(trainingRepository.findByPeriodIdOrderByDateDesc(5L)).thenReturn(List.of());
        when(playerRepository.findByRegularTrue()).thenReturn(List.of());

        service.getStats(5L, null, null);

        verify(trainingRepository).findByPeriodIdOrderByDateDesc(5L);
        verify(trainingRepository, never()).findAllByOrderByDateDesc();
    }

    @Test
    void getStats_countsAttendancePerPlayer() {
        final var t1 = training(1L, LocalDate.of(2025, 6, 1), false);
        final var t2 = training(2L, LocalDate.of(2025, 6, 8), false);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(t1, t2));

        final Player alice = new Player(1L, "Alice", true);
        final Player bob = new Player(2L, "Bob", true);
        when(attendanceRepository.findByTrainingIdIn(List.of(1L, 2L))).thenReturn(List.of(
            new TrainingAttendance(t1, alice, true),
            new TrainingAttendance(t2, alice, true),
            new TrainingAttendance(t1, bob, true),
            new TrainingAttendance(t2, bob, false) // Bob absent
        ));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(alice, bob));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(alice, bob));

        final List<TrainingStatsResponse> result = service.getStats(null, null, null);

        final var aliceStats = result.stream().filter(s -> s.playerId() == 1L).findFirst().orElseThrow();
        final var bobStats = result.stream().filter(s -> s.playerId() == 2L).findFirst().orElseThrow();
        assertThat(aliceStats.attended()).isEqualTo(2);
        assertThat(bobStats.attended()).isEqualTo(1);
        assertThat(aliceStats.totalTrainings()).isEqualTo(2);
    }

    @Test
    void getStats_untilFilter_excludesFutureTrainings() {
        final var past = training(1L, LocalDate.of(2025, 6, 1), false);
        final var future = training(2L, LocalDate.of(2025, 9, 1), false);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(past, future));

        final Player player = new Player(1L, "Alice", true);
        final var attendance1 = new TrainingAttendance(past, player, true);
        final var attendance2 = new TrainingAttendance(future, player, true);
        when(attendanceRepository.findByTrainingIdIn(List.of(1L))).thenReturn(List.of(attendance1));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(player));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(player));

        final List<TrainingStatsResponse> result = service.getStats(null, null, LocalDate.of(2025, 7, 1));

        assertThat(result.getFirst().totalTrainings()).isEqualTo(1); // nur past
        assertThat(result.getFirst().attended()).isEqualTo(1);
    }

    @Test
    void getStats_sinceAndUntilTogether_filtersRange() {
        final var old = training(1L, LocalDate.of(2025, 1, 1), false);
        final var mid = training(2L, LocalDate.of(2025, 6, 1), false);
        final var future = training(3L, LocalDate.of(2025, 12, 1), false);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(old, mid, future));

        final Player player = new Player(1L, "Alice", true);
        final var attendance = new TrainingAttendance(mid, player, true);
        when(attendanceRepository.findByTrainingIdIn(List.of(2L))).thenReturn(List.of(attendance));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(player));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(player));

        final List<TrainingStatsResponse> result = service.getStats(null, LocalDate.of(2025, 3, 1), LocalDate.of(2025, 9, 1));

        assertThat(result.getFirst().totalTrainings()).isEqualTo(1); // nur mid
        assertThat(result.getFirst().attended()).isEqualTo(1);
    }

    @Test
    void getStats_untilIncludesBoundaryDate() {
        final var onDate = training(1L, LocalDate.of(2025, 6, 15), false);
        final var afterDate = training(2L, LocalDate.of(2025, 6, 16), false);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(onDate, afterDate));

        final Player player = new Player(1L, "Alice", true);
        final var attendance = new TrainingAttendance(onDate, player, true);
        when(attendanceRepository.findByTrainingIdIn(List.of(1L))).thenReturn(List.of(attendance));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of(player));
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(player));

        final List<TrainingStatsResponse> result = service.getStats(null, null, LocalDate.of(2025, 6, 15));

        assertThat(result.getFirst().totalTrainings()).isEqualTo(1); // onDate included, afterDate excluded
    }

    @Test
    void getStats_includesNonRegularPlayersWithAttendance() {
        final var t1 = training(1L, LocalDate.of(2025, 6, 1), false);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(t1));

        final Player guest = new Player(99L, "Guest", false); // nicht regulaer
        when(attendanceRepository.findByTrainingIdIn(List.of(1L))).thenReturn(List.of(
            new TrainingAttendance(t1, guest, true)
        ));
        when(playerRepository.findByRegularTrue()).thenReturn(List.of());
        when(playerRepository.findAllById(anyCollection())).thenReturn(List.of(guest));

        final List<TrainingStatsResponse> result = service.getStats(null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().playerName()).isEqualTo("Guest");
    }
}
