package com.softball.service;

import com.softball.adapter.dto.TrainingPeriodResponse;
import com.softball.application.TrainingPeriodService;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.TrainingRepository;
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
class TrainingPeriodServiceTest {

    @Mock private TrainingPeriodRepository periodRepository;
    @Mock private TrainingRepository trainingRepository;
    @Mock private TrainingAttendanceRepository attendanceRepository;
    @Mock private TrainingPlanRepository trainingPlanRepository;
    @Mock private com.softball.application.RegularPlayerAutoFiller autoFiller;

    @InjectMocks private TrainingPeriodService service;

    @Test
    void findAll_returnsPeriods() {
        final var period = new TrainingPeriod("Winter 2025", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 31));
        period.setId(1L);
        when(periodRepository.findAllByOrderByStartDateDesc()).thenReturn(List.of(period));

        final List<TrainingPeriodResponse> result = service.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().name()).isEqualTo("Winter 2025");
    }

    @Test
    void create_savesNewPeriod() {
        when(periodRepository.save(any())).thenAnswer(inv -> {
            final TrainingPeriod p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        final TrainingPeriodResponse result = service.create("Sommer", LocalDate.of(2025, 4, 1), LocalDate.of(2025, 9, 30));

        assertThat(result.name()).isEqualTo("Sommer");
        verify(periodRepository).save(any(TrainingPeriod.class));
    }

    @Test
    void create_startAfterEnd_throws() {
        assertThatThrownBy(() -> service.create("Test", LocalDate.of(2025, 9, 1), LocalDate.of(2025, 1, 1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Startdatum");
    }

    @Test
    void rename_periodNotFound_throws() {
        when(periodRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rename(99L, "Neuer Name"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void rename_blankName_throws() {
        final var period = new TrainingPeriod("Alt", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 31));
        when(periodRepository.findById(1L)).thenReturn(Optional.of(period));

        assertThatThrownBy(() -> service.rename(1L, "  "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Name");
    }

    @Test
    void rename_updatesName() {
        final var period = new TrainingPeriod("Alt", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 31));
        period.setId(1L);
        when(periodRepository.findById(1L)).thenReturn(Optional.of(period));
        when(periodRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        final TrainingPeriodResponse result = service.rename(1L, "Neu");

        assertThat(result.name()).isEqualTo("Neu");
    }

    @Test
    void delete_periodNotFound_throws() {
        when(periodRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_batchDeletesAttendanceAndTrainings() {
        when(periodRepository.existsById(1L)).thenReturn(true);
        final var t1 = new Training(LocalDate.of(2025, 6, 1), "18:00", "Feld");
        t1.setId(10L);
        final var t2 = new Training(LocalDate.of(2025, 6, 8), "18:00", "Feld");
        t2.setId(20L);
        when(trainingRepository.findByPeriodIdOrderByDateDesc(1L)).thenReturn(List.of(t1, t2));

        service.delete(1L);

        // Cascade: Plans, Attendance und Trainings löschen
        verify(trainingPlanRepository).deleteByTrainingIds(List.of(10L, 20L));
        verify(attendanceRepository).deleteByTrainingIds(List.of(10L, 20L));
        verify(attendanceRepository, never()).deleteByTrainingId(any());
        verify(trainingRepository).deleteAll(List.of(t1, t2));
        verify(periodRepository).deleteById(1L);
    }

    @Test
    void delete_noTrainings_skipsAttendanceDelete() {
        when(periodRepository.existsById(1L)).thenReturn(true);
        when(trainingRepository.findByPeriodIdOrderByDateDesc(1L)).thenReturn(List.of());

        service.delete(1L);

        verify(attendanceRepository, never()).deleteByTrainingIds(any());
        verify(periodRepository).deleteById(1L);
    }

    @Test
    void update_addsWeekday_createsFutureTrainings_andPersistsRhythm() {
        final LocalDate today = LocalDate.now();
        final LocalDate start = today.minusDays(1);
        final LocalDate end = today.plusWeeks(2);

        final TrainingPeriod period = new TrainingPeriod(7L, "Sommer", start, end);
        when(periodRepository.findById(7L)).thenReturn(Optional.of(period));
        when(periodRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(trainingRepository.findByPeriodIdOrderByDateDesc(7L)).thenReturn(List.of());
        when(trainingRepository.save(any())).thenAnswer(inv -> {
            final Training t = inv.getArgument(0);
            t.setId(99L);
            return t;
        });

        // Rhythmus: der Wochentag von 'today' -> mind. 1 künftiger Termin (today) wird angelegt.
        final int todayDow = today.getDayOfWeek().getValue();
        final TrainingPeriodResponse res = service.update(7L, "Sommer", start, end, List.of(todayDow), "18:00", "Park");

        assertThat(res.weekdays()).containsExactly(todayDow);
        assertThat(res.time()).isEqualTo("18:00");
        verify(trainingRepository, atLeastOnce()).save(any(Training.class));
        verify(autoFiller, atLeastOnce()).autoFill(any(Training.class));
    }

    @Test
    void update_missingPeriod_throws() {
        when(periodRepository.findById(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(404L, "X", LocalDate.now(), LocalDate.now().plusDays(1), List.of(1), null, null))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
