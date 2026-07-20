package com.softball.service;

import com.softball.adapter.dto.TrainingResponse;
import com.softball.application.RegularPlayerAutoFiller;
import com.softball.application.TrainingService;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingPeriod;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingServiceTest {

    @Mock private TrainingRepository trainingRepository;
    @Mock private TrainingPeriodRepository periodRepository;
    @Mock private RegularPlayerAutoFiller autoFiller;

    @InjectMocks private TrainingService service;

    private Training training;

    @BeforeEach
    void setUp() {
        training = new Training(LocalDate.of(2025, 6, 1), "18:00", "Feld A");
        training.setId(1L);
    }

    @Nested
    class FindAll {
        @Test
        void withoutPeriod_returnsAll() {
            when(trainingRepository.findAllByOrderByDateDesc()).thenReturn(List.of(training));

            final List<TrainingResponse> result = service.findAll(null);

            assertThat(result).hasSize(1);
            verify(trainingRepository).findAllByOrderByDateDesc();
        }

        @Test
        void withPeriod_filtersByPeriod() {
            when(trainingRepository.findByPeriodIdOrderByDateDesc(5L)).thenReturn(List.of());

            service.findAll(5L);

            verify(trainingRepository).findByPeriodIdOrderByDateDesc(5L);
            verify(trainingRepository, never()).findAllByOrderByDateDesc();
        }
    }

    @Nested
    class FindById {
        @Test
        void found_returnsTraining() {
            when(trainingRepository.findById(1L)).thenReturn(Optional.of(training));

            assertThat(service.findById(1L)).isEqualTo(training);
        }

        @Test
        void notFound_throws() {
            when(trainingRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    class Create {
        @Test
        void newTraining_createsAndAutoFills() {
            when(trainingRepository.findByDate(any())).thenReturn(Optional.empty());
            when(trainingRepository.save(any())).thenAnswer(inv -> {
                final Training t = inv.getArgument(0);
                t.setId(1L);
                return t;
            });

            final TrainingResponse result = service.create(LocalDate.of(2025, 6, 1), "18:00", "Feld", null);

            assertThat(result.date()).isEqualTo(LocalDate.of(2025, 6, 1));
            verify(autoFiller).autoFill(any()); // autoFill aufgerufen
        }

        @Test
        void existingDate_updatesWithoutAutoFill() {
            when(trainingRepository.findByDate(LocalDate.of(2025, 6, 1))).thenReturn(Optional.of(training));
            when(trainingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final TrainingResponse result = service.create(LocalDate.of(2025, 6, 1), "19:00", "Feld B", null);

            assertThat(result.time()).isEqualTo("19:00");
            verify(autoFiller, never()).autoFill(any()); // kein autoFill
        }

        @Test
        void withType_setsType() {
            when(trainingRepository.findByDate(any())).thenReturn(Optional.empty());
            when(trainingRepository.save(any())).thenAnswer(inv -> {
                final Training t = inv.getArgument(0);
                t.setId(1L);
                return t;
            });

            final TrainingResponse result = service.create(LocalDate.of(2025, 6, 1), "18:00", "Feld", "Hitting");

            assertThat(result.type()).isEqualTo("Hitting");
        }
    }

    @Nested
    class Update {
        @Test
        void updatesFields() {
            when(trainingRepository.findById(1L)).thenReturn(Optional.of(training));
            when(trainingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final TrainingResponse result = service.update(1L, null, "19:00", "Feld B", true, "Fielding");

            assertThat(result.time()).isEqualTo("19:00");
            assertThat(result.location()).isEqualTo("Feld B");
            assertThat(result.cancelled()).isTrue();
            assertThat(result.type()).isEqualTo("Fielding");
        }

        @Test
        void notFound_throws() {
            when(trainingRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.update(99L, null, null, null, null, null))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        void dateUpdate_changesDate() {
            when(trainingRepository.findById(1L)).thenReturn(Optional.of(training));
            when(trainingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final TrainingResponse result = service.update(1L, LocalDate.of(2025, 7, 1), null, null, null, null);

            assertThat(result.date()).isEqualTo(LocalDate.of(2025, 7, 1));
        }
    }

    @Nested
    class Delete {
        @Test
        void existing_deletes() {
            when(trainingRepository.existsById(1L)).thenReturn(true);

            service.delete(1L);

            verify(trainingRepository).deleteById(1L);
        }

        @Test
        void notFound_throws() {
            when(trainingRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    class CreateBulk {
        @Test
        void startAfterEnd_throws() {
            assertThatThrownBy(() -> service.createBulk(
                List.of(1), LocalDate.of(2025, 6, 30), LocalDate.of(2025, 6, 1),
                "18:00", Map.of(1, "18:00"), "Feld", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Startdatum");
        }

        @Test
        void invalidWeekday_throws() {
            assertThatThrownBy(() -> service.createBulk(
                List.of(8), LocalDate.of(2025, 6, 1), LocalDate.of(2025, 6, 30),
                "18:00", Map.of(), "Feld", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Wochentag");
        }

        @Test
        void missingTimeForWeekday_throws() {
            assertThatThrownBy(() -> service.createBulk(
                List.of(1, 4), LocalDate.of(2025, 6, 1), LocalDate.of(2025, 6, 30),
                "18:00", Map.of(1, "18:00"), "Feld", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Uhrzeit");
        }

        @Test
        void createsTrainingsForMatchingDays() {
            // 2025-06-02 bis 2025-06-08 = eine Woche, Montag (1) = 2025-06-02
            when(trainingRepository.findByDateIn(any())).thenReturn(List.of());
            when(trainingRepository.save(any())).thenAnswer(inv -> {
                final Training t = inv.getArgument(0);
                t.setId(1L);
                return t;
            });

            final List<TrainingResponse> result = service.createBulk(
                List.of(1), LocalDate.of(2025, 6, 2), LocalDate.of(2025, 6, 8),
                "18:00", Map.of(1, "18:00"), "Feld", null, null);

            assertThat(result).hasSize(1); // nur Montag
        }

        @Test
        void setsTimePerWeekday() {
            // 2025-06-02 (Mo) bis 2025-06-08 (So): Mo -> 18:00, Do (2025-06-05) -> 19:00
            when(trainingRepository.findByDateIn(any())).thenReturn(List.of());
            when(trainingRepository.save(any())).thenAnswer(inv -> {
                final Training t = inv.getArgument(0);
                t.setId(1L);
                return t;
            });

            final List<TrainingResponse> result = service.createBulk(
                List.of(1, 4), LocalDate.of(2025, 6, 2), LocalDate.of(2025, 6, 8),
                "18:00", Map.of(1, "18:00", 4, "19:00"), "Feld", null, null);

            assertThat(result).hasSize(2);
            assertThat(result).allSatisfy(r -> {
                final int dow = r.date().getDayOfWeek().getValue();
                assertThat(r.time()).isEqualTo(dow == 1 ? "18:00" : "19:00");
            });
        }

        @Test
        void withPeriodName_createsPeriod() {
            when(trainingRepository.findByDateIn(any())).thenReturn(List.of());
            when(trainingRepository.save(any())).thenAnswer(inv -> {
                final Training t = inv.getArgument(0);
                t.setId(1L);
                return t;
            });
            when(periodRepository.findByNameIgnoreCase("Sommer")).thenReturn(Optional.empty());
            when(periodRepository.save(any(TrainingPeriod.class))).thenAnswer(inv -> {
                final TrainingPeriod p = inv.getArgument(0);
                p.setId(10L);
                return p;
            });

            service.createBulk(List.of(1), LocalDate.of(2025, 6, 2), LocalDate.of(2025, 6, 8),
                "18:00", Map.of(1, "18:00"), "Feld", "Sommer", null);

            verify(periodRepository, atLeastOnce()).save(any(TrainingPeriod.class));
        }

        @Test
        void existingDate_updatesInsteadOfCreating() {
            final Training existing = new Training(LocalDate.of(2025, 6, 2), "17:00", "Alt");
            existing.setId(5L);
            when(trainingRepository.findByDateIn(any())).thenReturn(List.of(existing));
            when(trainingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            final List<TrainingResponse> result = service.createBulk(
                List.of(1), LocalDate.of(2025, 6, 2), LocalDate.of(2025, 6, 8),
                "18:00", Map.of(1, "18:00"), "Feld", null, null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().time()).isEqualTo("18:00"); // updated
            verify(autoFiller, never()).autoFill(any()); // kein autoFill fuer bestehendes
        }
    }
}
