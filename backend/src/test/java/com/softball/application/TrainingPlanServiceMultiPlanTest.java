package com.softball.application;

import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;
import com.softball.domain.model.PlanKind;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.port.out.TrainingPlanRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TrainingPlanServiceMultiPlanTest {

    @Mock private TrainingPlanRepository planRepository;
    @Mock private TrainingRepository trainingRepository;
    @Mock private DrillService drillService;

    @InjectMocks
    private TrainingPlanService service;

    @Test
    void generate_beginnerKind_whenMainAlreadyExists_succeeds() {
        // MAIN ist schon da, jetzt soll BEGINNER erlaubt sein
        when(trainingRepository.existsById(99L)).thenReturn(true);
        when(planRepository.findByTrainingIdAndKind(99L, PlanKind.MAIN))
                .thenReturn(Optional.of(makeStoredPlan(1L, 99L, PlanKind.MAIN)));
        when(planRepository.findByTrainingIdAndKind(99L, PlanKind.BEGINNER))
                .thenReturn(Optional.empty());
        when(drillService.filterByFocus(anyString(), anyInt())).thenReturn(drillPool());
        when(planRepository.save(any())).thenAnswer(inv -> {
            final TrainingPlan p = inv.getArgument(0);
            p.setId(2L);
            return p;
        });

        final var resp = service.generate(99L, PlanKind.BEGINNER, 4, "WERFEN", 60,
                List.of(), false, 0, null);

        assertThat(resp.kind()).isEqualTo(PlanKind.BEGINNER);
        assertThat(resp.trainingId()).isEqualTo(99L);
    }

    @Test
    void generate_duplicateKind_throws400() {
        when(trainingRepository.existsById(99L)).thenReturn(true);
        when(planRepository.findByTrainingIdAndKind(99L, PlanKind.MAIN))
                .thenReturn(Optional.of(makeStoredPlan(1L, 99L, PlanKind.MAIN)));

        assertThatThrownBy(() -> service.generate(99L, PlanKind.MAIN, 10, "WERFEN", 90,
                List.of(), false, 0, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("existiert bereits")
                .hasMessageContaining("MAIN");
    }

    @Test
    void generate_kindOmitted_defaultsToMain() {
        // Backward-compat: legacy 4-arg generate() Aufruf nutzt PlanKind.MAIN
        when(trainingRepository.existsById(99L)).thenReturn(true);
        when(planRepository.findByTrainingIdAndKind(eq(99L), eq(PlanKind.MAIN)))
                .thenReturn(Optional.empty());
        when(drillService.filterByFocus(anyString(), anyInt())).thenReturn(drillPool());
        when(planRepository.save(any())).thenAnswer(inv -> {
            final TrainingPlan p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        final var resp = service.generate(99L, 10, "WERFEN", 90);

        assertThat(resp.kind()).isEqualTo(PlanKind.MAIN);
    }

    @Test
    void getByTrainingId_returnsEmptyList_whenNoPlans() {
        when(planRepository.findAllByTrainingId(99L)).thenReturn(List.of());

        final List<?> result = service.getByTrainingId(99L);

        assertThat(result).isEmpty();
    }

    @Test
    void getByTrainingId_returnsSinglePlan_whenOnlyMain() {
        when(planRepository.findAllByTrainingId(99L))
                .thenReturn(List.of(makeStoredPlan(1L, 99L, PlanKind.MAIN)));

        final var result = service.getByTrainingId(99L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).kind()).isEqualTo(PlanKind.MAIN);
    }

    @Test
    void getByTrainingId_returnsBothPlans_whenMainAndBeginner() {
        when(planRepository.findAllByTrainingId(99L)).thenReturn(List.of(
                makeStoredPlan(1L, 99L, PlanKind.MAIN),
                makeStoredPlan(2L, 99L, PlanKind.BEGINNER)
        ));

        final var result = service.getByTrainingId(99L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting("kind")
                .containsExactlyInAnyOrder(PlanKind.MAIN, PlanKind.BEGINNER);
    }

    @Test
    void getByTrainingIds_groupsByTrainingId() {
        when(planRepository.findByTrainingIdIn(List.of(99L, 100L))).thenReturn(List.of(
                makeStoredPlan(1L, 99L, PlanKind.MAIN),
                makeStoredPlan(2L, 99L, PlanKind.BEGINNER),
                makeStoredPlan(3L, 100L, PlanKind.MAIN)
        ));

        final var grouped = service.getByTrainingIds(List.of(99L, 100L));

        assertThat(grouped).hasSize(2);
        assertThat(grouped.get(99L)).hasSize(2);
        assertThat(grouped.get(100L)).hasSize(1);
        assertThat(grouped.get(100L).get(0).kind()).isEqualTo(PlanKind.MAIN);
    }

    @Test
    void generate_trainingNotFound_throws404() {
        when(trainingRepository.existsById(123L)).thenReturn(false);

        assertThatThrownBy(() -> service.generate(123L, PlanKind.MAIN, 10, "WERFEN", 90,
                List.of(), false, 0, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void domainTrainingPlan_defaultKindIsMain() {
        final TrainingPlan plan = new TrainingPlan(1L, 10, "WERFEN", 90);
        assertThat(plan.getKind()).isEqualTo(PlanKind.MAIN);
    }

    @Test
    void domainTrainingPlan_setKindNull_fallsBackToMain() {
        final TrainingPlan plan = new TrainingPlan(1L, 10, "WERFEN", 90);
        plan.setKind(null);
        assertThat(plan.getKind()).isEqualTo(PlanKind.MAIN);
    }

    // -------- helpers --------

    private TrainingPlan makeStoredPlan(final Long id, final Long trainingId, final PlanKind kind) {
        final TrainingPlan p = new TrainingPlan(trainingId, 10, "WERFEN", 90);
        p.setId(id);
        p.setKind(kind);
        return p;
    }

    private List<Drill> drillPool() {
        return List.of(
                new Drill("d1", "Drill 1", List.of(DrillCategory.THROWING),
                        2, List.of(), "desc", false, null, "rotation", null),
                new Drill("d2", "Drill 2", List.of(DrillCategory.THROWING),
                        2, List.of(), "desc", false, null, "rotation", null)
        );
    }
}
