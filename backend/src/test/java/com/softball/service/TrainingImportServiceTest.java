package com.softball.service;

import com.softball.adapter.dto.TrainingImportResponse;
import com.softball.application.TrainingImportService;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingImportServiceTest {

    @Mock private TrainingRepository trainingRepository;
    @Mock private TrainingAttendanceRepository attendanceRepository;
    @Mock private PlayerRepository playerRepository;
    @Mock private TrainingPeriodRepository periodRepository;

    @InjectMocks private TrainingImportService service;

    @BeforeEach
    void setUp() {
        lenient().when(trainingRepository.save(any(Training.class))).thenAnswer(inv -> {
            final Training t = inv.getArgument(0);
            if (t.getId() == null) t.setId(1L);
            return t;
        });
        lenient().when(trainingRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(attendanceRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void tooFewLines_throws() {
        assertThatThrownBy(() -> service.importCsv("Datum", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Kopfzeile");
    }

    @Test
    void invalidDate_throws() {
        final String csv = "Datum,Alice\nnot-a-date,TRUE";
        when(playerRepository.findAll()).thenReturn(List.of());

        assertThatThrownBy(() -> service.importCsv(csv, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Datum");
    }

    @Test
    void validCsv_createsTrainingWithAttendance() {
        final String csv = "Datum,Alice\n01.06.2025,TRUE";
        final Player alice = new Player(1L, "Alice", true);
        when(playerRepository.findAll()).thenReturn(List.of(alice));
        when(trainingRepository.existsByDate(LocalDate.of(2025, 6, 1))).thenReturn(false);

        final TrainingImportResponse result = service.importCsv(csv, null);

        assertThat(result.trainingsCreated()).isEqualTo(1);
        assertThat(result.trainingsSkipped()).isZero();
        assertThat(result.playersNotFound()).isZero();
        verify(attendanceRepository).saveAll(anyList());
    }

    @Test
    void existingDate_skipped() {
        final String csv = "Datum,Alice\n01.06.2025,TRUE";
        when(playerRepository.findAll()).thenReturn(List.of());
        when(trainingRepository.existsByDate(LocalDate.of(2025, 6, 1))).thenReturn(true);

        final TrainingImportResponse result = service.importCsv(csv, null);

        assertThat(result.trainingsCreated()).isZero();
        assertThat(result.trainingsSkipped()).isEqualTo(1);
    }

    @Test
    void unknownPlayer_countedAsNotFound() {
        final String csv = "Datum,Unknown\n01.06.2025,TRUE";
        when(playerRepository.findAll()).thenReturn(List.of()); // no players
        when(trainingRepository.existsByDate(any())).thenReturn(false);

        final TrainingImportResponse result = service.importCsv(csv, null);

        assertThat(result.playersNotFound()).isEqualTo(1);
    }

    @Test
    void allAttendanceEmpty_trainingMarkedCancelled() {
        final String csv = "Datum,Alice\n01.06.2025,";
        when(playerRepository.findAll()).thenReturn(List.of());
        when(trainingRepository.existsByDate(any())).thenReturn(false);

        service.importCsv(csv, null);

        verify(trainingRepository).save(argThat(Training::isCancelled));
        verify(attendanceRepository, never()).saveAll(anyList()); // keine Attendance fuer cancelled
    }

    @Test
    void withPeriodName_createsPeriodAndAssigns() {
        final String csv = "Datum,Alice\n01.06.2025,TRUE";
        final Player alice = new Player(1L, "Alice", true);
        when(playerRepository.findAll()).thenReturn(List.of(alice));
        when(trainingRepository.existsByDate(any())).thenReturn(false);
        when(periodRepository.findByNameIgnoreCase("Sommer")).thenReturn(Optional.empty());
        when(periodRepository.save(any(TrainingPeriod.class))).thenAnswer(inv -> {
            final TrainingPeriod p = inv.getArgument(0);
            p.setId(10L);
            return p;
        });

        service.importCsv(csv, "Sommer");

        verify(periodRepository).save(any(TrainingPeriod.class));
        verify(trainingRepository).saveAll(anyList()); // assigns period
    }

    @Test
    void bomStripped() {
        final String csv = "\uFEFFDatum,Alice\n01.06.2025,TRUE";
        final Player alice = new Player(1L, "Alice", true);
        when(playerRepository.findAll()).thenReturn(List.of(alice));
        when(trainingRepository.existsByDate(any())).thenReturn(false);

        final TrainingImportResponse result = service.importCsv(csv, null);

        assertThat(result.trainingsCreated()).isEqualTo(1);
    }

    @Test
    void playerNameCaseInsensitive() {
        final String csv = "Datum,alice\n01.06.2025,TRUE";
        final Player alice = new Player(1L, "Alice", true);
        when(playerRepository.findAll()).thenReturn(List.of(alice));
        when(trainingRepository.existsByDate(any())).thenReturn(false);

        final TrainingImportResponse result = service.importCsv(csv, null);

        assertThat(result.playersNotFound()).isZero();
        verify(attendanceRepository).saveAll(anyList());
    }

    @Test
    void multipleRows_createsMultipleTrainings() {
        final String csv = "Datum,Alice\n01.06.2025,TRUE\n08.06.2025,FALSE";
        final Player alice = new Player(1L, "Alice", true);
        when(playerRepository.findAll()).thenReturn(List.of(alice));
        when(trainingRepository.existsByDate(any())).thenReturn(false);

        final TrainingImportResponse result = service.importCsv(csv, null);

        assertThat(result.trainingsCreated()).isEqualTo(2);
    }
}
