package com.softball.application;

import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;
import com.softball.domain.model.DrillComplexity;
import com.softball.domain.model.SectionGroup;
import com.softball.domain.model.TrainingPlan;
import com.softball.domain.model.TrainingPlanContent;
import com.softball.domain.model.TrainingPlanSection;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TrainingPlanServiceAddBeginnerGroupTest {

    @Mock private TrainingPlanRepository planRepository;
    @Mock private TrainingRepository trainingRepository;
    @Mock private DrillService drillService;

    @InjectMocks
    private TrainingPlanService service;

    @Test
    void addBeginnerGroup_tagExistingDrillsAsMain_appendsBeginnerSections() {
        // Plan mit 1 parallelGroup-Block (2 DRILL-Stations mit parallelGroup=1) und Warmup vorne.
        final TrainingPlan plan = makePlanWithSingleStationBlock();
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(planRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Drill-Pool für Anfänger: 3 BASIC-Drills + 1 ADVANCED. Filter wählt min 2.
        final List<Drill> beginnerPool = List.of(
                makeDrill("basic-1", "Basic 1", DrillComplexity.BASIC),
                makeDrill("basic-2", "Basic 2", DrillComplexity.BASIC),
                makeDrill("basic-3", "Basic 3", DrillComplexity.BASIC),
                makeDrill("adv-1", "Advanced 1", DrillComplexity.ADVANCED)
        );
        when(drillService.filterByFocus(anyString(), anyInt())).thenReturn(beginnerPool);

        service.addBeginnerGroup(1L, 3, "WERFEN");

        final List<TrainingPlanSection> updatedSections = plan.getContent().getSections();
        // Original-Stations (2x) sind nun MAIN
        final List<TrainingPlanSection> mainSections = updatedSections.stream()
                .filter(s -> s.getGroup() == SectionGroup.MAIN).toList();
        assertThat(mainSections).hasSize(2);
        assertThat(mainSections).allSatisfy(s -> assertThat(s.getParallelGroup()).isEqualTo(1));

        // Mindestens 1 BEGINNER-Section angehängt (1 oder 2 Stationen, abhängig vom Pool)
        final List<TrainingPlanSection> beginnerSections = updatedSections.stream()
                .filter(s -> s.getGroup() == SectionGroup.BEGINNER).toList();
        assertThat(beginnerSections).isNotEmpty();
        assertThat(beginnerSections).allSatisfy(s -> {
            assertThat(s.getParallelGroup()).isEqualTo(2); // mainGroup + 1
            assertThat(s.getDrillId()).startsWith("basic-"); // BASIC-Filter griff
        });

        // Hint enthält Anfänger-Info
        assertThat(plan.getContent().getGroupDistributionHint())
                .contains("Anfänger-Gruppe").contains("3 Spieler");
    }

    @Test
    void addBeginnerGroup_alreadyHasBeginnerSections_throws400() {
        final TrainingPlan plan = makePlanWithSingleStationBlock();
        // Eine Section bereits als BEGINNER markieren
        plan.getContent().getSections().get(1).setGroup(SectionGroup.BEGINNER);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.addBeginnerGroup(1L, 3, "WERFEN"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("bereits");
    }

    @Test
    void addBeginnerGroup_beginnerCountBelow2_throws400() {
        assertThatThrownBy(() -> service.addBeginnerGroup(1L, 1, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("mindestens 2");
    }

    @Test
    void addBeginnerGroup_planNotFound_throws404() {
        when(planRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addBeginnerGroup(99L, 3, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void addBeginnerGroup_noSkillStations_throws400() {
        // Plan ohne Station-Blocks (nur Warmup + Game)
        final TrainingPlan plan = new TrainingPlan(99L, 12, "WERFEN", 90);
        plan.setId(1L);
        final List<TrainingPlanSection> sections = new ArrayList<>();
        sections.add(makeSection("WARMUP", "warmup-1", null, 30, SectionGroup.ALL));
        sections.add(makeSection("GAME", null, null, 30, SectionGroup.ALL));
        plan.setContent(new TrainingPlanContent(sections, null, null));
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));

        assertThatThrownBy(() -> service.addBeginnerGroup(1L, 3, "WERFEN"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Skill-Stations");
    }

    private TrainingPlan makePlanWithSingleStationBlock() {
        final TrainingPlan plan = new TrainingPlan(99L, 12, "WERFEN", 90);
        plan.setId(1L);
        final List<TrainingPlanSection> sections = new ArrayList<>();
        sections.add(makeSection("WARMUP", "warmup-1", null, 30, SectionGroup.ALL));
        sections.add(makeSection("DRILL", "main-1", 1, 20, SectionGroup.ALL));
        sections.add(makeSection("DRILL", "main-2", 1, 20, SectionGroup.ALL));
        sections.add(makeSection("BATTING", "bat-1", 2, 45, SectionGroup.ALL));
        plan.setContent(new TrainingPlanContent(sections, "existing hint", null));
        return plan;
    }

    private TrainingPlanSection makeSection(final String type, final String drillId,
                                              final Integer parallelGroup, final int duration,
                                              final SectionGroup group) {
        final TrainingPlanSection s = new TrainingPlanSection();
        s.setSectionType(type);
        s.setDrillId(drillId);
        s.setTitle(drillId);
        s.setDurationMinutes(duration);
        s.setParallelGroup(parallelGroup);
        s.setGroup(group);
        return s;
    }

    private Drill makeDrill(final String id, final String name, final DrillComplexity complexity) {
        final Drill d = new Drill(id, name, List.of(DrillCategory.THROWING),
                2, List.of(), "Wurfdrill", false, null, "Rotation", null);
        d.setComplexity(complexity);
        return d;
    }
}
