package com.softball.service;

import com.softball.adapter.dto.SetAttendanceRequest;
import com.softball.adapter.dto.TrainingAttendanceResponse;
import com.softball.application.TrainingAttendanceService;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingAttendanceServiceTest {

    @Mock private TrainingRepository trainingRepository;
    @Mock private TrainingAttendanceRepository attendanceRepository;
    @Mock private PlayerRepository playerRepository;

    @InjectMocks private TrainingAttendanceService service;

    private Training training;
    private Player player1;
    private Player player2;

    @BeforeEach
    void setUp() {
        training = new Training(LocalDate.of(2025, 6, 1), "18:00", "Feld A");
        training.setId(1L);
        training.setAttendances(new ArrayList<>());

        player1 = new Player(1L, "Alice", true);
        player2 = new Player(2L, "Bob", true);
    }

    @Test
    void getAttendance_trainingNotFound_throws() {
        when(trainingRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getAttendance(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAttendance_returnsAttendance() {
        when(trainingRepository.findById(1L)).thenReturn(Optional.of(training));
        final var attendance = new TrainingAttendance(training, player1, true);
        when(attendanceRepository.findByTrainingId(1L)).thenReturn(List.of(attendance));

        final List<TrainingAttendanceResponse> result = service.getAttendance(1L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().player().name()).isEqualTo("Alice");
    }

    @Test
    void getAllAttendance_emptyTrainings_returnsEmptyMap() {
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of());

        assertThat(service.getAllAttendance(null)).isEmpty();
    }

    @Test
    void getAllAttendance_groupsByTrainingId() {
        final Training t1 = new Training(LocalDate.of(2025, 6, 1), "18:00", "Feld");
        t1.setId(10L);
        final Training t2 = new Training(LocalDate.of(2025, 6, 8), "18:00", "Feld");
        t2.setId(20L);
        when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(t1, t2));

        final var a1 = new TrainingAttendance(t1, player1, true);
        final var a2 = new TrainingAttendance(t2, player2, false);
        when(attendanceRepository.findByTrainingIdIn(List.of(10L, 20L))).thenReturn(List.of(a1, a2));

        final Map<Long, List<TrainingAttendanceResponse>> result = service.getAllAttendance(null);

        assertThat(result).hasSize(2);
        assertThat(result.get(10L)).hasSize(1);
        assertThat(result.get(20L)).hasSize(1);
    }

    @Test
    void getAllAttendance_filtersByPeriod() {
        when(trainingRepository.findByPeriodIdOrderByDateDesc(5L)).thenReturn(List.of());

        service.getAllAttendance(5L);

        verify(trainingRepository).findByPeriodIdOrderByDateDesc(5L);
        verify(trainingRepository, never()).findAllByOrderByDateDesc();
    }

    @Test
    void setAttendance_playerNotFound_throws() {
        when(trainingRepository.findById(1L)).thenReturn(Optional.of(training));
        when(playerRepository.findAllById(List.of(1L, 99L))).thenReturn(List.of(player1));

        final var entries = List.of(
            new SetAttendanceRequest.AttendanceEntry(1L, true),
            new SetAttendanceRequest.AttendanceEntry(99L, false)
        );

        assertThatThrownBy(() -> service.setAttendance(1L, entries))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("nicht gefunden");
    }

    @Test
    void setAttendance_clearsAndRecreates() {
        when(trainingRepository.findById(1L)).thenReturn(Optional.of(training));
        when(playerRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(player1, player2));
        when(attendanceRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        final var entries = List.of(
            new SetAttendanceRequest.AttendanceEntry(1L, true),
            new SetAttendanceRequest.AttendanceEntry(2L, false)
        );

        final List<TrainingAttendanceResponse> result = service.setAttendance(1L, entries);

        verify(attendanceRepository).deleteByTrainingId(1L);
        verify(trainingRepository).flush();
        assertThat(result).hasSize(2);
    }

    @Test
    void setAttendance_trainingNotFound_throws() {
        when(trainingRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setAttendance(99L, List.of()))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
